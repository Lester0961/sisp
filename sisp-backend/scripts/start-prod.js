const { spawnSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function ensureSysadmin() {
  console.log('--- ENSURING SYSADMIN ACCOUNT ---');
  try {
    const prisma = new PrismaClient();
    const hash = await bcrypt.hash('local-demo-only', 10);
    
    // First ensure the role exists
    await prisma.role.upsert({
      where: { name: 'sys_admin' },
      update: {},
      create: { id: 'role-id-sys_admin', name: 'sys_admin', description: 'System Administrator', permissions: {} }
    });
    
    // Then upsert the user
    await prisma.user.upsert({
      where: { email: 'sysadmin@rmc.edu.ph' },
      update: { passwordHash: hash, isActive: true },
      create: {
        id: 'mock-sysadmin-id',
        email: 'sysadmin@rmc.edu.ph',
        passwordHash: hash,
        firstName: 'System',
        lastName: 'Administrator',
        roleId: 'role-id-sys_admin',
        isActive: true,
      }
    });
    console.log('Sysadmin account guaranteed to exist with default password.');
    await prisma.$disconnect();
  } catch (err) {
    console.error('Failed to ensure sysadmin:', err);
  }
}

async function main() {
  console.log('--- RUNNING DB PUSH ---');
  spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], { stdio: 'inherit' });
  
  console.log('--- RUNNING DB SEED ---');
  spawnSync('npx', ['prisma', 'db', 'seed'], { stdio: 'inherit' });
  
  console.log('--- RUNNING CURRICULA SEED ---');
  spawnSync('npx', ['ts-node', 'prisma/seed-curricula.ts', '--apply'], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } });
  
  await ensureSysadmin();
  
  console.log('--- STARTING SERVER ---');
  const server = spawnSync('node', ['dist/main.js'], { stdio: 'inherit' });
  process.exit(server.status !== null ? server.status : 1);
}

main();
