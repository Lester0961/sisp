
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:SispDb!CpX11J0sM5YSMHXsItjzTt6XBEgYCfm99x@db.txbjlhjijafazifhihgp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require' } } });
async function run() {
  try { await prisma.$executeRawUnsafe('ALTER TABLE courses ADD COLUMN IF NOT EXISTS lec_units INTEGER DEFAULT 0;'); } catch(e) { console.log(e.message) }
  try { await prisma.$executeRawUnsafe('ALTER TABLE courses ADD COLUMN IF NOT EXISTS lab_units INTEGER DEFAULT 0;'); } catch(e) { console.log(e.message) }
  try { await prisma.$executeRawUnsafe('ALTER TABLE courses ADD COLUMN IF NOT EXISTS subject_area TEXT;'); } catch(e) { console.log(e.message) }
  try { await prisma.$executeRawUnsafe('ALTER TABLE courses ADD COLUMN IF NOT EXISTS cat_no TEXT;'); } catch(e) { console.log(e.message) }
  try { await prisma.$executeRawUnsafe('ALTER TABLE courses ADD COLUMN IF NOT EXISTS prereq_text TEXT;'); } catch(e) { console.log(e.message) }
  
  try { await prisma.$executeRawUnsafe('ALTER TABLE curriculum_courses ADD COLUMN IF NOT EXISTS term_number INTEGER;'); } catch(e) { console.log(e.message) }
  try { await prisma.$executeRawUnsafe('ALTER TABLE curriculum_courses ADD COLUMN IF NOT EXISTS term_label TEXT;'); } catch(e) { console.log(e.message) }
  try { await prisma.$executeRawUnsafe('ALTER TABLE curriculum_courses ADD COLUMN IF NOT EXISTS source_total TEXT;'); } catch(e) { console.log(e.message) }

  console.log('Success');
}
run().catch(console.error);

