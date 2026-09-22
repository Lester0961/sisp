import { ForbiddenException } from '@nestjs/common';
import { StudentAccessService } from './student-access.service';

describe('StudentAccessService (Phase 1 record-level scope)', () => {
  const prisma: any = {
    studentProfile: { findUnique: jest.fn() },
    adviserAssignment: { findFirst: jest.fn(), findMany: jest.fn() },
    enrollment: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  let service: StudentAccessService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StudentAccessService(prisma);
  });

  it('lets a student read only their own profile', async () => {
    prisma.studentProfile.findUnique.mockResolvedValue({ userId: 'user-1' });

    await expect(service.canReadStudent({ sub: 'user-1', role: 'student' }, 'profile-1')).resolves.toBe(true);
    await expect(service.canReadStudent({ sub: 'user-2', role: 'student' }, 'profile-1')).resolves.toBe(false);
  });

  it('gives registrar and sys_admin institutional read access', async () => {
    await expect(service.canReadStudent({ sub: 'r1', role: 'registrar' }, 'profile-1')).resolves.toBe(true);
    await expect(service.canReadStudent({ sub: 's1', role: 'sys_admin' }, 'profile-1')).resolves.toBe(true);
  });

  it('scopes deans to active advisee assignments', async () => {
    prisma.adviserAssignment.findFirst.mockResolvedValueOnce({ id: 'adv-1' });
    await expect(service.canReadStudent({ sub: 'dean-1', role: 'dean' }, 'profile-1')).resolves.toBe(true);

    prisma.adviserAssignment.findFirst.mockResolvedValueOnce(null);
    await expect(service.canReadStudent({ sub: 'dean-1', role: 'dean' }, 'profile-2')).resolves.toBe(false);
  });

  it('scopes faculty to students they teach', async () => {
    prisma.enrollment.findFirst.mockResolvedValueOnce({ id: 'enr-1' });
    await expect(service.canReadStudent({ sub: 'fac-1', role: 'faculty' }, 'profile-1')).resolves.toBe(true);

    prisma.enrollment.findFirst.mockResolvedValueOnce(null);
    await expect(service.canReadStudent({ sub: 'fac-1', role: 'faculty' }, 'profile-2')).resolves.toBe(false);
  });

  it('denies treasury any student record access', async () => {
    await expect(service.canReadStudent({ sub: 't1', role: 'treasury' }, 'profile-1')).resolves.toBe(false);
  });

  it('throws a clear 403 when a record is outside scope', async () => {
    prisma.adviserAssignment.findFirst.mockResolvedValue(null);
    await expect(
      service.assertCanReadStudent({ sub: 'dean-1', role: 'dean' }, 'profile-9'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns null (all) for registrar/sys_admin list scope and scoped ids otherwise', async () => {
    await expect(service.accessibleStudentIds({ sub: 'r', role: 'registrar' })).resolves.toBeNull();
    await expect(service.accessibleStudentIds({ sub: 's', role: 'sys_admin' })).resolves.toBeNull();

    prisma.adviserAssignment.findMany.mockResolvedValueOnce([{ studentId: 'p1' }, { studentId: 'p2' }]);
    await expect(service.accessibleStudentIds({ sub: 'dean-1', role: 'dean' })).resolves.toEqual(['p1', 'p2']);

    prisma.enrollment.findMany.mockResolvedValueOnce([{ studentId: 'p3' }]);
    await expect(service.accessibleStudentIds({ sub: 'fac-1', role: 'faculty' })).resolves.toEqual(['p3']);

    prisma.studentProfile.findUnique.mockResolvedValueOnce({ id: 'own' });
    await expect(service.accessibleStudentIds({ sub: 'stu', role: 'student' })).resolves.toEqual(['own']);
  });
});
