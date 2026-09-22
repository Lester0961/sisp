/**
 * Canonical RBAC catalog for SISP (Phase 2, P2-01/P2-02).
 *
 * This file is the single TypeScript source for the seeded permission data:
 *  - the mock database (local development) reads it directly;
 *  - `prisma/seed.ts` (local database seeding) upserts it;
 *  - tests assert it matches the reviewed SQL migration
 *    (`prisma/migrations/20260920010000_reference_catalog/migration.sql`).
 *
 * Permission keys use the `<resource>.<action>` form, backed by the
 * `permissions` table columns `resource` and `action`.
 */

export const CANONICAL_ROLE_NAMES = [
  'student',
  'faculty',
  'dean',
  'registrar',
  'treasury',
  'sys_admin',
] as const;

export type CanonicalRoleName = (typeof CANONICAL_ROLE_NAMES)[number];

export interface PermissionDefinition {
  resource: string;
  action: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { resource: 'student_record', action: 'read_own' },
  { resource: 'student_record', action: 'read_assigned' },
  { resource: 'student_record', action: 'update' },
  { resource: 'enrollment', action: 'read_own' },
  { resource: 'enrollment', action: 'process' },
  { resource: 'financial', action: 'read_own' },
  { resource: 'financial', action: 'manage' },
  { resource: 'service_request', action: 'create' },
  { resource: 'service_request', action: 'process' },
  { resource: 'aria', action: 'use' },
  { resource: 'aria_trends', action: 'read' },
  { resource: 'knowledge_base', action: 'manage' },
  { resource: 'report', action: 'read' },
  { resource: 'user', action: 'manage' },
  { resource: 'role', action: 'manage' },
  { resource: 'audit', action: 'read' },
  { resource: 'system_settings', action: 'manage' },
  { resource: 'security', action: 'manage' },
  // Human escalation is a staff capability, not a role (Phase 1).
  { resource: 'escalation', action: 'view_assigned' },
  { resource: 'escalation', action: 'respond' },
  { resource: 'escalation', action: 'view_dean_queue' },
  { resource: 'escalation', action: 'assign' },
  { resource: 'escalation', action: 'reassign' },
  { resource: 'escalation', action: 'resolve' },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_DEFINITIONS.map(
  (permission) => `${permission.resource}.${permission.action}`,
);

/**
 * Role â†’ permission mapping derived from the printed thesis permission model
 * (Table 3.10) with the Registrar/Treasury separation from DEC-001:
 *  - Registrar: academic records, enrollment, service requests, reports, KB
 *  - Treasury: financial records, payment verification, financial reports
 *  - sys_admin holds system-administration permissions and read-only access
 *    needed for support; operational student, enrollment, request, and finance
 *    writes remain assigned to their domain offices.
 */
export const ROLE_PERMISSIONS: Record<CanonicalRoleName, string[]> = {
  student: [
    'student_record.read_own',
    'enrollment.read_own',
    'financial.read_own',
    'service_request.create',
    'aria.use',
  ],
  faculty: [
    'student_record.read_assigned',
    'escalation.view_assigned',
    'escalation.respond',
    'escalation.resolve',
  ],
  dean: [
    'student_record.read_assigned',
    'aria_trends.read',
    'report.read',
    'escalation.view_assigned',
    'escalation.respond',
    'escalation.view_dean_queue',
    'escalation.assign',
    'escalation.reassign',
    'escalation.resolve',
  ],
  registrar: [
    'student_record.read_assigned',
    'student_record.update',
    'enrollment.process',
    'service_request.process',
    'knowledge_base.manage',
    'report.read',
    'escalation.view_assigned',
    'escalation.respond',
    'escalation.resolve',
  ],
  treasury: [
    'financial.manage',
    'report.read',
    'escalation.view_assigned',
    'escalation.respond',
    'escalation.resolve',
  ],
  sys_admin: [
    'student_record.read_assigned',
    'knowledge_base.manage',
    'report.read',
    'user.manage',
    'role.manage',
    'audit.read',
    'system_settings.manage',
    'security.manage',
    'escalation.view_assigned',
    'escalation.respond',
    'escalation.resolve',
  ],
};

export function permissionKey(permission: PermissionDefinition): string {
  return `${permission.resource}.${permission.action}`;
}
