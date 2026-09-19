
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:SispDb!CpX11J0sM5YSMHXsItjzTt6XBEgYCfm99x@db.txbjlhjijafazifhihgp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require' } } });
async function run() {
  await prisma.$executeRawUnsafe('ALTER TABLE curricula ADD COLUMN IF NOT EXISTS school_year TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE curricula ADD COLUMN IF NOT EXISTS cmo TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE curricula ADD COLUMN IF NOT EXISTS source_file TEXT;');
  try { await prisma.$executeRawUnsafe('ALTER TABLE courses DROP CONSTRAINT courses_code_key;'); } catch(e) { console.log(e.message) }
  console.log('Success');
}
run().catch(console.error);

