import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { DOCUMENT_CATALOG } from '../src/common/constants/document-catalog';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Supabase database seeding...');

  const localDemoPassword = process.env.LOCAL_DEMO_PASSWORD || 'local-demo-only';
  const mockPasswordHash = await bcrypt.hash(localDemoPassword, 10);

  // 1. Seed Roles
  const rolesData = [
    { id: 'role-id-admin_staff', name: 'admin_staff' },
    { id: 'role-id-dean', name: 'dean' },
    { id: 'role-id-faculty', name: 'faculty' },
    { id: 'role-id-student', name: 'student' },
    { id: 'role-id-sys_admin', name: 'sys_admin' },
    { id: 'role-id-live_agent', name: 'live_agent' },
  ];

  for (const role of rolesData) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name },
      create: { id: role.id, name: role.name },
    });
  }
  console.log('Roles seeded successfully.');

  // 2. Seed Users
  const usersData = [
    {
      id: 'mock-admin-id',
      email: 'admin@rmc.edu.ph',
      passwordHash: mockPasswordHash,
      firstName: 'Regis',
      lastName: 'Admin',
      roleId: 'role-id-admin_staff',
    },
    {
      id: 'mock-dean-id',
      email: 'dean@rmc.edu.ph',
      passwordHash: mockPasswordHash,
      firstName: 'Regis',
      lastName: 'Dean',
      roleId: 'role-id-dean',
    },
    {
      id: 'mock-sysadmin-id',
      email: 'sysadmin@rmc.edu.ph',
      passwordHash: mockPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      roleId: 'role-id-sys_admin',
    },
    {
      id: 'mock-live-agent-id',
      email: 'agent@rmc.edu.ph',
      passwordHash: mockPasswordHash,
      firstName: 'Support',
      lastName: 'Agent',
      roleId: 'role-id-live_agent',
    },
  ];

  for (const user of usersData) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
      },
      create: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        mustChangePassword: false,
      },
    });
  }
  console.log('User accounts seeded successfully.');

  for (const item of DOCUMENT_CATALOG) {
    await prisma.documentCatalogItem.upsert({
      where: { code: item.code },
      update: {
        label: item.label,
        fee: item.fee,
        sortOrder: item.sortOrder,
        isActive: true,
      },
      create: {
        id: item.id,
        code: item.code,
        label: item.label,
        fee: item.fee,
        sortOrder: item.sortOrder,
        isActive: true,
      },
    });
  }
  console.log('Document catalog seeded successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seeding completed successfully!');
  })
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
