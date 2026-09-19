
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:SispDb!CpX11J0sM5YSMHXsItjzTt6XBEgYCfm99x@db.txbjlhjijafazifhihgp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require' } } });
async function run() {
  try { await prisma.$executeRawUnsafe('ALTER TABLE curriculum_courses DROP CONSTRAINT curriculum_courses_curriculum_id_course_id_key;'); } catch(e) { console.log(e.message) }
  console.log('Success');
}
run().catch(console.error);

