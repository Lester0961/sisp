/**
 * Canonical RBAC catalog for SISP (Phase 2, P2-01/P2-02).
 *
 * This file is the single TypeScript source for the seeded permission data:
 *  - the mock database (local development) reads it directly;
 *  - `prisma/seed.ts` (local database seeding) upserts it;
 *  - tests assert it matches the reviewed SQL migration
 *    (`prisma/migrations/20260920000000_rbac_role_alignment/migration.sql`).
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
  'live_agent',
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
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_DEFINITIONS.map(
  (permission) => `${permission.resource}.${permission.action}`,
);

/**
 * Role → permission mapping derived from the printed thesis permission model
 * (Table 3.10) with the Registrar/Treasury separation from DEC-001:
 *  - Registrar: academic records, enrollment, service requests, reports, KB
 *  - Treasury: financial records, payment verification, financial reports
 *  - sys_admin additionally holds the system-administration permissions.
 */
export const ROLE_PERMISSIONS: Record<CanonicalRoleName, string[]> = {
  student: [
    'student_record.read_own',
    'enrollment.read_own',
    'financial.read_own',
    'service_request.create',
    'aria.use',
  ],
  faculty: ['student_record.read_assigned'],
  dean: ['student_record.read_assigned', 'aria_trends.read', 'report.read'],
  registrar: [
    'student_record.read_assigned',
    'student_record.update',
    'enrollment.process',
    'service_request.process',
    'knowledge_base.manage',
    'report.read',
  ],
  treasury: ['financial.manage', 'report.read'],
  sys_admin: [...ALL_PERMISSION_KEYS],
  live_agent: [],
};

export function permissionKey(permission: PermissionDefinition): string {
  return `${permission.resource}.${permission.action}`;
}
