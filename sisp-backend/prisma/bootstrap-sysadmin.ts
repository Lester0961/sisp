/** One-time bootstrap for the explicitly requested initial Sysadmin account. */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SYSADMIN_INITIAL_PASSWORD;
  if (!password) throw new Error('Set SYSADMIN_INITIAL_PASSWORD in the private process environment.');
  if (password.length < 8) throw new Error('The initial password must be at least 8 characters.');

  const existingUserCount = await prisma.user.count();
  if (existingUserCount !== 0) {
    throw new Error(`Bootstrap requires an empty users table; found ${existingUserCount} user(s). No changes made.`);
  }

  const role = await prisma.role.findUnique({ where: { name: 'sys_admin' } });
  if (!role) throw new Error('The canonical sys_admin role is missing. Apply the reviewed reference migration first.');

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email: 'sysadmin@gmail.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      roleId: role.id,
      isActive: true,
      mustChangePassword: true,
    },
  });

  console.log('Created the single requested sysadmin@gmail.com account. Password change is required at first login.');
}

main()
  .catch((error) => {
    console.error('Sysadmin bootstrap failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
