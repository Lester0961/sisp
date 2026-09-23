import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { aggregateMockRows } from './mock-aggregate';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { DOCUMENT_CATALOG } from '../common/constants/document-catalog';
import { APPLICATION_ROLE_NAMES, PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from '../common/authz/rbac';

const FALLBACK_DATABASE_URL =
  'postgresql://invalid:invalid@127.0.0.1:1/invalid?connect_timeout=2';

function normalizeDatabaseUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  const unquoted =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('`') && trimmed.endsWith('`')))
      ? trimmed.slice(1, -1).trim()
      : trimmed;
  return /^(postgresql|postgres):\/\//i.test(unquoted) ? unquoted : undefined;
}

function supabasePoolerUrl(directUrl: string | undefined): string | undefined {
  if (!directUrl) return undefined;
  try {
    const parsed = new URL(directUrl);
    const match = parsed.hostname.match(/^db\.([^.]+)\.supabase\.co$/i);
    if (!match) return undefined;

    parsed.hostname = 'aws-1-ap-southeast-1.pooler.supabase.com';
    parsed.port = '5432';
    if (parsed.username && !parsed.username.includes('.')) {
      parsed.username = `${parsed.username}.${match[1]}`;
    }
    parsed.searchParams.set('connection_limit', '1');
    return parsed.toString();
  } catch {
    return undefined;
  }
}

const CREDENTIAL_FIELDS = new Set(['passwordHash', 'mfaSecret']);
const MOCK_DATE_FIELD = /(?:At|On|Date|Time)$/i;

/** JSON snapshots stringify Prisma Date values; restore them before services run. */
function restoreMockDates(value: any): any {
  if (Array.isArray(value)) return value.map((entry) => restoreMockDates(entry));
  if (!value || typeof value !== 'object') return value;
  for (const [key, entry] of Object.entries(value)) {
    if (
      typeof entry === 'string' &&
      MOCK_DATE_FIELD.test(key) &&
      /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(entry)
    ) {
      const date = new Date(entry);
      value[key] = Number.isNaN(date.getTime()) ? entry : date;
    } else if (entry && typeof entry === 'object') {
      value[key] = restoreMockDates(entry);
    }
  }
  return value;
}

/**
 * Pure credential sanitizer for mock-resolved payloads: returns an object
 * graph with credential fields removed WITHOUT mutating the shared store.
 * (An earlier in-place version corrupted live login hashes; this function
 * only ever builds fresh objects along credential-bearing paths.)
 */
function stripCredentials(value: any, seen = new Map(), depth = 0, keepRootHash = false): any {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    const out: any[] = [];
    seen.set(value, out);
    for (const entry of value) out.push(stripCredentials(entry, seen, depth + 1, false));
    return out;
  }
  const out: any = {};
  seen.set(value, out);
  for (const [key, entry] of Object.entries(value)) {
    // Top-level user reads (e.g. login's include:{role} for bcrypt) keep
    // their hash — exactly like production Prisma. Everything nested is
    // response payload and must never carry credentials.
    if (CREDENTIAL_FIELDS.has(key) && !(depth === 0 && keepRootHash)) continue;
    out[key] = stripCredentials(entry, seen, depth + 1, false);
  }
  return out;
}

function prismaClientOptions() {
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const directUrl = normalizeDatabaseUrl(process.env.DIRECT_URL);
  const url =
    supabasePoolerUrl(databaseUrl) ??
    supabasePoolerUrl(directUrl) ??
    databaseUrl ??
    directUrl ??
    FALLBACK_DATABASE_URL;
  return { datasources: { db: { url } } };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isOffline = false;
  private mockDb: any = {};
  private mockFlushTimer?: NodeJS.Timeout;
  private flushMockDb: () => void = () => {};
  private mockTransaction: ((callback: (tx: any) => Promise<any>, receiver: any) => Promise<any>) | null = null;

  constructor() {
    super(prismaClientOptions());
    // A production process must never initialize demo identities or read/write
    // the local mock store, even briefly before the connection check.
    if (!this.isProduction()) this.initMockDb();

    // Proxy the entire service. If offline, return mock model handlers.
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (target.isOffline && typeof prop === 'string') {
          if (prop in target.mockDb) {
            return target.mockDb[prop];
          }
          // Handle special transactions or utilities
          if (prop === '$transaction') {
            return (arg: any) => {
              if (Array.isArray(arg)) {
                return Promise.all(arg);
              }
              return target.mockTransaction ? target.mockTransaction(arg, receiver) : arg(receiver);
            };
          }
          if (
            prop === '$executeRaw' ||
            prop === '$executeRawUnsafe' ||
            prop === '$queryRaw' ||
            prop === '$queryRawUnsafe'
          ) {
            return () => Promise.resolve([]);
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      console.log('[Prisma] Database connected successfully.');
    } catch (error) {
      // Fail closed in production: mock data lives in RAM/ephemeral disk and
      // would silently lose writes on restart. Development/test may opt in
      // to mock mode explicitly, or implicitly when NODE_ENV is not production.
      const isProduction = this.isProduction();
      const strictDb = process.env.STRICT_DB === 'true' || isProduction;
      if (strictDb) {
        console.error(
          '[Prisma] Database unreachable and strict mode is active (STRICT_DB=true or NODE_ENV=production). Refusing to start on mock storage.',
        );
        throw error;
      }
      console.warn('[Prisma] Could not connect to the database.', error);
      this.isOffline = true;
      console.log('[Prisma Mock] Active — using in-memory mock database.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      this.flushMockDb();
    } catch {}
    if (this.mockFlushTimer) clearInterval(this.mockFlushTimer);
    await this.$disconnect().catch(() => {});
  }

  private isProduction(): boolean {
    return (process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
  }

  /** Idempotently merges only the checked-in, verified curricula artifact into local mock data. */
  private mergeVerifiedCurriculaIntoMock(store: Record<string, any[]>): boolean {
    const sourcePath = path.join(__dirname, '..', '..', 'prisma', 'curricula-verified.json');
    if (!fs.existsSync(sourcePath)) return false;
    let changed = false;
    try {
      const payload = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      const programs = Array.isArray(payload.programs) ? payload.programs : [];
      const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const synthCode = (programCode: string, title: string) => {
        const titleSlug = title.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
        return `${programCode}-${titleSlug || 'ELECTIVE'}`;
      };
      const splitPrereqs = (raw: string | null | undefined) =>
        raw ? raw.split(/[,;]/).map((part) => part.trim().replace(/\s+/g, ' ')).filter(Boolean) : [];

      for (const sourceProgram of programs) {
        if (!sourceProgram?.code || !sourceProgram?.effectiveYear) continue;
        let program = store.program.find((item: any) => item.code === sourceProgram.code);
        if (!program) {
          program = {
            id: `mock-program-${slug(sourceProgram.code)}`,
            code: sourceProgram.code,
            name: sourceProgram.heading,
            createdAt: new Date(),
          };
          store.program.push(program);
          changed = true;
        }

        let curriculum = store.curriculum.find(
          (item: any) => item.programId === program.id && item.effectiveYear === sourceProgram.effectiveYear,
        );
        if (!curriculum) {
          curriculum = {
            id: `mock-curriculum-${slug(sourceProgram.code)}-${sourceProgram.effectiveYear}`,
            programId: program.id,
            program,
            effectiveYear: sourceProgram.effectiveYear,
            schoolYear: sourceProgram.schoolYear ?? null,
            cmo: sourceProgram.cmo ?? null,
            sourceFile: sourceProgram.sourceFile ?? null,
            createdAt: new Date(),
          };
          store.curriculum.push(curriculum);
          changed = true;
        }

        const sourceRows = Array.isArray(sourceProgram.courses) ? sourceProgram.courses : [];
        const codeToId = new Map<string, string[]>();
        for (const row of sourceRows) {
          if (!row?.title) continue;
          const isCodeSynthesized = !row.code;
          const code = row.code ?? synthCode(sourceProgram.code, row.title);
          let course = store.course.find((item: any) => item.code === code && item.title === row.title);
          if (!course) {
            course = {
              id: `mock-course-${slug(code)}-${slug(row.title).slice(0, 32)}`,
              code,
              isCodeSynthesized,
              title: row.title,
              units: row.units ?? 0,
              lecUnits: row.lec ?? 0,
              labUnits: row.lab ?? null,
              subjectArea: row.subjectArea ?? null,
              catNo: row.catNo ?? null,
              prereqText: row.prereq ?? null,
              createdAt: new Date(),
            };
            store.course.push(course);
            changed = true;
          }
          const ids = codeToId.get(code) ?? [];
          ids.push(course.id);
          codeToId.set(code, ids);

          if (!store.curriculumCourse.some((link: any) => link.curriculumId === curriculum.id && link.courseId === course.id)) {
            store.curriculumCourse.push({
              curriculumId: curriculum.id,
              courseId: course.id,
              course,
              yearLevel: row.yearLevel ?? 1,
              semester: row.termNumber ?? 1,
              termNumber: row.termNumber ?? null,
              termLabel: row.termLabel ?? null,
              sourceUnits: row.units ?? 0,
              sourceLecUnits: row.lec ?? 0,
              sourceLabUnits: row.lab ?? null,
              sourceTotal: row.sourceTotal ?? null,
            });
            changed = true;
          }
        }

        for (const row of sourceRows) {
          if (!row?.title) continue;
          const code = row.code ?? synthCode(sourceProgram.code, row.title);
          const courseId = codeToId.get(code)?.[0];
          if (!courseId) continue;
          for (const requiresCode of splitPrereqs(row.prereq)) {
            if (store.coursePrerequisite.some((entry: any) => entry.courseId === courseId && entry.requiresCode === requiresCode)) continue;
            const targets = codeToId.get(requiresCode) ?? codeToId.get(requiresCode.replace(/\s+/g, '')) ?? [];
            const selfReference = requiresCode === code;
            const requiresId = targets.find((id) => id !== courseId) ?? (selfReference ? courseId : targets[0] ?? null);
            store.coursePrerequisite.push({
              id: `mock-course-prerequisite-${slug(courseId)}-${slug(requiresCode)}`,
              courseId,
              requiresCode,
              requiresId,
              isSelfReference: selfReference,
              isUnresolved: !requiresId,
              note: selfReference
                ? 'source self-reference preserved (§10)'
                : !requiresId
                  ? 'code not in same curriculum; preserved verbatim'
                  : null,
            });
            changed = true;
          }
        }
      }
    } catch (error) {
      console.error('[Prisma Mock] Could not merge verified curricula into local mock data:', error);
    }
    return changed;
  }

  private initMockDb() {
    const localDemoPassword = process.env.LOCAL_DEMO_PASSWORD || 'local-demo-only';
    const mockPasswordHash = bcrypt.hashSync(localDemoPassword, 10);

    // Seed mock data stores
    // The combined admin_staff role is deliberately migrated to registrar
    // (Phase 2, P2-01) while keeping its id so mock users keep working.
    const roles = [
      { id: 'role-id-admin_staff', name: 'registrar', createdAt: new Date() },
      { id: 'role-id-treasury', name: 'treasury', createdAt: new Date() },
      { id: 'role-id-dean', name: 'dean', createdAt: new Date() },
      { id: 'role-id-faculty', name: 'faculty', createdAt: new Date() },
      { id: 'role-id-student', name: 'student', createdAt: new Date() },
      { id: 'role-id-sys_admin', name: 'sys_admin', createdAt: new Date() },
      { id: 'role-id-live_agent', name: 'live_agent', createdAt: new Date() },
    ];

    const roleById = (roleId: string) => roles.find((role) => role.id === roleId);

    const users = [
      {
        id: 'mock-admin-id',
        email: 'admin@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Regis',
        lastName: 'Admin',
        roleId: 'role-id-admin_staff',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roleById('role-id-admin_staff'),
      },
      {
        id: 'mock-registrar-id',
        email: 'registrar@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Regis',
        lastName: 'Registrar',
        roleId: 'role-id-admin_staff',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roleById('role-id-admin_staff'),
      },
      {
        id: 'mock-dean-id',
        email: 'dean@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Regis',
        lastName: 'Dean',
        roleId: 'role-id-dean',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roleById('role-id-dean'),
      },
      {
        id: 'mock-faculty-id',
        email: 'faculty@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Regis',
        lastName: 'Faculty',
        roleId: 'role-id-faculty',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roleById('role-id-faculty'),
      },
      {
        id: 'mock-student-id',
        email: 'student@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-id-student',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roleById('role-id-student'),
      },
      {
        id: 'mock-sysadmin-id',
        email: 'sysadmin@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'System',
        lastName: 'Administrator',
        roleId: 'role-id-sys_admin',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roleById('role-id-sys_admin'),
      },
      {
        id: 'mock-treasury-id',
        email: 'treasury@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Regis',
        lastName: 'Treasury',
        roleId: 'role-id-treasury',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roleById('role-id-treasury'),
      },
      {
        id: 'mock-live-agent-id',
        email: 'agent@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'ARIA',
        lastName: 'Support Agent',
        roleId: 'role-id-live_agent',
        isActive: false,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roleById('role-id-live_agent'),
      },
    ];

    // Permission catalog + role → permission mapping (Phase 2, P2-02),
    // mirrored from src/common/authz/rbac.ts so mock mode enforces the same
    // authorization model as the migrated database.
    const permissions = PERMISSION_DEFINITIONS.map((permission, index) => ({
      id: `mock-permission-${index + 1}`,
      action: permission.action,
      resource: permission.resource,
      createdAt: new Date(),
    }));
    const permissionByKey = new Map(
      permissions.map((permission) => [
        `${permission.resource}.${permission.action}`,
        permission,
      ]),
    );
    const rolePermissions = Object.entries(ROLE_PERMISSIONS).flatMap(
      ([roleName, permissionKeys]) => {
        const role = roles.find((candidate) => candidate.name === roleName);
        if (!role) return [];
        return permissionKeys
          .map((key) => permissionByKey.get(key))
          .filter((permission): permission is (typeof permissions)[number] => Boolean(permission))
          .map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
            role,
            permission,
          }));
      },
    );

    const programs = [
      {
        id: 'mock-program-id',
        name: 'Bachelor of Science in Computer Science',
        code: 'BSCS',
        createdAt: new Date(),
      },
      {
        id: 'mock-program-id-it',
        name: 'Bachelor of Science in Information Technology',
        code: 'BSIT',
        createdAt: new Date(),
      },
      { id: 'mock-program-id-bsoa', name: 'Bachelor of Science in Office Administration', code: 'BSOA', createdAt: new Date() },
      { id: 'mock-program-id-bsma', name: 'Bachelor of Science in Multimedia Arts', code: 'BSMA', createdAt: new Date() },
      { id: 'mock-program-id-bsed-english', name: 'Bachelor of Secondary Education – English', code: 'BSEd-English', createdAt: new Date() },
      { id: 'mock-program-id-bsed-math', name: 'Bachelor of Secondary Education – Mathematics', code: 'BSEd-Math', createdAt: new Date() },
      { id: 'mock-program-id-bsed-secondary', name: 'Bachelor of Secondary Education', code: 'BSEd-Secondary', createdAt: new Date() },
      { id: 'mock-program-id-bscrim', name: 'Bachelor of Science in Criminology', code: 'BSCrim', createdAt: new Date() },
    ];

    const courses = [
      {
        id: 'mock-course-cs301',
        code: 'CS 301',
        title: 'Human-Computer Interaction',
        units: 3,
        createdAt: new Date(),
      },
      {
        id: 'mock-course-cs302',
        code: 'CS 302',
        title: 'Data Science & Machine Learning',
        units: 3,
        createdAt: new Date(),
      },
      {
        id: 'mock-course-cs303',
        code: 'CS 303',
        title: 'Advanced Software Engineering',
        units: 4,
        createdAt: new Date(),
      },
      {
        id: 'mock-course-it201',
        code: 'IT 201',
        title: 'Database Systems',
        units: 3,
        createdAt: new Date(),
      },
    ];

    const studentProfiles = [
      {
        id: 'mock-student-profile-id',
        userId: 'mock-student-id',
        studentNumber: 'RMC-2026-0001',
        programId: 'mock-program-id',
        yearLevel: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: users[3],
        program: programs[0],
        accountBalance: {
          id: 'mock-balance-id',
          studentId: 'mock-student-profile-id',
          balance: 12500.5,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];

    const academicTerms = [
      {
        id: 'mock-term-2025-t1', academicYear: '2025-2026', termNumber: 1,
        code: '2025-2026-T1', label: 'Term 1', status: 'closed', isCurrent: false,
        startsOn: new Date('2025-08-01'), endsOn: new Date('2025-11-30'),
        createdAt: new Date(), updatedAt: new Date(),
      },
      {
        id: 'mock-term-2025-t2', academicYear: '2025-2026', termNumber: 2,
        code: '2025-2026-T2', label: 'Term 2', status: 'active', isCurrent: true,
        startsOn: new Date('2025-12-01'), endsOn: new Date('2026-03-31'),
        createdAt: new Date(), updatedAt: new Date(),
      },
      {
        id: 'mock-term-2025-t3', academicYear: '2025-2026', termNumber: 3,
        code: '2025-2026-T3', label: 'Term 3', status: 'planned', isCurrent: false,
        startsOn: new Date('2026-04-01'), endsOn: new Date('2026-07-31'),
        createdAt: new Date(), updatedAt: new Date(),
      },
    ];

    const studentSemesters = [
      {
        id: 'mock-ss-1',
        studentId: 'mock-student-profile-id',
        termId: 'mock-term-2025-t1',
        term: academicTerms[0],
        semester: '1st',
        year: '2025-2026',
        isFullyPaid: true,
        paymentStatus: 'paid',
        amountDue: 45000,
        amountPaid: 45000,
        paidAt: new Date(),
        paymentReference: 'MOCK-T1-PAID',
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentProfiles[0],
      },
      {
        id: 'mock-ss-2',
        studentId: 'mock-student-profile-id',
        termId: 'mock-term-2025-t2',
        term: academicTerms[1],
        semester: '2nd',
        year: '2025-2026',
        isFullyPaid: false,
        paymentStatus: 'partial',
        amountDue: 45000,
        amountPaid: 12500,
        paidAt: null,
        paymentReference: 'MOCK-T2-PARTIAL',
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentProfiles[0],
      },
    ];

    const enrollments = [
      {
        id: 'mock-enrollment-cs301',
        studentId: 'mock-student-profile-id',
        courseId: 'mock-course-cs301',
        section: 'A',
        status: 'enrolled',
        termId: 'mock-term-2025-t1',
        term: academicTerms[0],
        semester: '1st',
        year: '2025-2026',
        instructorId: 'mock-faculty-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[0],
        student: studentProfiles[0],
        instructor: users[2],
      },
      {
        id: 'mock-enrollment-cs302',
        studentId: 'mock-student-profile-id',
        courseId: 'mock-course-cs302',
        section: 'A',
        status: 'enrolled',
        termId: 'mock-term-2025-t1',
        term: academicTerms[0],
        semester: '1st',
        year: '2025-2026',
        instructorId: 'mock-faculty-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[1],
        student: studentProfiles[0],
        instructor: users[2],
      },
      {
        id: 'mock-enrollment-cs303',
        studentId: 'mock-student-profile-id',
        courseId: 'mock-course-cs303',
        section: 'B',
        status: 'enrolled',
        termId: 'mock-term-2025-t1',
        term: academicTerms[0],
        semester: '1st',
        year: '2025-2026',
        instructorId: 'mock-faculty-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[2],
        student: studentProfiles[0],
        instructor: users[2],
      },
    ];

    const grades = [
      {
        id: 'mock-grade-cs301',
        enrollmentId: 'mock-enrollment-cs301',
        prelim: 91.5,
        midterm: 93.0,
        finals: 94.0,
        finalGrade: 92.95,
        isVisible: true,
        status: 'approved',
        submittedById: 'mock-faculty-id',
        submittedAt: new Date(),
        postedById: 'mock-admin-id',
        postedAt: new Date(),
        approvedById: 'mock-dean-id',
        approvedAt: new Date(),
        rejectedById: null,
        rejectedAt: null,
        rejectedRemarks: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        enrollment: enrollments[0],
      },
      {
        id: 'mock-grade-cs302',
        enrollmentId: 'mock-enrollment-cs302',
        prelim: 88.0,
        midterm: 90.0,
        finals: 91.0,
        finalGrade: 89.8,
        isVisible: true,
        status: 'approved',
        submittedById: 'mock-faculty-id',
        submittedAt: new Date(),
        postedById: 'mock-admin-id',
        postedAt: new Date(),
        approvedById: 'mock-dean-id',
        approvedAt: new Date(),
        rejectedById: null,
        rejectedAt: null,
        rejectedRemarks: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        enrollment: enrollments[1],
      },
      {
        id: 'mock-grade-cs303',
        enrollmentId: 'mock-enrollment-cs303',
        prelim: 95.0,
        midterm: 96.0,
        finals: 97.0,
        finalGrade: 96.1,
        isVisible: true,
        status: 'approved',
        submittedById: 'mock-faculty-id',
        submittedAt: new Date(),
        postedById: 'mock-admin-id',
        postedAt: new Date(),
        approvedById: 'mock-dean-id',
        approvedAt: new Date(),
        rejectedById: null,
        rejectedAt: null,
        rejectedRemarks: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        enrollment: enrollments[2],
      },
    ];




    const documentRequests = [
      {
        id: 'mock-request-1',
        studentId: 'mock-student-profile-id',
        type: 'certificate_of_enrollment',
        status: 'released',
        remarks: 'Cleared by accounting',
        fee: 300.0,
        paymentStatus: 'paid',
        paymentReference: 'REF-COE-001',
        qrCodeUrl: 'https://placehold.co/200x200?text=InstaPay+QR+REF-COE-001',
        paymentConfirmedById: 'mock-admin-id',
        paymentConfirmedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentProfiles[0],
      },
      {
        id: 'mock-request-2',
        studentId: 'mock-student-profile-id',
        type: 'transcript_of_records',
        status: 'awaiting_payment',
        remarks: 'Awaiting payment confirmation',
        fee: 500.0,
        paymentStatus: 'unpaid',
        paymentReference: 'REF-TOR-002',
        qrCodeUrl: 'https://placehold.co/200x200?text=InstaPay+QR+REF-TOR-002',
        paymentConfirmedById: null,
        paymentConfirmedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentProfiles[0],
      },
    ];

    const documentCatalogItems = [
      {
        id: '10000000-0000-4000-8000-000000000001',
        code: 'transcript_of_records',
        label: 'Transcript of Records (Graduates / Employment)',
        fee: 500,
        sortOrder: 10,
        tat: '3-4 weeks',
        assignedTo: 'Miss Rose',
        feeNote: 'per page',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000011',
        code: 'transcript_of_records_undergrad',
        label: 'TOR (Undergraduate - For Employment Purposes Only)',
        fee: 500,
        sortOrder: 15,
        tat: '3-4 weeks',
        assignedTo: 'Miss Rose',
        feeNote: 'per page',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000002',
        code: 'certificate_of_enrollment',
        label: 'Certificate of Enrollment (COE)',
        fee: 300,
        sortOrder: 20,
        tat: '2-3 business days',
        assignedTo: 'Sir Christian',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000012',
        code: 'certified_true_copy_cor',
        label: 'Certified True Copy – COR',
        fee: 300,
        sortOrder: 22,
        tat: '2-3 business days',
        assignedTo: 'Sir Christian',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000003',
        code: 'certificate_of_good_moral',
        label: 'Certificate of Good Moral Character',
        fee: 500,
        sortOrder: 30,
        tat: '2-3 business days',
        assignedTo: 'Records Staff',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000013',
        code: 'copy_of_grades',
        label: '2nd Copy of Copy of Grades',
        fee: 150,
        sortOrder: 32,
        tat: '2-3 business days',
        assignedTo: 'Miss Rose',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000014',
        code: 'certified_true_copy_grades',
        label: 'Certified True Copy – Copy of Grades',
        fee: 300,
        sortOrder: 34,
        tat: '3-5 business days',
        assignedTo: 'Miss Rose',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000004',
        code: 'diploma',
        label: 'Diploma (Copy / Certification)',
        fee: 500,
        sortOrder: 40,
        tat: '3-4 weeks',
        assignedTo: 'Sir Christian',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000005',
        code: 'course_description',
        label: 'Course Description',
        fee: 50,
        sortOrder: 50,
        tat: '3-5 business days',
        assignedTo: 'Records Staff',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000006',
        code: 'authentication',
        label: 'Document Authentication / CHED CAV Endorsement',
        fee: 300,
        sortOrder: 60,
        tat: '2-3 weeks',
        assignedTo: 'Sir Christian',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '10000000-0000-4000-8000-000000000007',
        code: 'other',
        label: 'Other Document Request',
        fee: 100,
        sortOrder: 70,
        tat: '3-5 business days',
        assignedTo: 'Records Staff',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const documentRequestItems = documentRequests.map((request, index) => {
      const catalogItem =
        documentCatalogItems.find((item) => item.code === request.type || item.label === request.type) ??
        documentCatalogItems[documentCatalogItems.length - 1];
      return {
        id: `mock-document-request-item-${index + 1}`,
        requestId: request.id,
        catalogItemId: catalogItem.id,
        type: catalogItem.code,
        label: catalogItem.label,
        quantity: 1,
        unitFee: request.fee,
        lineTotal: request.fee,
        remarks: request.remarks,
        createdAt: new Date(),
      };
    });

    const notifications = [
      {
        id: 'mock-notif-1',
        userId: 'mock-student-id',
        title: 'Welcome to SISP',
        message: 'Your student information and services portal is ready to use.',
        isRead: false,
        createdAt: new Date(),
      },
      {
        id: 'mock-notif-2',
        userId: 'mock-student-id',
        title: 'Clearance Update',
        message: 'Second Semester 2025-2026 clearances are now active.',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000),
      },
    ];

    const chatLogs = [
      {
        id: 'mock-chat-1',
        userId: 'mock-student-id',
        message: 'What is my current balance?',
        response: 'Your outstanding balance is ₱12,500.50.',
        intent: 'financial',
        confidence: 0.98,
        createdAt: new Date(),
      },
    ];

    const chatDailyUsage: any[] = [];

    const escalations = [
      {
        id: 'mock-escalation-1',
        chatId: 'mock-chat-1',
        status: 'pending',
        assignedTo: null,
        resolution: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        chat: chatLogs[0],
      },
    ];

    const chatSessions = [
      {
        id: 'mock-session-1',
        studentId: 'mock-student-profile-id',
        escalationId: null,
        agentId: null,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentProfiles[0],
      },
    ];

    const chatMessages = [
      {
        id: 'mock-msg-1',
        sessionId: 'mock-session-1',
        senderId: 'mock-student-id',
        senderRole: 'student',
        content: 'Hello, I need help with my enrollment.',
        createdAt: new Date(),
        sender: users[3],
      },
    ];

    const auditLogs = [
      {
        id: 'mock-audit-1',
        userId: 'mock-student-id',
        action: 'LOGIN',
        resource: 'auth',
        resourceId: 'mock-student-id',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        user: users[3],
      },
    ];

    // Treasury clearance — default mock student has an outstanding balance
    const accountBalances = [
      {
        id: 'mock-balance-1',
        studentId: 'mock-student-profile-id',
        balance: 12500.50,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Enrollment history (initially empty — populated when admin creates records)
    const enrollmentHistories: any[] = [];

    // Curriculum stores — empty by default; populated by seed-curricula.ts via mock-db.json
    const curricula: any[] = [];
    const curriculumCourses: any[] = [];
    const coursePrerequisites: any[] = [];

    const admissionApplications: any[] = [];
    const admissionRequirementDefinitions: any[] = [
      { id: 'req-def-1', code: 'FORM_137', title: 'High School Report Card (Form 138 / SF9)', applicantType: 'freshman', isRequired: true, sortOrder: 10, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'req-def-2', code: 'GOOD_MORAL', title: 'Certificate of Good Moral Character', applicantType: null, isRequired: true, sortOrder: 20, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'req-def-3', code: 'PSA_BIRTH', title: 'PSA Birth Certificate', applicantType: null, isRequired: true, sortOrder: 30, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'req-def-4', code: 'ID_PHOTO', title: '2x2 Recent Colored Photo', applicantType: null, isRequired: true, sortOrder: 40, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'req-def-5', code: 'HONORABLE_DISMISSAL', title: 'Honorable Dismissal / Transfer Credential', applicantType: 'transferee', isRequired: true, sortOrder: 50, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ];
    const admissionRequirementSubmissions: any[] = [];

    const store: Record<string, any[]> = {
      role: roles,
      permission: permissions,
      rolePermission: rolePermissions,
      user: users,
      program: programs,
      course: courses,
      academicTerm: academicTerms,
      studentProfile: studentProfiles,
      studentSemester: studentSemesters,
      enrollment: enrollments,
      grade: grades,
      documentRequest: documentRequests,
      documentCatalogItem: documentCatalogItems,
      documentRequestItem: documentRequestItems,
      notification: notifications,
      chatLog: chatLogs,
      chatDailyUsage,
      escalationQueue: escalations,
      chatSession: chatSessions,
      chatMessage: chatMessages,
      auditLog: auditLogs,
      accountBalance: accountBalances,
      enrollmentHistory: enrollmentHistories,
      curriculum: curricula,
      curriculumCourse: curriculumCourses,
      coursePrerequisite: coursePrerequisites,
      admissionApplication: admissionApplications,
      admissionRequirementDefinition: admissionRequirementDefinitions,
      admissionRequirementSubmission: admissionRequirementSubmissions,
      // Phase 3 supporting structures (empty until used; handlers are
      // generated automatically for every store key).
      classSection: [] as any[],
      classSchedule: [] as any[],
      paymentTransaction: [] as any[],
      adviserAssignment: [] as any[],
      advisingConcern: [] as any[],
      knowledgeDocument: [] as any[],
      knowledgeChunk: [] as any[],
      // Phase 1 identity/session records
      authSession: [] as any[],
      mfaChallenge: [] as any[],
      passwordResetToken: [] as any[],
      studentIdentityVerification: [] as any[],
      identityVerificationDocument: [] as any[],
    };

    const dbFilePath = path.join(__dirname, '..', '..', 'mock-db.json');
    let mockSnapshotNeedsFlush = false;

    // Load existing mock DB from disk if it exists
    if (fs.existsSync(dbFilePath)) {
      try {
        const fileData = fs.readFileSync(dbFilePath, 'utf8');
        const parsed = JSON.parse(fileData);
        for (const key of Object.keys(store)) {
          if (parsed[key] && Array.isArray(parsed[key])) {
            store[key] = restoreMockDates(parsed[key]);
          }
        }
        store.chatSession = store.chatSession.map((session: any) => {
          if (!Object.prototype.hasOwnProperty.call(session, 'agentId')) mockSnapshotNeedsFlush = true;
          if (!Object.prototype.hasOwnProperty.call(session, 'studentLastViewedAt')) mockSnapshotNeedsFlush = true;
          return {
            ...session,
            agentId: session.agentId ?? null,
            studentLastViewedAt: session.studentLastViewedAt ?? null,
          };
        });
        store.escalationQueue = store.escalationQueue.map((entry: any) => {
          if (!Object.prototype.hasOwnProperty.call(entry, 'assignedTo')) mockSnapshotNeedsFlush = true;
          return { ...entry, assignedTo: entry.assignedTo ?? null };
        });
        store.authSession = store.authSession.map((session: any) => ({
          ...session,
          lastUsedAt: session.lastUsedAt ?? null,
          revokedAt: session.revokedAt ?? null,
          revokeReason: session.revokeReason ?? null,
        }));
        const termForLegacy = (semester: unknown, year: unknown) => {
          const normalized = String(semester ?? '').toLowerCase();
          const termNumber = normalized === '2nd' || normalized === 'second' || normalized === 'term 2' ? 2
            : normalized === 'summer' || normalized === '3rd' || normalized === 'term 3' ? 3 : 1;
          return store.academicTerm.find((term) => term.academicYear === year && term.termNumber === termNumber);
        };
        store.studentSemester = store.studentSemester.map((semester) => {
          const term = semester.termId
            ? store.academicTerm.find((candidate) => candidate.id === semester.termId)
            : termForLegacy(semester.semester, semester.year);
          return {
            ...semester,
            termId: term?.id ?? semester.termId,
            term,
            paymentStatus: semester.paymentStatus ?? (semester.isFullyPaid ? 'paid' : 'unpaid'),
            amountPaid: semester.amountPaid ?? 0,
          };
        });
        store.enrollment = store.enrollment.map((enrollment) => {
          const term = enrollment.termId
            ? store.academicTerm.find((candidate) => candidate.id === enrollment.termId)
            : termForLegacy(enrollment.semester, enrollment.year);
          const instructorId = enrollment.instructorId ?? 'mock-faculty-id';
          return {
            ...enrollment,
            termId: term?.id ?? enrollment.termId,
            term,
            instructorId,
            instructor: store.user.find((user) => user.id === instructorId),
          };
        });
        store.grade = store.grade.map((grade) => ({
          // Older mock snapshots were written before the adapter mirrored
          // Prisma's defaults. Normalize them on load so draft grades remain
          // actionable after a local restart.
          status: grade.status ?? 'draft',
          isVisible: grade.isVisible ?? false,
          ...grade,
          enrollment: store.enrollment.find((enrollment) => enrollment.id === grade.enrollmentId),
        }));

        // Phase 2 migration for stale mock snapshots: rename the combined
        // admin_staff role in place and ensure the permission stores exist.
        if (!store.role.some((role) => role.name === 'registrar')) {
          const legacyRole = store.role.find((role) => role.name === 'admin_staff');
          if (legacyRole) legacyRole.name = 'registrar';
        }
        if (!store.role.some((role) => role.name === 'treasury')) {
          const treasuryRole = roles.find((role) => role.name === 'treasury');
          if (treasuryRole) store.role.push(treasuryRole);
        }
        // Existing mock snapshots retain their users and records. Add current
        // roles and grants by natural key so old local data enforces today's
        // authorization model without replacing user assignments.
        for (const roleName of APPLICATION_ROLE_NAMES) {
          if (!store.role.some((role: any) => role.name === roleName)) {
            const fixtureRole = roles.find((role) => role.name === roleName);
            if (fixtureRole) store.role.push(fixtureRole);
            mockSnapshotNeedsFlush = true;
          }
        }
        for (const permission of permissions) {
          const existingPermission = store.permission.find(
            (item: any) => item.resource === permission.resource && item.action === permission.action,
          );
          if (!existingPermission) {
            store.permission.push(permission);
            mockSnapshotNeedsFlush = true;
          }
        }
        const currentGrantKeys = store.rolePermission
          .map((entry: any) => `${entry.roleId}:${entry.permissionId}`)
          .sort();
        const desiredRolePermissions: any[] = Object.entries(ROLE_PERMISSIONS).flatMap(
          ([roleName, permissionKeys]) => {
            const persistedRole = store.role.find((role: any) => role.name === roleName);
            if (!persistedRole) return [];
            return permissionKeys.flatMap((permissionKey) => {
              const [resource, action] = permissionKey.split('.');
              const persistedPermission = store.permission.find(
                (permission: any) => permission.resource === resource && permission.action === action,
              );
              return persistedPermission
                ? [{
                    roleId: persistedRole.id,
                    permissionId: persistedPermission.id,
                    role: persistedRole,
                    permission: persistedPermission,
                  }]
                : [];
            });
          },
        );
        const desiredGrantKeys = desiredRolePermissions
          .map((entry) => `${entry.roleId}:${entry.permissionId}`)
          .sort();
        if (currentGrantKeys.join('|') !== desiredGrantKeys.join('|')) mockSnapshotNeedsFlush = true;
        // Rebuild only authorization metadata from the checked-in least-
        // privilege matrix; user records and their role assignments remain.
        store.rolePermission = desiredRolePermissions;
        for (const user of store.user) {
          const persistedRole = store.role.find((role: any) => role.id === user.roleId);
          if (persistedRole && user.role?.name !== persistedRole.name) {
            user.role = persistedRole;
            mockSnapshotNeedsFlush = true;
          }
        }
        if (!store.user.some((user: any) => user.email?.toLowerCase() === 'agent@rmc.edu.ph')) {
          const fixtureAgent = users.find((user) => user.email === 'agent@rmc.edu.ph');
          if (fixtureAgent) store.user.push(fixtureAgent);
          mockSnapshotNeedsFlush = true;
        }

        // Connect only the known bundled demo escalation and its matching
        // chat session so local UI can exercise the actual claim workflow.
        const demoSession = store.chatSession.find((session: any) => session.id === 'mock-session-1');
        const demoEscalation = store.escalationQueue.find((entry: any) => entry.id === 'mock-escalation-1');
        if (demoSession && !demoSession.escalationId && demoEscalation?.chatId === 'mock-chat-1') {
          demoSession.escalationId = 'mock-chat-1';
          mockSnapshotNeedsFlush = true;
        }

        // DEC-016 defines the official student balance as obligations less
        // verified ledger entries. Reconcile the local fixture's stale cache;
        // legacy StudentSemester.amountPaid is not itself a verified payment.
        for (const profile of store.studentProfile) {
          const obligations = store.studentSemester
            .filter((semester: any) => semester.studentId === profile.id)
            .reduce((sum: number, semester: any) => sum + Number(semester.amountDue ?? 0), 0);
          const verifiedPayments = store.paymentTransaction
            .filter((payment: any) => payment.studentId === profile.id && payment.status === 'verified')
            .reduce((sum: number, payment: any) => sum + Number(payment.amount ?? 0), 0);
          const balance = Math.max(0, Math.round((obligations - verifiedPayments) * 100) / 100);
          const cachedBalance = store.accountBalance.find((item: any) => item.studentId === profile.id);
          if (cachedBalance && Number(cachedBalance.balance) !== balance) {
            cachedBalance.balance = balance;
            mockSnapshotNeedsFlush = true;
          }
          if (profile.accountBalance && Number(profile.accountBalance.balance) !== balance) {
            profile.accountBalance.balance = balance;
            mockSnapshotNeedsFlush = true;
          }
        }

        // Import only rows from the checked-in verified curricula artifact.
        mockSnapshotNeedsFlush = this.mergeVerifiedCurriculaIntoMock(store) || mockSnapshotNeedsFlush;

        console.log('[Prisma Mock] Loaded database state from mock-db.json');
      } catch (err) {
        console.error('[Prisma Mock] Failed to read mock-db.json:', err);
      }
    }

    mockSnapshotNeedsFlush = this.mergeVerifiedCurriculaIntoMock(store) || mockSnapshotNeedsFlush;

    // Debounced persistence: under concurrent load (e.g. dozens of students
    // chatting at once), stringifying + rewriting the whole file on every
    // mutation is O(n^2) event-loop blocking. Reads always see live memory;
    // the file is flushed at most every 2s and once more on shutdown.
    // NOTE: local mock mode only — production uses Supabase, unaffected.
    let mockDirty = false;
    const flushNow = () => {
      if (!mockDirty) return;
      mockDirty = false;
      try {
        fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
      } catch (err) {
        console.error('[Prisma Mock] Failed to write mock-db.json:', err);
      }
    };
    this.flushMockDb = flushNow;
    if (this.mockFlushTimer) clearInterval(this.mockFlushTimer);
    this.mockFlushTimer = setInterval(flushNow, 2000);
    if (typeof (this.mockFlushTimer as any)?.unref === 'function') {
      (this.mockFlushTimer as any).unref();
    }
    const saveDb = () => {
      mockDirty = true;
    };
    this.mockTransaction = async (callback, receiver) => {
      const before = JSON.stringify(store);
      try {
        return await callback(receiver);
      } catch (error) {
        const restored = JSON.parse(before);
        for (const key of Object.keys(store)) store[key] = restoreMockDates(restored[key]);
        saveDb();
        throw error;
      }
    };
    if (mockSnapshotNeedsFlush) saveDb();

    // Recursive mock relation populate helper
    const resolveIncludes = (item: any, include: any, modelKey: string): any => {
      if (!item || !include) return item;
      // Resolve relations before projecting. A Prisma select can contain
      // nested select/include objects alongside scalar fields.
      const select =
        typeof include === 'object' && include !== null && !Array.isArray(include)
          ? (include as any).select
          : undefined;
      const relationOptions = select
        ? Object.fromEntries(
            Object.entries(select).filter(([, value]) => value && typeof value === 'object'),
          )
        : include;
      const cloned = { ...item };
      for (const [key, val] of Object.entries(relationOptions || {})) {
        if (!val) continue;
        // Preserve `select` projections when there is no nested `include`
        // (e.g. { select: { id, email } }). Dropping them here returned full
        // rows — including passwordHash — to API clients in mock mode.
        const subInclude =
          typeof val === 'object' && val !== null
            ? ((val as any).include ?? val)
            : undefined;

        if (modelKey === 'escalationQueue') {
          if (key === 'chat') {
            const chatItem = store.chatLog.find((c) => c.id === cloned.chatId);
            if (chatItem) {
              cloned.chat = resolveIncludes(chatItem, subInclude || { user: true }, 'chatLog');
            }
          }
          if (key === 'assignee') {
            const userItem = store.user.find((u) => u.id === cloned.assignedTo);
            if (userItem) {
              cloned.assignee = resolveIncludes(userItem, subInclude, 'user');
            }
          }
        }
        if (modelKey === 'chatLog') {
          if (key === 'user') {
            const userItem = store.user.find((u) => u.id === cloned.userId);
            if (userItem) {
              cloned.user = resolveIncludes(userItem, subInclude, 'user');
            }
          }
          if (key === 'escalation') {
            const escItem = store.escalationQueue.find((e) => e.chatId === cloned.id);
            if (escItem) {
              cloned.escalation = resolveIncludes(escItem, subInclude, 'escalationQueue');
            }
          }
          if (key === 'chatSession') {
            const sessionItem = store.chatSession.find((s) => s.escalationId === cloned.id);
            if (sessionItem) {
              cloned.chatSession = resolveIncludes(sessionItem, subInclude, 'chatSession');
            }
          }
        }
        if (modelKey === 'user') {
          if (key === 'role') {
            const roleItem = store.role.find((r) => r.id === cloned.roleId);
            if (roleItem) {
              cloned.role = resolveIncludes(roleItem, subInclude, 'role');
            }
          }
          if (key === 'assignedChatSessions') {
            const sessions = store.chatSession.filter((s) => s.agentId === cloned.id);
            cloned.assignedChatSessions = sessions.map((s) => resolveIncludes(s, subInclude, 'chatSession'));
          }
          if (key === 'studentProfile') {
            const profileItem = store.studentProfile.find((sp) => sp.userId === cloned.id);
            if (profileItem) {
              cloned.studentProfile = resolveIncludes(profileItem, subInclude, 'studentProfile');
            }
          }
        }
        if (modelKey === 'studentProfile') {
          if (key === 'user') {
            const userItem = store.user.find((u) => u.id === cloned.userId);
            if (userItem) {
              // Preserve `select` projections (e.g. safe user fields); only
              // fall back to role expansion when no select was requested.
              const userSpec =
                val && typeof val === 'object' && (val as any).select
                  ? val
                  : subInclude || { role: true };
              cloned.user = resolveIncludes(userItem, userSpec, 'user');
            }
          }
          if (key === 'program') {
            const progItem = store.program.find((p) => p.id === cloned.programId);
            if (progItem) {
              cloned.program = resolveIncludes(progItem, subInclude, 'program');
            }
          }
          if (key === 'accountBalance') {
            // The account_balances store is authoritative; older mock
            // snapshots embedded a second copy inside the student profile,
            // which went stale after balance recalculation.
            const balItem =
              store.accountBalance.find((balance: any) => balance.studentId === cloned.id) ||
              cloned.accountBalance;
            if (balItem) {
              cloned.accountBalance = resolveIncludes(balItem, subInclude, 'accountBalance');
            }
          }
          if (key === 'studentSemesters') {
            const semesters = store.studentSemester.filter((ss) => ss.studentId === cloned.id);
            cloned.studentSemesters = semesters.map((ss) => resolveIncludes(ss, subInclude, 'studentSemester'));
          }
          if (key === 'chatSessions') {
            const sessions = store.chatSession.filter((s) => s.studentId === cloned.id);
            cloned.chatSessions = sessions.map((s) => resolveIncludes(s, subInclude, 'chatSession'));
          }
        }
        if (modelKey === 'grade') {
          if (key === 'submittedBy') {
            const userItem = store.user.find((u) => u.id === cloned.submittedById);
            if (userItem) {
              cloned.submittedBy = resolveIncludes(userItem, subInclude, 'user');
            }
          }
          if (key === 'postedBy') {
            const userItem = store.user.find((u) => u.id === cloned.postedById);
            if (userItem) {
              cloned.postedBy = resolveIncludes(userItem, subInclude, 'user');
            }
          }
          if (key === 'approvedBy') {
            const userItem = store.user.find((u) => u.id === cloned.approvedById);
            if (userItem) {
              cloned.approvedBy = resolveIncludes(userItem, subInclude, 'user');
            }
          }
          if (key === 'rejectedBy') {
            const userItem = store.user.find((u) => u.id === cloned.rejectedById);
            if (userItem) {
              cloned.rejectedBy = resolveIncludes(userItem, subInclude, 'user');
            }
          }
          if (key === 'enrollment') {
            const enrollmentItem = store.enrollment.find((e) => e.id === cloned.enrollmentId);
            if (enrollmentItem) {
              cloned.enrollment = resolveIncludes(enrollmentItem, subInclude, 'enrollment');
            }
          }
        }
        if (modelKey === 'documentRequest') {
          if (key === 'student') {
            const studentItem = store.studentProfile.find((sp) => sp.id === cloned.studentId);
            if (studentItem) {
              cloned.student = resolveIncludes(studentItem, subInclude, 'studentProfile');
            }
          }
          if (key === 'paymentConfirmedBy') {
            const userItem = store.user.find((u) => u.id === cloned.paymentConfirmedById);
            if (userItem) {
              cloned.paymentConfirmedBy = resolveIncludes(userItem, subInclude, 'user');
            }
          }
          if (key === 'items') {
            const items = store.documentRequestItem.filter((requestItem) => requestItem.requestId === cloned.id);
            cloned.items = items.map((requestItem) =>
              resolveIncludes(requestItem, subInclude, 'documentRequestItem'),
            );
          }
        }
        if (modelKey === 'documentRequestItem') {
          if (key === 'catalogItem') {
            const catalogItem = store.documentCatalogItem.find((item) => item.id === cloned.catalogItemId);
            if (catalogItem) {
              cloned.catalogItem = resolveIncludes(catalogItem, subInclude, 'documentCatalogItem');
            }
          }
          if (key === 'request') {
            const request = store.documentRequest.find((item) => item.id === cloned.requestId);
            if (request) {
              cloned.request = resolveIncludes(request, subInclude, 'documentRequest');
            }
          }
        }
        if (modelKey === 'chatSession') {
          if (key === 'student') {
            const studentItem = store.studentProfile.find((sp) => sp.id === cloned.studentId);
            if (studentItem) {
              cloned.student = resolveIncludes(studentItem, subInclude, 'studentProfile');
            }
          }
          if (key === 'agent') {
            const userItem = store.user.find((u) => u.id === cloned.agentId);
            if (userItem) {
              cloned.agent = resolveIncludes(userItem, subInclude, 'user');
            }
          }
          if (key === 'chatLog') {
            const chatLog = store.chatLog.find((entry: any) => entry.id === cloned.escalationId);
            if (chatLog) cloned.chatLog = resolveIncludes(chatLog, subInclude, 'chatLog');
          }
          if (key === 'messages') {
            const messages = store.chatMessage.filter((m) => m.sessionId === cloned.id);
            cloned.messages = messages.map((m) => resolveIncludes(m, subInclude, 'chatMessage'));
          }
        }
        if (modelKey === 'chatMessage') {
          if (key === 'session') {
            const sessionItem = store.chatSession.find((s) => s.id === cloned.sessionId);
            if (sessionItem) {
              cloned.session = resolveIncludes(sessionItem, subInclude, 'chatSession');
            }
          }
          if (key === 'sender') {
            const userItem = store.user.find((u) => u.id === cloned.senderId);
            if (userItem) {
              cloned.sender = resolveIncludes(userItem, subInclude, 'user');
            }
          }
        }
        if (modelKey === 'studentSemester') {
          if (key === 'student') {
            const studentItem = store.studentProfile.find((sp) => sp.id === cloned.studentId);
            if (studentItem) {
              cloned.student = resolveIncludes(studentItem, subInclude, 'studentProfile');
            }
          }
          if (key === 'term') {
            const termItem = store.academicTerm.find((term) => term.id === cloned.termId);
            if (termItem) cloned.term = resolveIncludes(termItem, subInclude, 'academicTerm');
          }
        }
        if (modelKey === 'enrollment') {
          if (key === 'term') {
            const termItem = store.academicTerm.find((term) => term.id === cloned.termId);
            if (termItem) cloned.term = resolveIncludes(termItem, subInclude, 'academicTerm');
          }
          if (key === 'instructor') {
            const instructorItem = store.user.find((user) => user.id === cloned.instructorId);
            if (instructorItem) cloned.instructor = resolveIncludes(instructorItem, subInclude, 'user');
          }
          // Phase 4 (P4-05): schedule section relation.
          if (key === 'classSection') {
            const sectionItem = store.classSection.find(
              (section: any) => section.id === cloned.classSectionId,
            );
            if (sectionItem) {
              cloned.classSection = resolveIncludes(sectionItem, subInclude, 'classSection');
            }
          }
        }
        if (modelKey === 'classSection') {
          if (key === 'schedules') {
            const slots = store.classSchedule.filter(
              (slot: any) => slot.classSectionId === cloned.id,
            );
            cloned.schedules = slots.map((slot: any) =>
              resolveIncludes(slot, subInclude, 'classSchedule'),
            );
          }
        }
        if (modelKey === 'enrollmentHistory') {
          if (key === 'course') {
            const courseItem = store.course.find((course) => course.id === cloned.courseId);
            if (courseItem) cloned.course = resolveIncludes(courseItem, subInclude, 'course');
          }
          if (key === 'academicTerm') {
            const termItem = store.academicTerm.find(
              (term) => term.id === cloned.academicTermId,
            );
            if (termItem) {
              cloned.academicTerm = resolveIncludes(termItem, subInclude, 'academicTerm');
            }
          }
          if (key === 'changedBy') {
            const userItem = store.user.find((user) => user.id === cloned.changedById);
            if (userItem) cloned.changedBy = resolveIncludes(userItem, subInclude, 'user');
          }
        }
        if (modelKey === 'curriculumCourse') {
          if (key === 'course') {
            const courseItem = store.course.find((course) => course.id === cloned.courseId);
            if (courseItem) cloned.course = resolveIncludes(courseItem, subInclude, 'course');
          }
        }
        if (modelKey === 'course') {
          if (key === 'prerequisites') {
            const prereqs = store.coursePrerequisite.filter(
              (prereq: any) => prereq.courseId === cloned.id,
            );
            cloned.prerequisites = prereqs.map((prereq: any) =>
              resolveIncludes(prereq, subInclude, 'coursePrerequisite'),
            );
          }
        }
        if (modelKey === 'curriculum') {
          if (key === 'program') {
            const programItem = store.program.find((program) => program.id === cloned.programId);
            if (programItem) cloned.program = resolveIncludes(programItem, subInclude, 'program');
          }
          if (key === 'curriculumCourses') {
            const links = store.curriculumCourse.filter(
              (link: any) => link.curriculumId === cloned.id,
            );
            cloned.curriculumCourses = links.map((link: any) =>
              resolveIncludes(link, subInclude, 'curriculumCourse'),
            );
          }
        }
      }
      // Sanitized COPY: the shared store (including login hashes) is never
      // mutated. Top-level user reads keep their hash (login bcrypt + prod
      // parity for include-without-select); all nested user objects are
      // response payload and are always stripped.
      const keepRootHash =
        modelKey === 'user' &&
        (!include || !(include as any).select || (include as any).select.passwordHash);
      const projected = select
        ? Object.fromEntries(
            Object.entries(select)
              .filter(([, want]) => Boolean(want))
              .map(([field]) => [field, cloned[field]]),
          )
        : cloned;
      return stripCredentials(projected, new Map(), 0, keepRootHash);
    };

    const relationForWhere = (item: any, relation: string, modelKey: string): any => {
      if (item?.[relation] !== undefined) return item[relation];
      const lookups: Record<string, Record<string, (row: any) => any>> = {
        user: {
          role: (row) => store.role.find((entry: any) => entry.id === row.roleId),
          studentProfile: (row) => store.studentProfile.find((entry: any) => entry.userId === row.id),
        },
        rolePermission: {
          role: (row) => store.role.find((entry: any) => entry.id === row.roleId),
          permission: (row) => store.permission.find((entry: any) => entry.id === row.permissionId),
        },
        studentProfile: {
          user: (row) => store.user.find((entry: any) => entry.id === row.userId),
          program: (row) => store.program.find((entry: any) => entry.id === row.programId),
          accountBalance: (row) => store.accountBalance.find((entry: any) => entry.studentId === row.id),
        },
        chatSession: {
          student: (row) => store.studentProfile.find((entry: any) => entry.id === row.studentId),
          agent: (row) => store.user.find((entry: any) => entry.id === row.agentId),
          chatLog: (row) => store.chatLog.find((entry: any) => entry.id === row.escalationId),
        },
        escalationQueue: {
          chat: (row) => store.chatLog.find((entry: any) => entry.id === row.chatId),
          assignee: (row) => store.user.find((entry: any) => entry.id === row.assignedTo),
        },
        studentSemester: {
          student: (row) => store.studentProfile.find((entry: any) => entry.id === row.studentId),
          term: (row) => store.academicTerm.find((entry: any) => entry.id === row.termId),
        },
        paymentTransaction: {
          student: (row) => store.studentProfile.find((entry: any) => entry.id === row.studentId),
          academicTerm: (row) => store.academicTerm.find((entry: any) => entry.id === row.academicTermId),
          verifiedBy: (row) => store.user.find((entry: any) => entry.id === row.verifiedById),
        },
        curriculum: { program: (row) => store.program.find((entry: any) => entry.id === row.programId) },
        curriculumCourse: { course: (row) => store.course.find((entry: any) => entry.id === row.courseId) },
        coursePrerequisite: {
          course: (row) => store.course.find((entry: any) => entry.id === row.courseId),
          requires: (row) => store.course.find((entry: any) => entry.id === row.requiresId),
        },
        enrollment: {
          student: (row) => store.studentProfile.find((entry: any) => entry.id === row.studentId),
          course: (row) => store.course.find((entry: any) => entry.id === row.courseId),
          term: (row) => store.academicTerm.find((entry: any) => entry.id === row.termId),
          instructor: (row) => store.user.find((entry: any) => entry.id === row.instructorId),
        },
      };
      return lookups[modelKey]?.[relation]?.(item);
    };

    const scalarMatches = (actual: any, expected: any): boolean => {
      if (expected === null || typeof expected !== 'object' || expected instanceof Date) {
        return actual instanceof Date && expected instanceof Date
          ? actual.getTime() === expected.getTime()
          : actual === expected;
      }
      if ('equals' in expected && !scalarMatches(actual, expected.equals)) return false;
      if ('not' in expected && scalarMatches(actual, expected.not)) return false;
      if (Array.isArray(expected.in) && !expected.in.includes(actual)) return false;
      if (Array.isArray(expected.notIn) && expected.notIn.includes(actual)) return false;
      if (typeof expected.contains === 'string') {
        const candidate = String(actual ?? '');
        const normalizedCandidate = expected.mode === 'insensitive' ? candidate.toLowerCase() : candidate;
        const normalizedNeedle = expected.mode === 'insensitive' ? expected.contains.toLowerCase() : expected.contains;
        if (!normalizedCandidate.includes(normalizedNeedle)) return false;
      }
      if (typeof expected.startsWith === 'string' && !String(actual ?? '').startsWith(expected.startsWith)) return false;
      if (typeof expected.endsWith === 'string' && !String(actual ?? '').endsWith(expected.endsWith)) return false;
      for (const [operator, compare] of [
        ['gt', (a: any, b: any) => a > b],
        ['gte', (a: any, b: any) => a >= b],
        ['lt', (a: any, b: any) => a < b],
        ['lte', (a: any, b: any) => a <= b],
      ] as const) {
        if (operator in expected && !compare(actual, expected[operator])) return false;
      }
      return true;
    };

    const matchesWhere = (item: any, where: any, modelKey: string): boolean =>
      Object.entries(where || {}).every(([key, expected]) => {
        if (key === 'OR') return Array.isArray(expected) && expected.some((clause) => matchesWhere(item, clause, modelKey));
        if (key === 'AND') return Array.isArray(expected) && expected.every((clause) => matchesWhere(item, clause, modelKey));
        if (key === 'NOT') {
          return Array.isArray(expected)
            ? expected.every((clause) => !matchesWhere(item, clause, modelKey))
            : !matchesWhere(item, expected, modelKey);
        }
        if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
          if ('some' in expected || 'none' in expected) {
            const related = relationForWhere(item, key, modelKey);
            if (!Array.isArray(related)) return false;
            if ('some' in expected && !related.some((entry) => matchesWhere(entry, (expected as any).some, key))) return false;
            if ('none' in expected && related.some((entry) => matchesWhere(entry, (expected as any).none, key))) return false;
            return true;
          }
          if ('is' in expected || 'isNot' in expected) {
            const related = relationForWhere(item, key, modelKey);
            if ('is' in expected && (expected as any).is === null) return related == null;
            if ('isNot' in expected && (expected as any).isNot === null) return related != null;
            return Boolean(related) &&
              (!('is' in expected) || matchesWhere(related, (expected as any).is, key)) &&
              (!('isNot' in expected) || !matchesWhere(related, (expected as any).isNot, key));
          }
          const scalarOperators = new Set(['equals', 'not', 'in', 'notIn', 'contains', 'startsWith', 'endsWith', 'gt', 'gte', 'lt', 'lte', 'mode']);
          const looksLikeScalarFilter = Object.keys(expected).some((field) => scalarOperators.has(field));
          const relation = relationForWhere(item, key, modelKey);
          if (!looksLikeScalarFilter && relation !== undefined) {
            return Array.isArray(relation)
              ? relation.some((entry) => matchesWhere(entry, expected, key))
              : Boolean(relation) && matchesWhere(relation, expected, key);
          }
          if (!looksLikeScalarFilter && !(key in (item ?? {}))) {
            // Prisma compound unique selectors are objects of scalar fields.
            return matchesWhere(item, expected, modelKey);
          }
        }
        return scalarMatches(item?.[key], expected);
      });

    // Build mock model actions
    for (const modelKey of Object.keys(store)) {
      this.mockDb[modelKey] = {
        findUnique: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const found = list.find((item) => matchesWhere(item, where, modelKey)) || null;
          return found ? resolveIncludes(found, args?.include ?? (args?.select ? { select: args.select } : undefined), modelKey) : null;
        },
        findUniqueOrThrow: async (args: any) => {
          const res = await this.mockDb[modelKey].findUnique(args);
          if (!res) throw new Error(`${modelKey} not found`);
          return res;
        },
        findFirst: async (args: any) => {
          return this.mockDb[modelKey].findUnique(args);
        },
        findMany: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const filtered = list.filter((item) => matchesWhere(item, where, modelKey));
          return filtered.map((item) => resolveIncludes(item, args?.include ?? (args?.select ? { select: args.select } : undefined), modelKey));
        },
        upsert: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const existing = list.find((item) => matchesWhere(item, where, modelKey));
          if (existing) {
            Object.assign(existing, args?.update || {});
            existing.updatedAt = new Date();
            saveDb();
            return resolveIncludes(existing, args?.include, modelKey);
          }
          return this.mockDb[modelKey].create({
            data: args?.create || {},
            include: args?.include,
          });
        },
        create: async (args: any) => {
          const list = store[modelKey];
          const newId = `mock-${modelKey}-${Math.random().toString(36).substr(2, 9)}`;
          const newItem = {
            id: newId,
            ...(modelKey === 'user' ? { isActive: true, mustChangePassword: true } : {}),
            ...(modelKey === 'authSession'
              ? { lastUsedAt: null, revokedAt: null, revokeReason: null }
              : {}),
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Attach relations if needed
          if (modelKey === 'user' && args.data.roleId) {
            newItem.role = store.role.find((r: any) => r.id === args.data.roleId);
          }
          if (modelKey === 'studentProfile') {
            newItem.user = store.user.find((u: any) => u.id === args.data.userId);
            newItem.program = store.program.find((p: any) => p.id === args.data.programId) || store.program[0];
            newItem.accountBalance = {
              id: `mock-balance-${newItem.id}`,
              studentId: newItem.id,
              balance: 10000.0,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          if (modelKey === 'enrollment') {
            newItem.course = store.course.find((c: any) => c.id === args.data.courseId) || store.course[0];
            newItem.student =
              store.studentProfile.find((sp: any) => sp.id === args.data.studentId) || store.studentProfile[0];
            newItem.term = store.academicTerm.find((term: any) => term.id === args.data.termId);
            newItem.instructor = store.user.find((user: any) => user.id === args.data.instructorId);
          }
          if (modelKey === 'documentRequest') {
            newItem.student = studentProfiles.find((sp) => sp.id === args.data.studentId);
            if (args.data.paymentConfirmedById) {
              newItem.paymentConfirmedBy = users.find((u) => u.id === args.data.paymentConfirmedById);
            }
          }
          if (modelKey === 'documentRequestItem') {
            newItem.catalogItem = documentCatalogItems.find((item) => item.id === args.data.catalogItemId);
            newItem.request = documentRequests.find((request) => request.id === args.data.requestId);
          }
          if (modelKey === 'grade') {
            // Mirror Prisma schema defaults in local mock mode so an
            // enrollment-created grade enters the same workflow state as
            // production: draft and hidden until it is published.
            newItem.status = newItem.status || 'draft';
            newItem.isVisible = newItem.isVisible ?? false;
            newItem.enrollment = enrollments.find((e) => e.id === args.data.enrollmentId);
            if (args.data.submittedById) {
              newItem.submittedBy = users.find((u) => u.id === args.data.submittedById);
            }
            if (args.data.postedById) {
              newItem.postedBy = users.find((u) => u.id === args.data.postedById);
            }
            if (args.data.approvedById) {
              newItem.approvedBy = users.find((u) => u.id === args.data.approvedById);
            }
            if (args.data.rejectedById) {
              newItem.rejectedBy = users.find((u) => u.id === args.data.rejectedById);
            }
          }
          if (modelKey === 'studentSemester') {
            newItem.student = studentProfiles.find((sp) => sp.id === args.data.studentId);
            newItem.term = academicTerms.find((term) => term.id === args.data.termId);
          }
          if (modelKey === 'academicTerm') {
            newItem.status = newItem.status || 'planned';
            newItem.isCurrent = newItem.isCurrent || false;
          }
          if (modelKey === 'chatSession') {
            newItem.agentId = newItem.agentId ?? null;
            newItem.studentLastViewedAt = newItem.studentLastViewedAt ?? null;
            newItem.student = store.studentProfile.find((sp: any) => sp.id === args.data.studentId);
            if (args.data.agentId) {
              newItem.agent = store.user.find((u: any) => u.id === args.data.agentId);
            }
          }
          if (modelKey === 'escalationQueue') {
            newItem.assignedTo = newItem.assignedTo ?? null;
            newItem.resolution = newItem.resolution ?? null;
            newItem.routingNote = newItem.routingNote ?? null;
            newItem.resolvedAt = newItem.resolvedAt ?? null;
          }
          if (modelKey === 'chatMessage') {
            newItem.session = store.chatSession.find((s: any) => s.id === args.data.sessionId);
            newItem.sender = store.user.find((u: any) => u.id === args.data.senderId);
          }

          list.push(newItem);
          saveDb();
          return resolveIncludes(newItem, args?.include, modelKey);
        },
        update: async (args: any) => {
          const item = await this.mockDb[modelKey].findUnique({
            where: args.where,
          });
          if (!item) throw new Error(`${modelKey} not found to update`);
          Object.assign(item, args.data);
          item.updatedAt = new Date();
          saveDb();
          return resolveIncludes(item, args?.include, modelKey);
        },
        updateMany: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const data = args?.data || {};
          let count = 0;
          for (const item of list) {
            const matches = matchesWhere(item, where, modelKey);
            if (matches) {
              Object.assign(item, data);
              item.updatedAt = new Date();
              count++;
            }
          }
          saveDb();
          return { count };
        },
        createMany: async (args: any) => {
          const list = store[modelKey];
          const itemsData = args?.data || [];
          let count = 0;
          for (const dataItem of itemsData) {
            const newId = `mock-${modelKey}-${Math.random().toString(36).substr(2, 9)}`;
            const newItem = {
              id: newId,
              ...dataItem,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            list.push(newItem);
            count++;
          }
          saveDb();
          return { count };
        },
        delete: async (args: any) => {
          const idx = store[modelKey].findIndex((item) => {
            return matchesWhere(item, args.where, modelKey);
          });
          if (idx === -1) throw new Error(`${modelKey} not found to delete`);
          const [removed] = store[modelKey].splice(idx, 1);
          saveDb();
          return removed;
        },
        deleteMany: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          let count = 0;
          for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i];
            const matches = matchesWhere(item, where, modelKey);
            if (matches) {
              list.splice(i, 1);
              count++;
            }
          }
          saveDb();
          return { count };
        },
        count: async (args: any) => {
          const list = await this.mockDb[modelKey].findMany(args);
          return list.length;
        },
        aggregate: async (args: any = {}) => {
          return aggregateMockRows(
            store[modelKey],
            args,
            (row, where) => matchesWhere(row, where, modelKey),
          );
        },
        groupBy: async () => {
          return [];
        },
      };
    }
  }
}
