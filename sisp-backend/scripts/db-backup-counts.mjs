// Read-only backup: row counts + program list snapshot -> scripts/backup-counts-<ts>.json
// No writes. Safe to run against live Supabase via .env pooler.
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';

const p = new PrismaClient();
const safe = async (fn) => { try { return await fn(); } catch (e) { return `ERR:${e.message.slice(0, 120)}`; } };
const out = {
  at: new Date().toISOString(),
  programs: await safe(() => p.program.findMany({ select: { code: true, name: true } })),
  counts: {
    programs: await safe(() => p.program.count()),
    courses: await safe(() => p.course.count()),
    curricula: await safe(() => p.curriculum.count()),
    curriculumCourses: await safe(() => p.curriculumCourse.count()),
    coursePrerequisites: await safe(() => p.coursePrerequisite.count()),
    enrollments: await safe(() => p.enrollment.count()),
    grades: await safe(() => p.grade.count()),
    users: await safe(() => p.user.count()),
    academicTerms: await safe(() => p.academicTerm.count()),
  },
};
const fname = `scripts/backup-counts-${Date.now()}.json`;
writeFileSync(fname, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.counts));
console.log(`saved ${fname}`);
await p.$disconnect();
