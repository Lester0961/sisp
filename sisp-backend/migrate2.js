
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:SispDb!CpX11J0sM5YSMHXsItjzTt6XBEgYCfm99x@db.txbjlhjijafazifhihgp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require' } } });
async function run() {
  try { await prisma.$executeRawUnsafe('ALTER TABLE curricula ADD CONSTRAINT curricula_program_id_effective_year_key UNIQUE (program_id, effective_year);'); } catch(e) { console.log(e.message) }
  try { await prisma.$executeRawUnsafe('ALTER TABLE courses ADD CONSTRAINT courses_code_title_key UNIQUE (code, title);'); } catch(e) { console.log(e.message) }
  try { await prisma.$executeRawUnsafe('ALTER TABLE curriculum_courses ADD CONSTRAINT curriculum_courses_curriculum_id_course_id_key UNIQUE (curriculum_id, course_id);'); } catch(e) { console.log(e.message) }
  console.log('Success');
}
run().catch(console.error);

