/* Bulk import: VERIFIED curricula -> programs/courses/curricula.
 * Prod-safe: idempotent upserts, per-program transactions, dry-run mode.
 * Usage:
 *   npx ts-node prisma/seed-curricula.ts --dry-run
 *   npx ts-node prisma/seed-curricula.ts --apply
 * Never runs destructive deletes. Preserves §10 source anomalies.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const prisma = new PrismaClient();

type Row = {
  code: string | null; title: string | null; lec: number | null; lab: number | null;
  units: number | null; prereq: string | null; subjectArea: string | null; catNo: string | null;
  yearLevel: number | null; termNumber: number | null; termLabel: string; sourceTotal: string | null;
};
type Program = {
  code: string; heading: string; effectiveYear: number; schoolYear: string;
  cmo: string | null; sourceFile: string | null; courses: Row[];
};

const PROGRAM_NAMES: Record<string, string> = {
  'BSMA': 'Bachelor of Science in Multimedia Arts',
  'BSCS': 'Bachelor of Science in Computer Science',
  'BSCrim': 'Bachelor of Science in Criminology',
  'BSEd-Fil-2026': 'Bachelor of Secondary Education Major in Filipino (2026)',
  'BSOA': 'Bachelor of Science in Office Administration',
  'BSEd-Fil-2024': 'Bachelor in Secondary Major in Filipino (2024)',
  'BSEd-Math': 'Bachelor in Secondary Major in Mathematics',
  'BSEd-Eng': 'Bachelor in Secondary Major in English',
  'BEED': 'Bachelor of Elementary Education',
};

function synthCode(programCode: string, title: string): string {
  const slug = title.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  return `${programCode}-${slug || 'ELECTIVE'}`;
}
function splitPrereqs(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[,;]/).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
}

async function main() {
  const payload = JSON.parse(readFileSync(join(__dirname, 'curricula-verified.json'), 'utf8'));
  const programs: Program[] = payload.programs;
  console.log(`Source: ${payload.sourceDoc} sha=${payload.sourceSha256.slice(0, 12)} programs=${programs.length} rows=${payload.totalRows} mode=${DRY ? 'DRY-RUN' : 'APPLY'}`);

  let totalCourses = 0, totalLinks = 0, totalUnresolved = 0, totalSelfRef = 0;

  for (const p of programs) {
    const name = PROGRAM_NAMES[p.code] ?? p.heading;
    if (DRY) {
      console.log(`[dry] Program ${p.code} | ${name} | eff=${p.effectiveYear} courses=${p.courses.length}`);
      totalCourses += p.courses.length;
      for (const r of p.courses) {
        for (const req of splitPrereqs(r.prereq)) {
          totalLinks++;
          const selfCodes = splitPrereqs(r.prereq);
          if (r.code && selfCodes.includes(r.code)) totalSelfRef++;
        }
      }
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const program = await tx.program.upsert({
        where: { code: p.code },
        update: { name },
        create: { code: p.code, name },
      });
      const curriculum = await tx.curriculum.upsert({
        where: { programId_effectiveYear: { programId: program.id, effectiveYear: p.effectiveYear } },
        update: { schoolYear: p.schoolYear, cmo: p.cmo, sourceFile: p.sourceFile },
        create: { programId: program.id, effectiveYear: p.effectiveYear, schoolYear: p.schoolYear, cmo: p.cmo, sourceFile: p.sourceFile },
      });

      // Upsert courses first (need IDs for prereq resolution within same curriculum)
      const codeToId = new Map<string, string[]>(); // code -> courseIds (duplicates possible)
      for (const r of p.courses) {
        if (!r.title) continue;
        const code = r.code ?? synthCode(p.code, r.title);
        const course = await tx.course.upsert({
          where: { code_title: { code, title: r.title } },
          update: { units: r.units ?? 0, lecUnits: r.lec ?? 0, labUnits: r.lab ?? 0, subjectArea: r.subjectArea, catNo: r.catNo, prereqText: r.prereq },
          create: { code, title: r.title, units: r.units ?? 0, lecUnits: r.lec ?? 0, labUnits: r.lab ?? 0, subjectArea: r.subjectArea, catNo: r.catNo, prereqText: r.prereq },
        });
        const arr = codeToId.get(code) ?? [];
        arr.push(course.id);
        codeToId.set(code, arr);
        totalCourses++;

        await tx.curriculumCourse.upsert({
          where: { curriculumId_courseId: { curriculumId: curriculum.id, courseId: course.id } },
          update: { yearLevel: r.yearLevel ?? 1, semester: r.termNumber ?? 1, termNumber: r.termNumber, termLabel: r.termLabel, sourceTotal: r.sourceTotal },
          create: { curriculumId: curriculum.id, courseId: course.id, yearLevel: r.yearLevel ?? 1, semester: r.termNumber ?? 1, termNumber: r.termNumber, termLabel: r.termLabel, sourceTotal: r.sourceTotal },
        });
      }

      // Resolve prereqs within this curriculum's course set
      for (const r of p.courses) {
        if (!r.title) continue;
        const code = r.code ?? synthCode(p.code, r.title);
        const ids = codeToId.get(code);
        if (!ids?.length) continue;
        const courseId = ids[0];
        for (const req of splitPrereqs(r.prereq)) {
          totalLinks++;
          const targets = codeToId.get(req) ?? codeToId.get(req.replace(/\s+/g, '')) ?? [];
          const isSelf = req === code;
          if (isSelf) totalSelfRef++;
          const requiresId = targets.find((id) => id !== courseId) ?? (isSelf ? courseId : targets[0] ?? null);
          const isUnresolved = !requiresId;
          if (isUnresolved) totalUnresolved++;
          await tx.coursePrerequisite.upsert({
            where: { courseId_requiresCode: { courseId, requiresCode: req } },
            update: { requiresId, isSelfReference: isSelf, isUnresolved, note: isSelf ? 'source self-reference preserved (§10)' : isUnresolved ? 'code not in same curriculum; preserved verbatim' : null },
            create: { courseId, requiresCode: req, requiresId, isSelfReference: isSelf, isUnresolved, note: isSelf ? 'source self-reference preserved (§10)' : isUnresolved ? 'code not in same curriculum; preserved verbatim' : null },
          });
        }
      }
    });
    console.log(`[ok] ${p.code}: ${p.courses.length} rows committed`);
  }

  console.log(`Done. courses upserted=${totalCourses} prereqLinks=${totalLinks} selfRef=${totalSelfRef} unresolved=${totalUnresolved}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
