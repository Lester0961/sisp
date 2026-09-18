# Curricula Rollout Runbook (VERIFIED → Prod)

Source: `docs/Regis_Marie_College_All_Curricula_Compiled_VERIFIED.md`
Canonical: `sisp-backend/prisma/curricula-verified.json` (9 programs, 491 rows)
Branch: `feat/curricula-verified-import`

## Pre-deploy (staging + prod)
1. Backup Supabase: snapshot + `pg_dump`. Record counts:
   `programs, courses, curricula, curriculum_courses, course_prerequisites, enrollments, grades`.
2. Orphans: enrollments on `CS301/CS302/CS303/IT201` (mock-db dummies) — migrate or drop before import.
3. Env: `DIRECT_URL` (migrations) + `DATABASE_URL` pooler (runtime) must be set on Render. No secret values in repo.

## Deploy order
1. **DB migrate (staging first, then prod):**
   `npx prisma migrate deploy` — applies `20260919000000_curricula_verified_shape` (additive only, no deletes).
   Verify: `\d courses`, `\d course_prerequisites`, unique `(code,title)` exists.
2. **Regenerate client:** `npx prisma generate` (Render build does this fresh; local EPERM on locked DLL is environmental only).
3. **Base seed:** `npx ts-node prisma/seed.ts` — upserts 9+2 program codes (idempotent).
4. **Curricula import (dry-run first):**
   `node scripts/parse-verified-curricula.mjs` (regenerate JSON if MD changed)
   `npx ts-node prisma/seed-curricula.ts --dry-run` → expect 9 programs / 491 rows / 118 links / 3 self-refs
   `npx ts-node prisma/seed-curricula.ts --apply` → per-program transactions.
5. **Verify DB:** per-program counts (BSMA 52, BSCS 56, BSCrim 60, BSEd-Fil-2026 55, BSOA 50, BSEd-Fil-2024 55, BSEd-Math 55, BSEd-Eng 56, BEED 52).
   Smoke: `GET /curricula/by-program/BSCS`, `GET /curricula/me` as test student in each program → 200 with courses.
   Negative: enroll without prereq → `400 PREREQ_MISSING`; self-ref/unresolved prereqs never block.
6. **ML (Render FastAPI):** KB files already in repo (`program_catalog.txt` + 9x `curriculum_*.txt`, 151 lexical chunks verified).
   Trigger `POST /kb/reindex` (ML secret) to rebuild vector index + clear cache. Verify retrieval cites `curriculum_<CODE>` sources.
7. **Frontend (Vercel):** deploy with `NEXT_PUBLIC_API_URL/ML_URL` → Render prod. Verify `/curriculum` shows program header + LEC/LAB + prereqs, grouped Year/Term.

## Rollback
- Code: redeploy prior Vercel/Render builds.
- Data: restore Supabase snapshot (preferred). Surgical alternative: delete `curricula` rows by `sourceFile` + orphan `courses` with no enrollments — only if snapshot unavailable.
- Import is upsert-only; re-running `--apply` is safe.

## Post-deploy monitoring
- Render logs for `PREREQ_MISSING` spikes (students hitting new gates).
- Supabase slow queries — index `curriculum_courses(curriculum_id, year_level, term_number)` included in migration.
- Audit: registrar imports go through logged admin endpoints, not raw SQL.

## Test evidence (local, this branch)
- `prisma validate` ✅ | backend `tsc --noEmit` ✅ | frontend `tsc --noEmit` ✅
- `jest app.controller.spec` ✅ (full suite needs live Supabase — run on staging)
- Parser dry-run: 9/491/118/3 ✅ | ML KB lexical load: 15 files, 151 chunks ✅
- Migration NOT applied to prod from this machine (by design — apply via staging/prod pipeline).
