import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public isOffline = false;
  private mockDb: any = {};

  constructor() {
    super();
    this.initMockDb();

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
      console.warn('[Prisma] Could not connect to the database.', error);
      this.isOffline = true;
      console.log('[Prisma Mock] Active — using in-memory mock database.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect().catch(() => {});
  }

  private initMockDb() {
    const localDemoPassword = process.env.LOCAL_DEMO_PASSWORD || 'local-demo-only';
    const mockPasswordHash = bcrypt.hashSync(localDemoPassword, 10);

    // Seed mock data stores
    const roles = [
      { id: 'role-id-admin_staff', name: 'admin_staff', createdAt: new Date() },
      { id: 'role-id-dean', name: 'dean', createdAt: new Date() },
      { id: 'role-id-faculty', name: 'faculty', createdAt: new Date() },
      { id: 'role-id-student', name: 'student', createdAt: new Date() },
      { id: 'role-id-sys_admin', name: 'sys_admin', createdAt: new Date() },
      { id: 'role-id-live_agent', name: 'live_agent', createdAt: new Date() },
    ];

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
        role: roles[0],
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
        role: roles[1],
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
        role: roles[2],
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
        role: roles[3],
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
        role: roles[4],
      },
      {
        id: 'mock-live-agent-id',
        email: 'agent@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Support',
        lastName: 'Agent',
        roleId: 'role-id-live_agent',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[5],
      },
    ];

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

    const studentSemesters = [
      {
        id: 'mock-ss-1',
        studentId: 'mock-student-profile-id',
        semester: '1st',
        year: '2025-2026',
        isFullyPaid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentProfiles[0],
      },
      {
        id: 'mock-ss-2',
        studentId: 'mock-student-profile-id',
        semester: '2nd',
        year: '2025-2026',
        isFullyPaid: false,
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
        semester: '1st',
        year: '2025-2026',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[0],
        student: studentProfiles[0],
      },
      {
        id: 'mock-enrollment-cs302',
        studentId: 'mock-student-profile-id',
        courseId: 'mock-course-cs302',
        section: 'A',
        status: 'enrolled',
        semester: '1st',
        year: '2025-2026',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[1],
        student: studentProfiles[0],
      },
      {
        id: 'mock-enrollment-cs303',
        studentId: 'mock-student-profile-id',
        courseId: 'mock-course-cs303',
        section: 'B',
        status: 'enrolled',
        semester: '1st',
        year: '2025-2026',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[2],
        student: studentProfiles[0],
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
        type: 'Certificate of Enrollment',
        status: 'released',
        remarks: 'Cleared by accounting',
        fee: 150.0,
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
        type: 'Transcript of Records',
        status: 'awaiting_payment',
        remarks: 'Awaiting payment confirmation',
        fee: 200.0,
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

    const store: Record<string, any[]> = {
      role: roles,
      user: users,
      program: programs,
      course: courses,
      studentProfile: studentProfiles,
      studentSemester: studentSemesters,
      enrollment: enrollments,
      grade: grades,
      documentRequest: documentRequests,
      notification: notifications,
      chatLog: chatLogs,
      escalationQueue: escalations,
      chatSession: chatSessions,
      chatMessage: chatMessages,
      auditLog: auditLogs,
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
        console.log('[Prisma Mock] Loaded database state from mock-db.json');
      } catch (err) {
        console.error('[Prisma Mock] Failed to read mock-db.json:', err);
      }
    }

    const saveDb = () => {
      try {
        fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
      } catch (err) {
        console.error('[Prisma Mock] Failed to write mock-db.json:', err);
      }
    };

    // Recursive mock relation populate helper
    const resolveIncludes = (item: any, include: any, modelKey: string): any => {
      if (!item || !include) return item;
      const cloned = { ...item };
      for (const [key, val] of Object.entries(include)) {
        if (!val) continue;
        const subInclude =
          typeof val === 'object' && val !== null ? (val as any).include : undefined;

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
        }
        if (modelKey === 'studentProfile') {
          if (key === 'user') {
            const userItem = store.user.find((u) => u.id === cloned.userId);
            if (userItem) {
              cloned.user = resolveIncludes(userItem, subInclude || { role: true }, 'user');
            }
          }
          if (key === 'program') {
            const progItem = store.program.find((p) => p.id === cloned.programId);
            if (progItem) {
              cloned.program = resolveIncludes(progItem, subInclude, 'program');
            }
          }
          if (key === 'accountBalance') {
            const balItem =
              cloned.accountBalance ||
              store.studentProfile.find((sp) => sp.id === cloned.id)?.accountBalance;
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
        }
      }
      return cloned;
    };

    // Build mock model actions
    for (const modelKey of Object.keys(store)) {
      this.mockDb[modelKey] = {
        findUnique: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const found =
            list.find((item) => {
              return Object.entries(where).every(([k, v]) => {
                if (typeof v === 'object' && v !== null) {
                  // Nested match
                  return true;
                }
                return item[k] === v;
              });
            }) || null;
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
          const filtered = list.filter((item) => {
            return Object.entries(where).every(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                // Nested where (e.g. { enrollment: { studentId: '...' } })
                const itemRelation = item[k];
                if (itemRelation) {
                  return Object.entries(v).every(([rk, rv]) => itemRelation[rk] === rv);
                }
                return true;
              }
              return item[k] === v;
            });
          });
          return filtered.map((item) => resolveIncludes(item, args?.include, modelKey));
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
          }
          if (modelKey === 'documentRequest') {
            newItem.student = studentProfiles.find((sp) => sp.id === args.data.studentId);
            if (args.data.paymentConfirmedById) {
              newItem.paymentConfirmedBy = users.find((u) => u.id === args.data.paymentConfirmedById);
            }
          }
          if (modelKey === 'grade') {
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
            const matches = Object.entries(where).every(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                return true;
              }
              return item[k] === v;
            });
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
