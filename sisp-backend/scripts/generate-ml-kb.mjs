// Generate ML knowledge-base curriculum files from canonical JSON.
// Outputs: sisp-ml/app/data/knowledge_base/curriculum_<CODE>_<YEAR>.txt + program_catalog.txt
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(here, '../prisma/curricula-verified.json');
const KB = join(here, '../../sisp-ml/app/data/knowledge_base');

const payload = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const lines = [];
lines.push('REGIS MARIE COLLEGE PROGRAM CATALOG — VERIFIED SOURCE');
lines.push(`Source: docs/Regis_Marie_College_All_Curricula_Compiled_VERIFIED.md sha=${payload.sourceSha256.slice(0, 12)}`);
lines.push(`Generated: ${payload.generatedAt} | programs=${payload.programCount} rows=${payload.totalRows}`);
lines.push('');
lines.push('RMC runs three academic terms per year: Term 1, Term 2, Term 3. Assessment periods per term: Prelim, Midterm, Finals.');
lines.push('');
for (const p of payload.programs) {
  lines.push(`- ${p.code}: ${p.heading} | Effective ${p.schoolYear} | CMO ${p.cmo ?? 'n/a'} | ${p.courseCount} courses | file curriculum_${p.code}_${p.effectiveYear}.txt`);
}
lines.push('');
lines.push('Course sequences, units, and prerequisites below are registrar-verified. ARIA may cite specific course-to-term assignments from the per-program files.');
writeFileSync(join(KB, 'program_catalog.txt'), lines.join('\n'));
console.log('wrote program_catalog.txt');

for (const p of payload.programs) {
  const out = [];
  out.push(`${p.heading} (${p.code}) — Effective ${p.schoolYear} | ${p.cmo ?? ''} | Source: ${p.sourceFile ?? ''}`.trim());
  out.push(`Total courses: ${p.courseCount}`);
  for (const t of [...new Set(p.courses.map((c) => c.termLabel))]) {
    out.push('');
    out.push(`${t}:`);
    for (const c of p.courses.filter((x) => x.termLabel === t)) {
      const prereq = c.prereq ? ` | Prereq: ${c.prereq}` : '';
      const units = `LEC ${c.lec ?? 0} LAB ${c.lab ?? 0} Units ${c.units ?? 0}`;
      out.push(`- ${c.code ?? '(no code)'} — ${c.title} | ${units}${prereq}`);
    }
  }
  const fname = `curriculum_${p.code}_${p.effectiveYear}.txt`;
  writeFileSync(join(KB, fname), out.join('\n'));
  console.log(`wrote ${fname}`);
}
