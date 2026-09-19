import { CANONICAL_ROLE_NAMES, ROLE_PERMISSIONS, ALL_PERMISSION_KEYS } from './rbac';

/**
 * Table 3.10 permission-model coverage (Phase 2 required tests).
 * Asserts the seeded role → permission mapping used by the SQL migration,
 * the dev seed, the mock database, and PermissionService.
 */
describe('Thesis role-permission matrix (Table 3.10)', () => {
  const can = (role: string, permission: string): boolean =>
    (ROLE_PERMISSIONS as Record<string, string[]>)[role]?.includes(permission) ?? false;

  it('defines all canonical portal roles plus the supporting live_agent role', () => {
    expect([...CANONICAL_ROLE_NAMES]).toEqual(
      expect.arrayContaining([
        'student',
        'faculty',
        'dean',
        'registrar',
        'treasury',
        'sys_admin',
        'live_agent',
      ]),
    );
    expect(ROLE_PERMISSIONS.sys_admin.length).toBe(ALL_PERMISSION_KEYS.length);
  });

  it('student: own records, service requests, ARIA only', () => {
    expect(can('student', 'student_record.read_own')).toBe(true);
    expect(can('student', 'enrollment.read_own')).toBe(true);
    expect(can('student', 'financial.read_own')).toBe(true);
    expect(can('student', 'service_request.create')).toBe(true);
    expect(can('student', 'aria.use')).toBe(true);

    expect(can('student', 'student_record.read_assigned')).toBe(false);
    expect(can('student', 'service_request.process')).toBe(false);
    expect(can('student', 'financial.manage')).toBe(false);
    expect(can('student', 'user.manage')).toBe(false);
    expect(can('student', 'audit.read')).toBe(false);
  });

  it('faculty: assigned academic records read only', () => {
    expect(can('faculty', 'student_record.read_assigned')).toBe(true);
    expect(can('faculty', 'student_record.read_own')).toBe(false);
    expect(can('faculty', 'student_record.update')).toBe(false);
    expect(can('faculty', 'enrollment.process')).toBe(false);
    expect(can('faculty', 'financial.manage')).toBe(false);
    expect(can('faculty', 'user.manage')).toBe(false);
  });

  it('dean: assigned student review, trends, reports', () => {
    expect(can('dean', 'student_record.read_assigned')).toBe(true);
    expect(can('dean', 'aria_trends.read')).toBe(true);
    expect(can('dean', 'report.read')).toBe(true);
    expect(can('dean', 'enrollment.process')).toBe(false);
    expect(can('dean', 'financial.manage')).toBe(false);
    expect(can('dean', 'user.manage')).toBe(false);
  });

  it('registrar: academic records, enrollment, service requests, KB, reports', () => {
    expect(can('registrar', 'student_record.read_assigned')).toBe(true);
    expect(can('registrar', 'student_record.update')).toBe(true);
    expect(can('registrar', 'enrollment.process')).toBe(true);
    expect(can('registrar', 'service_request.process')).toBe(true);
    expect(can('registrar', 'knowledge_base.manage')).toBe(true);
    expect(can('registrar', 'report.read')).toBe(true);

    expect(can('registrar', 'financial.manage')).toBe(false);
    expect(can('registrar', 'aria.use')).toBe(false);
    expect(can('registrar', 'user.manage')).toBe(false);
    expect(can('registrar', 'audit.read')).toBe(false);
  });

  it('treasury: financial management and reports only', () => {
    expect(can('treasury', 'financial.manage')).toBe(true);
    expect(can('treasury', 'report.read')).toBe(true);

    expect(can('treasury', 'student_record.update')).toBe(false);
    expect(can('treasury', 'enrollment.process')).toBe(false);
    expect(can('treasury', 'service_request.process')).toBe(false);
    expect(can('treasury', 'knowledge_base.manage')).toBe(false);
    expect(can('treasury', 'user.manage')).toBe(false);
    expect(can('treasury', 'audit.read')).toBe(false);
  });

  it('sys_admin: user/role administration, audit, and all system permissions', () => {
    expect(can('sys_admin', 'user.manage')).toBe(true);
    expect(can('sys_admin', 'role.manage')).toBe(true);
    expect(can('sys_admin', 'audit.read')).toBe(true);
    for (const permission of ALL_PERMISSION_KEYS) {
      expect(can('sys_admin', permission)).toBe(true);
    }
  });

  it('only sys_admin can manage users/roles or read audit logs', () => {
    for (const role of CANONICAL_ROLE_NAMES) {
      if (role === 'sys_admin') continue;
      expect(can(role, 'user.manage')).toBe(false);
      expect(can(role, 'role.manage')).toBe(false);
      expect(can(role, 'audit.read')).toBe(false);
    }
  });

  it('live_agent has no catalog permissions (ARIA escalation is role-gated)', () => {
    expect(ROLE_PERMISSIONS.live_agent).toEqual([]);
  });
});
