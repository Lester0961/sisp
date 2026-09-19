import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Resolves authenticated user role → role permissions → action/resource
 * (Phase 2, P2-02). Role permission sets are cached per role because they are
 * reviewed, migration-managed configuration. Failures resolve to an empty set
 * (fail closed) so a database problem can never grant access.
 */
@Injectable()
export class PermissionService {
  private readonly cache = new Map<string, Set<string>>();

  constructor(private readonly prisma: PrismaService) {}

  async getPermissionsForRole(roleName: string | undefined | null): Promise<Set<string>> {
    if (!roleName) return new Set();

    const cached = this.cache.get(roleName);
    if (cached) return cached;

    let resolved = new Set<string>();
    try {
      const rows: any[] = await this.prisma.rolePermission.findMany({
        where: { role: { name: roleName } },
        include: { permission: true },
      });
      resolved = new Set(
        rows
          .filter((row) => row?.permission?.resource && row?.permission?.action)
          .map((row) => `${row.permission.resource}.${row.permission.action}`),
      );
    } catch {
      resolved = new Set();
    }

    this.cache.set(roleName, resolved);
    return resolved;
  }

  async hasPermission(roleName: string | undefined | null, permission: string): Promise<boolean> {
    const permissions = await this.getPermissionsForRole(roleName);
    return permissions.has(permission);
  }

  async hasAllPermissions(
    roleName: string | undefined | null,
    required: string[],
  ): Promise<boolean> {
    if (!required.length) return true;
    const permissions = await this.getPermissionsForRole(roleName);
    return required.every((permission) => permissions.has(permission));
  }

  invalidate(roleName?: string): void {
    if (roleName) {
      this.cache.delete(roleName);
      return;
    }
    this.cache.clear();
  }
}
