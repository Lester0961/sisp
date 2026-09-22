"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* Bulk import: VERIFIED curricula -> programs/courses/curricula.
 * Prod-safe: idempotent upserts, per-program transactions, dry-run mode.
 * Usage:
 *   npx ts-node prisma/seed-curricula.ts --dry-run
 *   npx ts-node prisma/seed-curricula.ts --apply
 * Never runs destructive deletes. Preserves §10 source anomalies.
 */
const client_1 = require("@prisma/client");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const DRY = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
const prisma = new client_1.PrismaClient();
const PROGRAM_NAMES = {
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
function synthCode(programCode, title) {
    const slug = title.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    return `${programCode}-${slug || 'ELECTIVE'}`;
}
function splitPrereqs(raw) {
    if (!raw)
        return [];
    return raw.split(/[,;]/).map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
}
async function main() {
    const payload = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, 'curricula-verified.json'), 'utf8'));
    const programs = payload.programs;
    console.log(`Source: ${payload.sourceDoc} sha=${payload.sourceSha256.slice(0, 12)} programs=${programs.length} rows=${payload.totalRows} mode=${DRY ? 'DRY-RUN' : 'APPLY'}`);
    let totalCourses = 0, totalLinks = 0, totalUnresolved = 0, totalSelfRef = 0;
    let missingCourseCodes = 0, missingLabUnits = 0;
    for (const p of programs) {
        const name = PROGRAM_NAMES[p.code] ?? p.heading;
        if (DRY) {
            console.log(`[dry] Program ${p.code} | ${name} | eff=${p.effectiveYear} courses=${p.courses.length}`);
            totalCourses += p.courses.length;
            const sourceCodeSet = new Set(p.courses.filter((row) => row.code).map((row) => row.code));
            for (const r of p.courses) {
                if (!r.code)
                    missingCourseCodes++;
                if (r.lab === null)
                    missingLabUnits++;
                const courseCode = r.code ?? synthCode(p.code, r.title ?? '');
                for (const req of splitPrereqs(r.prereq)) {
                    totalLinks++;
                    if (req === courseCode)
                        totalSelfRef++;
                    if (!sourceCodeSet.has(req) && !sourceCodeSet.has(req.replace(/\s+/g, '')))
                        totalUnresolved++;
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
            const codeToId = new Map(); // code -> courseIds (duplicates possible)
            for (const r of p.courses) {
                if (!r.title)
                    continue;
                if (!r.code)
                    missingCourseCodes++;
                if (r.lab === null)
                    missingLabUnits++;
                const isCodeSynthesized = !r.code;
                const code = r.code ?? synthCode(p.code, r.title);
                const course = await tx.course.upsert({
                    where: { code_title: { code, title: r.title } },
                    update: { isCodeSynthesized, units: r.units ?? 0, lecUnits: r.lec ?? 0, labUnits: r.lab ?? null, subjectArea: r.subjectArea, catNo: r.catNo, prereqText: r.prereq },
                    create: { code, isCodeSynthesized, title: r.title, units: r.units ?? 0, lecUnits: r.lec ?? 0, labUnits: r.lab ?? null, subjectArea: r.subjectArea, catNo: r.catNo, prereqText: r.prereq },
                });
                const arr = codeToId.get(code) ?? [];
                arr.push(course.id);
                codeToId.set(code, arr);
                totalCourses++;
                await tx.curriculumCourse.upsert({
                    where: { curriculumId_courseId: { curriculumId: curriculum.id, courseId: course.id } },
                    update: { yearLevel: r.yearLevel ?? 1, semester: r.termNumber ?? 1, termNumber: r.termNumber, termLabel: r.termLabel, sourceUnits: r.units ?? 0, sourceLecUnits: r.lec ?? 0, sourceLabUnits: r.lab, sourceTotal: r.sourceTotal },
                    create: { curriculumId: curriculum.id, courseId: course.id, yearLevel: r.yearLevel ?? 1, semester: r.termNumber ?? 1, termNumber: r.termNumber, termLabel: r.termLabel, sourceUnits: r.units ?? 0, sourceLecUnits: r.lec ?? 0, sourceLabUnits: r.lab, sourceTotal: r.sourceTotal },
                });
            }
            // Resolve prereqs within this curriculum's course set
            for (const r of p.courses) {
                if (!r.title)
                    continue;
                const code = r.code ?? synthCode(p.code, r.title);
                const ids = codeToId.get(code);
                if (!ids?.length)
                    continue;
                const courseId = ids[0];
                for (const req of splitPrereqs(r.prereq)) {
                    totalLinks++;
                    const targets = codeToId.get(req) ?? codeToId.get(req.replace(/\s+/g, '')) ?? [];
                    const isSelf = req === code;
                    if (isSelf)
                        totalSelfRef++;
                    const requiresId = targets.find((id) => id !== courseId) ?? (isSelf ? courseId : targets[0] ?? null);
                    const isUnresolved = !requiresId;
                    if (isUnresolved)
                        totalUnresolved++;
                    await tx.coursePrerequisite.upsert({
                        where: { courseId_requiresCode: { courseId, requiresCode: req } },
                        update: { requiresId, isSelfReference: isSelf, isUnresolved, note: isSelf ? 'source self-reference preserved (§10)' : isUnresolved ? 'code not in same curriculum; preserved verbatim' : null },
                        create: { courseId, requiresCode: req, requiresId, isSelfReference: isSelf, isUnresolved, note: isSelf ? 'source self-reference preserved (§10)' : isUnresolved ? 'code not in same curriculum; preserved verbatim' : null },
                    });
                }
            }
        }, { maxWait: 30000, timeout: 120000 });
        console.log(`[ok] ${p.code}: ${p.courses.length} rows committed`);
    }
    console.log(`Done. courseRows=${totalCourses} prereqLinks=${totalLinks} selfRef=${totalSelfRef} unresolved=${totalUnresolved} sourceCodesMissing=${missingCourseCodes} labUnitsMissing=${missingLabUnits}`);
}
main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
