import { CANONICAL_ROLE_NAMES, ROLE_PERMISSIONS } from './rbac';

/**
 * Table 3.10 permission-model coverage (Phase 2 required tests).
 * Asserts the seeded role → permission mapping used by the SQL migration,
 * the dev seed, the mock database, and PermissionService.
 */
describe('Thesis role-permission matrix (Table 3.10)', () => {
  const can = (role: string, permission: string): boolean =>
    (ROLE_PERMISSIONS as Record<string, string[]>)[role]?.includes(permission) ?? false;

  it('defines exactly the six institutional roles', () => {
    expect([...CANONICAL_ROLE_NAMES]).toEqual([
      'student',
      'faculty',
      'dean',
      'registrar',
      'treasury',
      'sys_admin',
    ]);
    expect(ROLE_PERMISSIONS.sys_admin).not.toContain('student_record.update');
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

  it('escalation is a staff capability: dean routes, staff respond', () => {
    for (const role of ['faculty', 'dean', 'registrar', 'treasury', 'sys_admin']) {
      expect(can(role, 'escalation.view_assigned')).toBe(true);
      expect(can(role, 'escalation.respond')).toBe(true);
      expect(can(role, 'escalation.resolve')).toBe(true);
    }

    expect(can('dean', 'escalation.view_dean_queue')).toBe(true);
    expect(can('dean', 'escalation.assign')).toBe(true);
    expect(can('dean', 'escalation.reassign')).toBe(true);

    for (const role of ['faculty', 'registrar', 'treasury', 'sys_admin', 'student']) {
      expect(can(role, 'escalation.view_dean_queue')).toBe(false);
      expect(can(role, 'escalation.assign')).toBe(false);
      expect(can(role, 'escalation.reassign')).toBe(false);
    }
    expect(can('student', 'escalation.respond')).toBe(false);
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

  it('sys_admin: system administration and authorized support reads only', () => {
    expect(can('sys_admin', 'user.manage')).toBe(true);
    expect(can('sys_admin', 'role.manage')).toBe(true);
    expect(can('sys_admin', 'audit.read')).toBe(true);
    expect(can('sys_admin', 'system_settings.manage')).toBe(true);
    expect(can('sys_admin', 'security.manage')).toBe(true);
    expect(can('sys_admin', 'student_record.read_assigned')).toBe(true);
    expect(can('sys_admin', 'knowledge_base.manage')).toBe(true);
    expect(can('sys_admin', 'student_record.update')).toBe(false);
    expect(can('sys_admin', 'enrollment.process')).toBe(false);
    expect(can('sys_admin', 'financial.manage')).toBe(false);
    expect(can('sys_admin', 'service_request.process')).toBe(false);
    expect(can('sys_admin', 'aria.use')).toBe(false);
  });

  it('only sys_admin can manage users/roles or read audit logs', () => {
    for (const role of CANONICAL_ROLE_NAMES) {
      if (role === 'sys_admin') continue;
      expect(can(role, 'user.manage')).toBe(false);
      expect(can(role, 'role.manage')).toBe(false);
      expect(can(role, 'audit.read')).toBe(false);
    }
  });
});
