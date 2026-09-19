const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: "postgresql://postgres:SispDb!CpX11J0sM5YSMHXsItjzTt6XBEgYCfm99x@db.txbjlhjijafazifhihgp.supabase.co:6543/postgres?pgbouncer=true&sslmode=require" } } });
async function run() {
  try {
    await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL,
  requires_code TEXT NOT NULL,
  requires_id UUID,
  is_self_reference BOOLEAN DEFAULT false,
  is_unresolved BOOLEAN DEFAULT false,
  note TEXT,
  CONSTRAINT course_prerequisites_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT course_prerequisites_requires_id_fkey FOREIGN KEY (requires_id) REFERENCES courses(id) ON DELETE SET NULL,
  CONSTRAINT course_prerequisites_course_id_requires_code_key UNIQUE (course_id, requires_code)
);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS course_prerequisites_course_id_idx ON course_prerequisites(course_id);`);
  } catch(e) { console.log(e.message) }
  console.log("Success");
}
run().catch(console.error);
