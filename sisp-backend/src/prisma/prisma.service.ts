import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import { DOCUMENT_CATALOG } from '../common/constants/document-catalog';
import { PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from '../common/authz/rbac';

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
              return arg(receiver);
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

    // Load existing mock DB from disk if it exists
    if (fs.existsSync(dbFilePath)) {
      try {
        const fileData = fs.readFileSync(dbFilePath, 'utf8');
        const parsed = JSON.parse(fileData);
        for (const key of Object.keys(store)) {
          if (parsed[key] && Array.isArray(parsed[key])) {
            store[key] = parsed[key];
          }
        }
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
        if (!store.permission?.length) store.permission = permissions;
        if (!store.rolePermission?.length) store.rolePermission = rolePermissions;

        console.log('[Prisma Mock] Loaded database state from mock-db.json');
      } catch (err) {
        console.error('[Prisma Mock] Failed to read mock-db.json:', err);
      }
    }

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

    // Recursive mock relation populate helper
    const resolveIncludes = (item: any, include: any, modelKey: string): any => {
      if (!item || !include) return item;
      // Honor Prisma `select` projections (e.g. user selects that exclude
      // passwordHash). Without this, mock mode leaks full rows to clients.
      if (typeof include === 'object' && include !== null && !Array.isArray(include)) {
        const select = (include as any).select;
        if (select && typeof select === 'object' && !(include as any).include) {
          const picked: any = {};
          for (const [field, want] of Object.entries(select)) {
            if (want) picked[field] = item[field];
          }
          return picked;
        }
      }
      const cloned = { ...item };
      for (const [key, val] of Object.entries(include)) {
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
      return stripCredentials(cloned, new Map(), 0, keepRootHash);
    };

    const matchesWhere = (item: any, where: any): boolean => {
      return Object.entries(where || {}).every(([k, v]) => {
        if (typeof v === 'object' && v !== null) {
          if ('in' in (v as any) && Array.isArray((v as any).in)) {
            return (v as any).in.includes(item[k]);
          }
          // Nested where (e.g. { enrollment: { studentId: '...' } })
          const itemRelation = item[k];
          if (itemRelation && typeof itemRelation === 'object') {
            return Object.entries(v).every(([rk, rv]) => itemRelation[rk] === rv);
          }
          return true;
        }
        return item[k] === v;
      });
    };

    // Build mock model actions
    for (const modelKey of Object.keys(store)) {
      this.mockDb[modelKey] = {
        findUnique: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const found = list.find((item) => matchesWhere(item, where)) || null;
          return found ? resolveIncludes(found, args?.include, modelKey) : null;
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
          const filtered = list.filter((item) => matchesWhere(item, where));
          return filtered.map((item) => resolveIncludes(item, args?.include, modelKey));
        },
        upsert: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const existing = list.find((item) => matchesWhere(item, where));
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
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Attach relations if needed
          if (modelKey === 'user' && args.data.roleId) {
            newItem.role = roles.find((r) => r.id === args.data.roleId);
          }
          if (modelKey === 'studentProfile') {
            newItem.user = users.find((u) => u.id === args.data.userId);
            newItem.program = programs.find((p) => p.id === args.data.programId) || programs[0];
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
            newItem.course = courses.find((c) => c.id === args.data.courseId) || courses[0];
            newItem.student =
              studentProfiles.find((sp) => sp.id === args.data.studentId) || studentProfiles[0];
            newItem.term = academicTerms.find((term) => term.id === args.data.termId);
            newItem.instructor = users.find((user) => user.id === args.data.instructorId);
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
            newItem.student = studentProfiles.find((sp) => sp.id === args.data.studentId);
            if (args.data.agentId) {
              newItem.agent = users.find((u) => u.id === args.data.agentId);
            }
          }
          if (modelKey === 'chatMessage') {
            newItem.session = chatSessions.find((s) => s.id === args.data.sessionId);
            newItem.sender = users.find((u) => u.id === args.data.senderId);
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
            const matches = matchesWhere(item, where);
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
            return Object.entries(args.where).every(([k, v]) => item[k] === v);
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
            const matches = Object.entries(where).every(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                if ('in' in v && Array.isArray((v as any).in)) {
                  return (v as any).in.includes(item[k]);
                }
                return true;
              }
              return item[k] === v;
            });
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
        aggregate: async () => {
          return { _sum: { units: 10 }, _avg: { finalGrade: 92.5 } };
        },
        groupBy: async () => {
          return [];
        },
      };
    }
  }
}
