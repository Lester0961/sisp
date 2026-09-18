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
    {
      id: 'mock-student-id',
      email: 'student@rmc.edu.ph',
      passwordHash: mockPasswordHash,
      firstName: 'John',
      lastName: 'Doe',
      roleId: 'role-id-student',
    },
    {
      id: 'mock-faculty-id',
      email: 'faculty@rmc.edu.ph',
      passwordHash: mockPasswordHash,
      firstName: 'Regis',
      lastName: 'Faculty',
      roleId: 'role-id-faculty',
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

  const programCatalog = [
    { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
    { code: 'BSOA', name: 'Bachelor of Science in Office Administration' },
    { code: 'BSMA', name: 'Bachelor of Science in Multimedia Arts' },
    { code: 'BSCrim', name: 'Bachelor of Science in Criminology' },
    { code: 'BEED', name: 'Bachelor of Elementary Education' },
    { code: 'BSEd-Math', name: 'Bachelor in Secondary Major in Mathematics' },
    { code: 'BSEd-Eng', name: 'Bachelor in Secondary Major in English' },
    // Disambiguated Filipino tracks (VERIFIED doc §§4,6). Legacy aliases kept below.
    { code: 'BSEd-Fil-2026', name: 'Bachelor of Secondary Education Major in Filipino (2026)' },
    { code: 'BSEd-Fil-2024', name: 'Bachelor in Secondary Major in Filipino (2024)' },
    // Legacy aliases (pre-verified catalog) — retained, do not assign new students.
    { code: 'BSEd-English', name: 'Bachelor of Secondary Education – English (legacy)' },
    { code: 'BSEd-Secondary', name: 'Bachelor of Secondary Education (legacy)' },
  ];

  for (const program of programCatalog) {
    await prisma.program.upsert({
      where: { code: program.code },
      update: { name: program.name },
      create: { code: program.code, name: program.name },
    });
  }

  for (const term of [1, 2, 3]) {
    await prisma.academicTerm.upsert({
      where: { code: `2026-2027-T${term}` },
      update: { label: `Term ${term}`, termNumber: term },
      create: {
        academicYear: '2026-2027',
        termNumber: term,
        code: `2026-2027-T${term}`,
        label: `Term ${term}`,
        status: term === 1 ? 'active' : 'planned',
        isCurrent: term === 1,
      },
    });
  }
  console.log('Program catalog and academic terms seeded successfully.');

  // Ensure demo student profile and treasury balance exist
  try {
    const bscsProgram = await prisma.program.findUnique({ where: { code: 'BSCS' } });
    if (bscsProgram) {
      const studentProfile = await prisma.studentProfile.upsert({
        where: { userId: 'mock-student-id' },
        update: { programId: bscsProgram.id },
        create: {
          id: 'mock-student-profile-id',
          userId: 'mock-student-id',
          studentNumber: 'RMC-2026-0001',
          programId: bscsProgram.id,
          yearLevel: 3,
        },
      });

      await prisma.accountBalance.upsert({
        where: { studentId: studentProfile.id },
        update: { balance: 12500.5 },
        create: {
          id: 'mock-balance-id',
          studentId: studentProfile.id,
          balance: 12500.5,
          status: 'active',
        },
      });
      console.log('Demo student profile and treasury balance seeded successfully.');
    }
  } catch (err) {
    console.error('Warning: Failed to seed demo student profile (user ID mismatch?)', err);
  }

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
