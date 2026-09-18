// Parser: docs/Regis_Marie_College_All_Curricula_Compiled_VERIFIED.md
// -> prisma/curricula-verified.json (canonical, checksummed)
// Policy: preserve source verbatim. Blank => null. '—' => null marker kept as null.
// Never silently correct §10 anomalies; record them as warnings.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const MD = join(here, '../../docs/Regis_Marie_College_All_Curricula_Compiled_VERIFIED.md');
const OUT = join(here, '../prisma/curricula-verified.json');

const raw = readFileSync(MD, 'utf8');
const mdHash = createHash('sha256').update(raw).digest('hex');

const PROGRAM_CODE_MAP = [
  { match: /Multimedia Arts/i, code: 'BSMA', name: 'Bachelor of Science in Multimedia Arts' },
  { match: /Computer Science/i, code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
  { match: /Criminology/i, code: 'BSCrim', name: 'Bachelor of Science in Criminology' },
  { match: /Secondary Education.*Filipino/i, code: 'BSEd-Fil', name: 'Bachelor of Secondary Education Major in Filipino', years: ['2026'] },
  { match: /Office Administration/i, code: 'BSOA', name: 'Bachelor of Science in Office Administration' },
  { match: /^## 6\. /m, code: 'BSEd-Fil-2024', name: 'Bachelor in Secondary Major in Filipino' },
  { match: /Major in Mathematics/i, code: 'BSEd-Math', name: 'Bachelor in Secondary Major in Mathematics' },
  { match: /Major in English/i, code: 'BSEd-Eng', name: 'Bachelor in Secondary Major in English' },
  { match: /Elementary Education/i, code: 'BEED', name: 'Bachelor of Elementary Education' },
];

function parseYearLevel(label) {
  const m = label.match(/(First|Second|Third|Fourth)\s+Year/i);
  if (!m) return null;
  return { First: 1, Second: 2, Third: 3, Fourth: 4 }[m[1]];
}
function parseTermNumber(label) {
  const m = label.match(/(First|Second|Third)\s+(Term|Trimester)/i);
  if (!m) return null;
  return { First: 1, Second: 2, Third: 3 }[m[1]];
}
function numOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s === '—' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function textOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s === '—') return null;
  if (s === '-') return null;
  return s;
}

const lines = raw.split('\n');
const programs = [];
let current = null;
let currentTerm = null;

const sectionRe = /^## (\d+)\. (.+)$/;
const termRe = /^### (.+)$/;
const metaRe = /^-\s+\*\*(.+?):\*\*\s*(.*)$/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const sec = line.match(sectionRe);
  if (sec) {
    const num = Number(sec[1]);
    if (num >= 1 && num <= 9) {
      if (current) programs.push(current);
      current = { section: num, heading: sec[2].trim(), meta: {}, terms: [], totals: [] };
      currentTerm = null;
      continue;
    } else if (num === 10) {
      if (current) { programs.push(current); current = null; }
      break;
    }
  }
  if (!current) continue;
  const mm = line.match(metaRe);
  if (mm && !currentTerm) {
    current.meta[mm[1].trim()] = mm[2].trim();
    continue;
  }
  const tm = line.match(termRe);
  if (tm) {
    currentTerm = { label: tm[1].trim(), yearLevel: parseYearLevel(tm[1]), termNumber: parseTermNumber(tm[1]), rows: [], sourceTotal: null };
    current.terms.push(currentTerm);
    continue;
  }
  // table rows
  if (currentTerm && line.trim().startsWith('|')) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (/^-+/.test(cells[0]) || /^Course (Code|Title)/i.test(cells[0]) || /^Subject Area/i.test(cells[0])) continue; // header/separator
    if (cells.length < 5) continue;
    currentTerm.rows.push(cells);
    continue;
  }
  // source total lines
  const st = line.match(/\*\*Source total:\*\*\s*(.+)/) || line.match(/\*\*Total Academic Units stated in source:\*\*\s*(.+)/);
  if (st) {
    if (line.includes('Total Academic Units')) current.totals.push({ type: 'program', text: st[1].trim() });
    else if (currentTerm) currentTerm.sourceTotal = st[1].trim();
    continue;
  }
}
if (current) programs.push(current);

// Normalize rows into course objects using per-term header inference.
// Re-scan to capture headers: simpler heuristic based on column count.
function normalizeProgram(p) {
  const courses = [];
  for (const t of p.terms) {
    for (const cells of t.rows) {
      // Two shapes:
      // A: Course Code | Title | LEC | LAB | Units | Prereq (6)
      // B: Subject Area | Cat No | Title | LEC | LAB | Units | Prereq (7)
      let rec;
      if (cells.length === 6) {
        rec = { code: textOrNull(cells[0]), title: textOrNull(cells[1]), lec: numOrNull(cells[2]), lab: numOrNull(cells[3]), units: numOrNull(cells[4]), prereq: textOrNull(cells[5]), subjectArea: null, catNo: null };
      } else if (cells.length >= 7) {
        rec = { code: cells[1] && cells[1] !== '—' ? `${textOrNull(cells[0]) ?? ''} ${textOrNull(cells[1]) ?? ''}`.trim() : textOrNull(cells[0]), title: textOrNull(cells[2]), lec: numOrNull(cells[3]), lab: numOrNull(cells[4]), units: numOrNull(cells[5]), prereq: textOrNull(cells[6]), subjectArea: textOrNull(cells[0]), catNo: textOrNull(cells[1]) };
        // Special: rows like "— | — | Visual Computing" keep title, code null
        if (cells[0] === '—' && cells[1] === '—') { rec.code = null; rec.subjectArea = null; rec.catNo = null; }
      } else continue;
      // Skip empty-code+empty-title rows (e.g. 4th year blank trailing)
      if (!rec.code && !rec.title) continue;
      courses.push({ ...rec, yearLevel: t.yearLevel, termNumber: t.termNumber, termLabel: t.label, sourceTotal: t.sourceTotal });
    }
  }
  return courses;
}

const warnings = [];
const outPrograms = programs.map((p) => {
  const courses = normalizeProgram(p);
  // validation: per-term unit sums vs sourceTotal text (informational only)
  for (const t of p.terms) {
    const rows = courses.filter((c) => c.termLabel === t.label);
    const sumUnits = rows.reduce((s, r) => s + (r.units ?? 0), 0);
    const m = (t.sourceTotal || '').match(/(\d+)\s*unit/i);
    if (m && Number(m[1]) !== sumUnits) {
      warnings.push({ program: p.heading, term: t.label, sourceTotal: t.sourceTotal, computedUnits: sumUnits, note: 'sum != printed total; preserved as-is per §10' });
    }
  }
  return {
    section: p.section,
    heading: p.heading,
    effective: p.meta['Effective'] ?? null,
    cmo: p.meta['CMO'] ?? null,
    sourceFile: p.meta['Source file'] ? p.meta['Source file'].replace(/`/g, '') : null,
    programTotals: p.totals,
    courseCount: courses.length,
    courses,
  };
});

// Assign final program codes (disambiguate the two BSEd-Filipino docs by year)
const finalPrograms = outPrograms.map((p) => {
  let code = `SEC${p.section}`;
  if (p.section === 1) code = 'BSMA';
  if (p.section === 2) code = 'BSCS';
  if (p.section === 3) code = 'BSCrim';
  if (p.section === 4) code = 'BSEd-Fil-2026';
  if (p.section === 5) code = 'BSOA';
  if (p.section === 6) code = 'BSEd-Fil-2024';
  if (p.section === 7) code = 'BSEd-Math';
  if (p.section === 8) code = 'BSEd-Eng';
  if (p.section === 9) code = 'BEED';
  const effYear = /2026/i.test(p.effective ?? '') ? 2026 : /2024/i.test(p.effective ?? '') ? 2024 : (p.section === 5 ? 2024 : 2026);
  return { code, effectiveYear: effYear, schoolYear: (p.effective ?? '').replace('SY ', ''), ...p };
});

const totalCourses = finalPrograms.reduce((s, p) => s + p.courseCount, 0);
const payload = {
  generatedAt: new Date().toISOString(),
  sourceDoc: 'docs/Regis_Marie_College_All_Curricula_Compiled_VERIFIED.md',
  sourceSha256: mdHash,
  programCount: finalPrograms.length,
  totalRows: totalCourses,
  warnings,
  programs: finalPrograms,
};
writeFileSync(OUT, JSON.stringify(payload, null, 2));
console.log(`Parsed ${finalPrograms.length} programs, ${totalCourses} rows -> ${OUT}`);
console.log(`Warnings (preserved anomalies): ${warnings.length}`);
for (const w of warnings.slice(0, 20)) console.log(` - ${w.program} | ${w.term} | src="${w.sourceTotal}" computed=${w.computedUnits}`);
const checksum = createHash('sha256').update(JSON.stringify(payload.programs)).digest('hex').slice(0, 16);
console.log(`programs checksum: ${checksum}`);
