import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { PermissionService } from './permission.service';

describe('PermissionsGuard (Phase 2, P2-03)', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const permissionService = {
    hasAllPermissions: jest.fn(),
  } as unknown as PermissionService;

  const contextFor = (role?: string): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    }) as unknown as ExecutionContext;

  let guard: PermissionsGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PermissionsGuard(reflector, permissionService);
  });

  it('allows routes without required permissions', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    await expect(guard.canActivate(contextFor('student'))).resolves.toBe(true);
    expect(permissionService.hasAllPermissions).not.toHaveBeenCalled();
  });

  it('fails closed when no authenticated role is present', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['user.manage']);
    await expect(guard.canActivate(contextFor(undefined))).resolves.toBe(false);
    expect(permissionService.hasAllPermissions).not.toHaveBeenCalled();
  });

  it('delegates role + required permissions to the permission service', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['audit.read']);
    (permissionService.hasAllPermissions as jest.Mock).mockResolvedValue(true);

    await expect(guard.canActivate(contextFor('sys_admin'))).resolves.toBe(true);
    expect(permissionService.hasAllPermissions).toHaveBeenCalledWith('sys_admin', ['audit.read']);
  });

  it('denies when the permission service denies', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['audit.read']);
    (permissionService.hasAllPermissions as jest.Mock).mockResolvedValue(false);

    await expect(guard.canActivate(contextFor('student'))).resolves.toBe(false);
  });
});
