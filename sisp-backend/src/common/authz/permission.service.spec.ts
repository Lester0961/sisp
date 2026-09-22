import * as fs from 'fs';
import * as path from 'path';
import { PermissionService } from './permission.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from './rbac';

describe('PermissionService (Phase 2, P2-02)', () => {
  const mockPrisma: any = {
    rolePermission: { findMany: jest.fn() },
  };

  let service: PermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionService(mockPrisma as PrismaService);
  });

  it('resolves role permissions from action/resource rows', async () => {
    mockPrisma.rolePermission.findMany.mockResolvedValue([
      { permission: { resource: 'audit', action: 'read' } },
      { permission: { resource: 'user', action: 'manage' } },
      { permission: { resource: 'role', action: 'manage' } },
    ]);

    const permissions = await service.getPermissionsForRole('sys_admin');
    expect([...permissions].sort()).toEqual(['audit.read', 'role.manage', 'user.manage']);
  });

  it('fails closed when the permission lookup throws', async () => {
    mockPrisma.rolePermission.findMany.mockRejectedValue(new Error('db down'));
    await expect(service.hasPermission('sys_admin', 'audit.read')).resolves.toBe(false);
  });

  it('caches role permission sets until invalidated', async () => {
    mockPrisma.rolePermission.findMany.mockResolvedValue([]);
    await service.getPermissionsForRole('student');
    await service.getPermissionsForRole('student');
    expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledTimes(1);

    service.invalidate('student');
    await service.getPermissionsForRole('student');
    expect(mockPrisma.rolePermission.findMany).toHaveBeenCalledTimes(2);
  });

  it('requires every requested permission', async () => {
    mockPrisma.rolePermission.findMany.mockResolvedValue([
      { permission: { resource: 'report', action: 'read' } },
    ]);
    await expect(service.hasAllPermissions('dean', ['report.read'])).resolves.toBe(true);
    await expect(
      service.hasAllPermissions('dean', ['report.read', 'user.manage']),
    ).resolves.toBe(false);
  });

  describe('migration parity', () => {
    const migrationsDir = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'prisma',
      'migrations',
    );
    // Concatenate the full migration chain in version order; later migrations
    // intentionally re-state the complete role mappings they change.
    const sql = fs
      .readdirSync(migrationsDir)
      .filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory())
      .sort()
      .map((entry) => fs.readFileSync(path.join(migrationsDir, entry, 'migration.sql'), 'utf8'))
      .join('\n');

    const parseRoleMappings = (): Record<string, string[]> => {
      const rolePattern =
        /r\."name" = '([^']+)'\s+AND \(p\."resource" \|\| '\.' \|\| p\."action"\) IN \(([^)]+)\)/g;
      const parsed: Record<string, string[]> = {};
      let match: RegExpExecArray | null;
      while ((match = rolePattern.exec(sql)) !== null) {
        parsed[match[1]] = [...match[2].matchAll(/'([^']+)'/g)].map((entry) => entry[1]).sort();
      }
      return parsed;
    };

    it('exports every catalog permission in the SQL migration', () => {
      for (const permission of PERMISSION_DEFINITIONS) {
        expect(sql).toContain(`'${permission.action}', '${permission.resource}'`);
      }
    });

    it('matches the SQL role → permission mapping for every role', () => {
      const parsed = parseRoleMappings();
      for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
        expect(parsed[roleName] ?? []).toEqual([...permissionKeys].sort());
      }
    });
  });
});
