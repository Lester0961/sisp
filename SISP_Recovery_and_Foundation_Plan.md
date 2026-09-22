# SISP Recovery and Strong Foundation Plan

**Prepared:** 2026-09-20  
**Purpose:** Safely move SISP from the current deployed/local divergence to a secure, reviewable, thesis-ready release.  
**Scope:** engineering and database recovery plan only. This document does not authorize production mutations, deployments, account creation/deletion, or credential rotation.

## 1. Recommendation

**Do not force-push over `main`, delete repository branches, reset the database, or deploy the current dirty worktree wholesale.** Those actions do not resolve the underlying production schema, permissions, and migration-history mismatches; they could also discard recovery evidence or unrelated work.

Use a protected, reviewable release path:

1. Preserve the deployed commit and all existing branches as recovery points.
2. Snapshot and classify the large dirty worktree; never discard it with `git reset --hard` or blanket cleanup.
3. Separate the changes into small, dependency-ordered commits on a new remediation branch.
4. Fix and test security-sensitive code first without touching production data.
5. Independently reconcile the live DB schema and migration history, then baseline only after review.
6. Apply additive migrations and role-data changes to a staging clone first.
7. Verify the six role workflows and ARIA against staging, with synthetic test accounts and records.
8. Deploy one reviewed release at a time with monitored rollback steps.

The report found 178 changed/untracked paths at its capture time. That is too broad for a clean production push and requires triage before any commit. The current production code reference is `2d07a82e18c0ab460c8b7c866d71379c7ab4b4e1`; preserve it as the rollback anchor.

## 2. Hard Safety Rules

- Follow the existing master plan and state file. Phases 0–9 remain PASS and are not reopened without a demonstrated regression.
- Work one phase at a time. Record each phase’s scope, changed files, migration IDs, test evidence, unresolved issues, and exit decision.
- No production `db push`, reset, seed, broad SQL update/delete, destructive migration, or speculative RLS toggle.
- Follow **DEC-011** for the migration baseline: inspect schema/history; only mark migrations applied after proving each migration’s effects are already present. Baseline commands change migration metadata, so require a reviewed runbook and a staging rehearsal first.
- Follow **DEC-039**: no production DDL/data mutation, vector initialization, migration deployment, or production E2E writes until baseline and schema are reconciled and reviewed.
- Follow **DEC-001/005/012**: preserve account references; map `admin_staff` to `registrar` in place; assign Treasury only to financial duties. Never delete users to simplify role migration.
- Follow **DEC-009/010/014/015/017/018**: do not invent standing rules, schedule facts, enrollment interpretations, or assignment scope.
- Never place secrets in Git, command output, report text, or chat. A database connection string was exposed in an earlier tool output; treat it as compromised and rotate it through the provider’s secret-management path, not in source code.
- Keep demo accounts separate from real users; use unique generated secrets, forced change on first login, and staging-only synthetic records.
- After two materially different failed repairs of a task, stop, document diagnostics, and mark it BLOCKED rather than repeatedly changing code.

## 3. Phase Plan

### Phase A — Protect and inventory the current state

**Goal:** create recoverable evidence before modifying code.

**Actions**

1. Confirm `main` and deployed commit references. Tag or record the production commit and current release metadata; do not rewrite it.
2. Create a remediation branch from the current intended baseline with a clear name such as `codex/sisp-foundation-recovery`.
3. Save the current worktree diff and untracked-file inventory outside the repository as a review artifact. Do not stage all files at once.
4. Classify every changed path into: security fix, DB/schema/migration, backend feature, frontend feature, test, docs, generated/build artifact, unrelated/unknown.
5. Identify accidental credentials, generated output, local DB files, personal data, unrelated experiments, and duplicate edits. Redact or remove secrets from tracked content; do not rewrite published history until repository owners assess exposure.
6. Compare each candidate fix with the deployed `HEAD` and existing state/decision docs. Mark candidates as verified, needs review, unrelated, or unsafe.

**Exit checks**

- Production commit and current DB project/branch are recorded without secret values.
- The dirty changes are backed up and each path is classified.
- No tracked credential or unreviewed generated data is included in the proposed first commit.
- No prior PASS task was unnecessarily reopened.

**Deliverable:** reviewed change inventory and release branch. No app or DB behavior changes yet.

### Phase B — Credential containment and production security hotfix

**Goal:** close the known credential and privacy exposures with the smallest possible code change.

**Code scope**

- Remove deployed sysadmin credential bypass and any special MFA exemption.
- Ensure production boot cannot run `prisma db push --accept-data-loss`, seeds, default-account creation, or password reset.
- Ensure admission status returns only minimal applicant-safe fields and verifies email consistently.
- Ensure activation relies on the approved verified admission record and never returns/stores a plaintext temporary password.
- Keep startup environment validation and fail-closed production DB behavior.
- Preserve account creation through an authenticated sysadmin workflow; set `mustChangePassword` on generated temporary credentials and avoid returning them in general user list/detail responses.

**Validation**

- Add/confirm focused tests for known credentials rejected, stored hash accepted, MFA enforced, inactive account rejected, and generic errors.
- Add/confirm admission tests proving status cannot reveal hashes/PII and activation cannot reactivate or take over an account without verified institutional proof.
- Static scan the production start path for `db push`, seed, `ensureSysadmin`, fixed passwords, and accidental secret values.
- Build and run targeted tests on the remediation branch.
- Review production service boot behavior using staging configuration only.

**Deployment gate**

Complete and test the code hotfix now, but **do not deploy it yet**. Its companion startup change replaces destructive `db push` with `prisma migrate deploy`, and the live database has no confirmed Prisma baseline. A deployment before Phase D/E could fail at boot or apply unreviewed migrations. Promote the security-only release after the production schema/baseline is reviewed and staging-rehearsed in Phases D/E; keep all feature migrations out of that hotfix if they are not required for the security correction.

**Exit checks:** focused security tests pass; no DDL/data migration is bundled; staging startup confirms no seed/account mutation; security review signs off.

### Phase C — Stabilize code and create coherent commits

**Goal:** convert the large worktree into comprehensible, testable change sets.

Group commits by dependency, not by whichever files happen to be modified:

1. Auth/startup/admission security.
2. RBAC and permission guard behavior.
3. Schema/migrations, each additive and independently reviewed.
4. Enrollment/academic workflows.
5. Finance/payment workflows.
6. Faculty/adviser scope and schedule.
7. KB/ARIA durability.
8. Reports/audit/notifications.
9. UI/forms/accessibility.
10. Documentation and acceptance evidence.

For each group, inspect both sides of every UI → API → service → DB path and its tests. Remove only clearly generated artifacts or confirmed unrelated changes; preserve the unclassified diffs until resolved. Do not merge a large monolithic commit just to reduce branch count.

**Exit checks:** every commit has one purpose, relevant tests, clean diff review, and no unrelated files; branch includes the security hotfix before feature/schema work.

### Phase D — Production database forensics and migration baseline

**Goal:** establish the actual schema and migration starting point without modifying it.

**Read-only inventory**

1. Capture schema-only metadata for all relevant schemas: tables, columns, types, constraints, indexes, extensions, RLS flags/policies, triggers, functions, and grants.
2. Inspect Supabase migration history and any Prisma migration ledger independently. The previous inspection found only eight Supabase migrations through `20260913135640` and no Prisma ledger; verify that again from the correct project/branch before planning migration actions.
3. Compare the actual production schema against the exact deployed Prisma schema, then against every local migration in order. Identify which changes are truly applied, partially applied, missing, or incompatible.
4. Inspect row counts and duplicate/null distributions only for columns needed by planned constraints; use aggregates, avoid exporting student PII.
5. Inspect RLS policy definitions (not only counts). Prior check found `course_prerequisites` RLS disabled with no policies. Do not simply enable RLS; define and test intended policies first.
6. Inspect backup/PITR availability and establish a recovery point through the database provider before any eventual production mutation.

**Baseline approach (DEC-011)**

- Create a human-reviewed migration-to-schema evidence table, one row per migration.
- For migrations whose exact effects are already present, prepare a `prisma migrate resolve --applied <migration>` runbook. Test the commands on a staging clone first.
- For partial or absent migrations, do not mark them applied. Prepare new forward-only additive migrations or carefully repair the migration chain in a reviewed branch.
- Never use `db push` as a shortcut. Never delete `_prisma_migrations` or alter migration checksums to silence drift.
- If the true database origin/history remains ambiguous, stop here and keep the DB-dependent tasks BLOCKED with the diagnostic; do not guess a baseline.

**Exit checks:** exact live schema captured; migration ledger mapped; backup/restore path verified in staging; every baseline command and migration has a reviewed expected effect and rollback/forward recovery plan.

### Phase E — Stage additive schema and permissions

**Goal:** establish a staging DB matching the approved Prisma model and institutional role decisions.

Apply reviewed additive schema in this order, using staging first:

1. Permission catalog and canonical roles; safe compatibility mapping for legacy `admin_staff`.
2. Supporting models: payment transaction, class sections/schedules, adviser assignment/concerns, knowledge documents/chunks, required audit snapshots.
3. Backfill only from verified source data; no invented schedule values, advisor assignments, payment history, or KB approvals.
4. Validate existing duplicates/orphans before adding unique constraints and foreign keys.
5. Add indexes and constraints after data is valid.
6. Add RLS policies only where direct client roles need DB access; document service-role/backend access boundaries and test them explicitly.
7. Configure pgvector extension/index and vector column through reviewed SQL migration in the correct order; do not run local initialization scripts against production.

**Role mapping (DEC-012)**

- Rename legacy role record `admin_staff` to `registrar` in place, retaining its ID and all user references.
- Add `treasury` as a separate role. Assign users only after the institution/system owner reviews the mapping; do not infer from names/emails.
- Keep `sys_admin` for system administration, not routine financial or academic operations.
- Create explicit `Permission` and `RolePermission` rows from the approved matrix; verify least privilege in service guards and data scoping.
- Before renaming `admin_staff`, reconcile every live RLS policy that tests that role. A read-only catalog query found 29 policy definitions containing `admin_staff`; update them in the same reviewed migration or safe compatibility sequence. In particular, migrate financial write policy to Treasury according to DEC-012 instead of granting it to Registrar. Test old and new role behavior in staging around the rename.

**Exit checks:** staging migration status clean; row counts and key invariants reconcile; role/permission matrices tested; RLS tests pass; no demo/synthetic data was written to production.

### Phase F — Complete core workflow behavior on staging

**Goal:** prove persistent, role-scoped workflows before adding demo users or enabling production features.

Test each journey with synthetic staging accounts and data:

- Student: login, own profile/grades/enrollment/curriculum/finance, request submit/track, notification ownership, ARIA; verify another student’s identifiers are denied.
- Faculty: assigned classes and minimal roster, grade workflow, unrelated classes/students denied.
- Dean/adviser: assigned advisees only, factual progress, concern create/resolve lifecycle, aggregated chat trends without exposing private content unnecessarily.
- Registrar: student/enrollment/request/admission/KB/report functions allowed; finance updates and user/role administration denied unless specifically approved.
- Treasury: payment evidence verification and financial updates allowed; academic records, grade publication and user/role management denied.
- System administrator: user/role/permissions, reports, audit and configuration access; sensitive changes audited; no account can bypass MFA or first-login password policy.

Also validate state transitions, duplicate handling, transactions, refresh/re-login persistence, pagination, empty/error states, and notifications. Use exact approved business rules; unknown values stay empty or marked unavailable.

**Exit checks:** test evidence proves UI/API/database persistence and role allow/deny outcomes. No finding is marked PASS based solely on a page or a 200 response.

### Phase G — ARIA and knowledge-base acceptance

**Goal:** verify ARIA as a grounded, secure, persistent advisory path.

1. Pin the artifact environment to the supported Python/scikit-learn/numpy/joblib versions in DEC-038; rerun held-out classification evaluation and report weak classes without inflating scores.
2. Validate FastAPI health/readiness with `require_pgvector` enabled in staging; verify shared-secret checks on chat/classify/retrieve/KB/admin endpoints.
3. Add a clearly synthetic, approved staging KB item through the authorized UI; verify SQL persistence, chunking, embedding dimensions/model, indexed status, retrieval by a relevant query, exclusion for unrelated questions, archive/update behavior, and persistence after service restart.
4. Verify Groq is server-side, only receives necessary context, fallback on timeout/rate limit is safe, and unsupported/low-confidence questions escalate instead of inventing rules.
5. Confirm live conversation logs do not train the classifier/model automatically; test student chat history isolation and adviser/live-agent summary/detail permissions.

**Exit checks:** retrieval and answer evidence are tied to approved source IDs; empty/unavailable KB produces safe fallback; no production content is used in test prompts.

### Phase H — UI, accessibility, privacy, reliability, and performance

**Goal:** complete the unfinished P14/P16 checks without destabilizing core behavior.

- Execute all protected page routes for every role, including direct URL and direct API denial cases.
- Review forms for validation, duplicate submits, actionable errors, safe loading, retry, and persisted success.
- Test desktop/tablet/mobile widths and keyboard/focus/contrast/announced errors on representative authenticated flows.
- Review payload minimization, log privacy, user deactivation, token/session handling, CORS, rate limits and all user-facing error messages.
- Measure realistic response time and bounded pagination on staging; do not claim an SLA without an agreed target/load profile.
- Review dependency/model-artifact warnings and CI gates. CI should require backend build/test/typecheck, frontend typecheck/build, Prisma validation/migration checks, and pinned ML compile/test/evaluation.

**Exit checks:** evidence logged to `NFR_VERIFICATION.md`; incomplete accessibility or cross-browser coverage remains explicitly partial rather than being marked PASS.

### Phase I — Release candidate, production deployment, and rollback readiness

**Goal:** promote only a reviewed, schema-compatible release.

**Pre-release checklist**

- Security hotfix deployed and monitored.
- Production migration baseline is reviewed and staging-rehearsed.
- Staging schema is equal to the reviewed target; role mapping and six-role workflows pass.
- Backup/PITR restore rehearsal completed; service owner knows the recovery point.
- No unsafe startup scripts, secrets in Git, broad permission grants, mock data, or debug destructive routes remain.
- Release contains a small known commit range; current DB has no undocumented migration drift.
- Monitoring/log alerts and a rollback/forward-fix owner are assigned.

**Deployment order**

1. Apply only reviewed backward-compatible migrations.
2. Verify migration status and key schema/data invariants read-only.
3. Deploy backend code compatible with both old/new schema where necessary.
4. Deploy frontend after backend health checks.
5. Run read-only production smoke checks for health/login page and non-sensitive public routes.
6. Use designated, owner-approved production test accounts only for tightly scoped login and read checks. No destructive or fake production record creation.
7. Observe logs/errors and stop rollout on first schema/auth/privacy regression.

**Rollback policy:** prefer app rollback while retaining additive schema; do not reverse/drop production schema automatically. If a bad migration has written data, use a reviewed forward repair or restore plan—not ad hoc rollback SQL.

### Phase J — Close thesis acceptance and handoff

**Goal:** produce evidence that the thesis objectives work in the released system.

- Run the final requirements matrix against the production release with route/API/data evidence.
- Complete P10–P17 state entries only when the defined acceptance is proven; maintain DEC-039 gates until DB-specific verification passes.
- Record tests, commit IDs, migrations, deployment IDs, role test results, unresolved risks, and who owns remaining work.
- Mark objective coverage PASS only when the corresponding end-to-end flows are validated; otherwise leave PARTIAL/UNVERIFIED with clear reason.
- Archive the audit report and plan with the release evidence. Keep branch history; prune only obsolete branches after owner approval, backup, and confirmation they contain no unique work.

## 4. Dependency Order at a Glance

```text
Preserve state
   ↓
Security hotfix without schema mutation
   ↓
Classify worktree and make coherent commits
   ↓
Read-only production schema + migration forensics
   ↓
Staging baseline rehearsal
   ↓
Additive schema + reviewed role/permission migration
   ↓
Six-role workflow and ARIA staging acceptance
   ↓
NFR/accessibility/privacy verification
   ↓
Controlled production release + monitored smoke checks
   ↓
Thesis acceptance and handoff
```

The database forensics phase can proceed in parallel with local code review, but no production DB mutation depends on elapsed time or broad user authorization; it depends on the concrete reviewed evidence listed above.

## 5. Immediate Next Actions

1. Preserve production commit `2d07a82e…` and branch history; do not force-push or delete branches.
2. Back up and classify the 178-path worktree diff before staging any changes.
3. Isolate the minimal auth/admission/startup security hotfix and prove it has no migration dependency.
4. Rotate the previously exposed database credential through the provider secret manager and confirm service recovery without displaying it.
5. Re-run read-only database forensics against the intended project/branch and prepare the migration baseline evidence table.
6. Do not execute a production migration until a staging rehearsal, backup/restore evidence, schema diff review, and migration-owner approval are complete.

## 6. Decisions Already Covered

This plan introduces no new school rules or role interpretations. It implements the recorded decisions in:

- `docs/thesis-alignment/DECISION_LOG.md`: DEC-001/005 (role history), DEC-009/010 (no invented standing/schedules), DEC-011 (activation and migration baseline), DEC-012 (Registrar/Treasury route split), DEC-013 (middleware is UX-only), DEC-014/015 (enrollment facts), DEC-017/018 (faculty/adviser scope), DEC-019/020/021/022/023 (approved KB and ARIA boundaries), DEC-029 (startup validation/pgvector readiness), DEC-038 (pinned classifier evaluation runtime), DEC-039 (DB readiness gate).
- `docs/thesis-alignment/THESIS_ALIGNMENT_STATE.md`: Phases 0–9 PASS; Phases 10–17 remain tracked at task level. This recovery plan does not change task statuses.

## 7. Definition of a Strong Foundation

The foundation is ready for broader feature work when all of these are true:

- A reproducible, protected release branch contains only reviewed commits; no force-push is needed to explain its history.
- Production startup never resets schema, seeds accounts, or silently falls back to mock persistence.
- Production schema and migration ledger are reconciled and backed by a reviewed baseline.
- Every active account has an explicit role and persisted least-privilege permission set.
- Student, faculty, dean/adviser, registrar, treasury, and system-admin data boundaries pass both allow and deny tests.
- Sensitive admission, financial, academic, audit, and chat data is minimized and correctly scoped.
- Required workflows persist to the same database the deployed app uses; no mock/demo success is presented as production evidence.
- ARIA retrieval uses a durable approved knowledge source, a compatible pinned model artifact, safe fallback, and private logs.
- CI and release evidence reproduce the relevant checks, and rollback does not depend on deleting production data.

## 8. Execution Log — 2026-09-20 and 2026-09-21

### Current-run verification — 2026-09-21

- Current checkout is `defense-candidate` at `655f08a1`; `origin/main`/`main` point to the preserved baseline `2d07a82e18c0ab460c8b7c866d71379c7ab4b4e1`, which is an ancestor. The candidate is a 198-path change set (10,717 insertions / 2,973 deletions at capture), not the earlier 178-path report snapshot. No force-push or branch deletion occurred.
- Earlier Phase A notes refer to a different worktree/session; its temp backup/classification is not available for inspection here. Treat Phase A as **NEEDS REVALIDATION**, not a verified current-run PASS. The recovery branch exists locally but currently points to the unchanged production baseline; it does not contain this candidate.
- In this checkout, deployed HEAD has 29 Prisma models and candidate HEAD has 36. The audit wording that both define 36 was incorrect and has been corrected. Current read-only Supabase findings in the audit are preserved as prior-run evidence and must be refreshed against the intended project/branch before any migration action.
- Local review reconfirms `20260920000000_rbac_role_alignment` changes `admin_staff` to `registrar`, while a prior live catalog query found 29 policies referencing `admin_staff`; candidate SQL does not update those predicates. `20260921000000_phase3_additive_structures` creates seven public tables but contains no RLS enablement, policies, or explicit direct-client grant restrictions. Both are staging blockers requiring a reviewed, coordinated migration.
- The audit's admission finding is recorded as a source-level risk; production runtime disclosure or takeover was not demonstrated. Live schema lacks the three admission tables expected by deployed HEAD, so route behavior is unverified.
- No production deployment, branch creation, account mutation, SQL migration, or database write was performed. `git diff --check` passes for the one documentation edit. No code test was run in this documentation/evidence correction pass.

### Phase A — Preserve and inventory: NEEDS REVALIDATION

### Phase A — Preserve and inventory: PASS

- Preserved production baseline `2d07a82e18c0ab460c8b7c866d71379c7ab4b4e1` and created branch `codex/sisp-foundation-recovery`; `main` remains at its original commit.
- Saved the tracked diff, untracked archive, Git status, baseline commit, and path classification under a local temporary recovery directory before editing code.
- Classified 198 paths in the initial inventory: 129 tracked paths changed and 69 untracked paths. The working tree is still uncommitted; categories are not yet a content review.
- Identified nine untracked SQL/migration helper files. `sisp-backend/diff.sql` contains 64 `DROP` and 43 `DELETE` keywords; it was not executed. Several handwritten migration JS helpers reference a remote service and were not run.

### Phase B — Security correction: IN_PROGRESS (prior-run candidate evidence)

- Narrow candidate fix: admin account creation now generates a random password meeting the existing password policy, hashes it with bcrypt, and sets `mustChangePassword=true`; the UI no longer derives a credential from student personal data or accepts a staff-selected temporary password.
- Recorded DEC-043 and updated `TH-AUTH-07/08` traceability notes. The phase tracker records this as candidate work only; no claim is made that production changed.
- Verification: four focused Nest Jest suites, 29 tests PASS; backend `npm run build` PASS; backend `npx tsc --noEmit -p tsconfig.json` PASS; frontend `npx tsc --noEmit` PASS; `git diff --check` PASS.
- Remaining: review/commit the other mixed auth, admission, and startup fixes; startup now proposes `prisma migrate deploy`, so no deployment can proceed until the DB baseline is established and rehearsed.

### Phase D — Read-only DB forensics: IN_PROGRESS, prior-run evidence; current project/branch refresh required

- Supabase migration history shows eight entries, while local Prisma has 15 migration directories with timestamps that do not match the live history; `public._prisma_migrations` is absent. The live public inventory has 27 tables (including an extra `events` table) and is missing ten local Prisma tables: admission applications/requirements/submissions, class sections/schedules, payment transactions, adviser assignments/concerns, and knowledge documents/chunks. The `vector` extension is installed, but KB/vector tables are absent.
- Security advisor flags `course_prerequisites` as public with RLS disabled. Read-only catalog query confirms `anon` and `authenticated` have table grants. No RLS change was attempted.
- A read-only policy query found 29 policies referencing `admin_staff`. The local RBAC migration renames that role to `registrar` but does not update the live policy predicates. Deploying the role rename without coordinated policy changes can remove intended Registrar access and retain inappropriate combined-role financial grants.
- Read-only duplicate-key checks returned zero duplicate groups for the local proposed unique keys: enrollment `(student_id, course_id, term_id)`, course `(code, title)`, curriculum `(program_id, effective_year)`, and prerequisites `(course_id, requires_code)`. This is a useful precheck only; it does not establish migration compatibility or authorize applying constraints.
- Supabase lists only the `main` branch for this project. The connected organization’s current estimate for a Supabase development branch is $0.01344/hour (about $9.68 per 30-day month if continuously running). No branch was created. Staging migration rehearsal therefore awaits explicit cost acknowledgement, unless a separate no-cost staging database is provided.
- Advisor also flags seven RLS-enabled tables without policies and a publicly executable `SECURITY DEFINER` `get_user_role()` function. Its body returns the calling JWT user’s own role or NULL, but execute grants/search-path and policy design still require a reviewed least-privilege assessment. Performance advisor reports unindexed prerequisite FK and policy evaluation/multiple permissive-policy warnings.
- Local migration review found constraint drops in `20260919000000_curricula_verified_shape` and `20260921000000_phase3_additive_structures`; these require explicit impact review. The generated `diff.sql` is not a migration plan.
- Remaining: complete a schema/constraints/grants/RLS matrix, verify backup/restore capability, map every live migration effect to the exact local SQL, and prepare a staging-only baseline rehearsal. No SQL writes or migrations were executed.

### Phase D — Current-run migration chain review: PARTIAL, deployment remains BLOCKED

- Rechecked the repository in `E:\projects\sisp` on `defense-candidate` (`655f08a1`). The 15 SQL files in `sisp-backend/prisma/migrations/` are tracked in Git; `migration_lock.toml` is absent. The source SQL is therefore version-controlled, though live Supabase history is maintained in a different ledger and the local Prisma chain still requires reconciliation and clean-install rehearsal. An earlier note in this execution log incorrectly called the SQL files untracked; corrected on 2026-09-20. No files were staged or forced into Git in this pass.
- Mapped local SQL effects: `20260826000000_advisory_service_models` creates 3 tables and writes/updates the document catalog with seven fee-bearing entries; `20260905000000_live_schema_alignment` adds enrollment/grade/document-payment columns and chat tables/FKs; `20260905010000_student_semesters` creates the student term-payment table; `20260912000000_faculty_enrollment_assignments` adds nullable faculty ownership to enrollments; `20260913122935_trisemestral_academic_terms` creates academic terms, backfills terms from existing semester/year fields, writes a three-term 2026–2027 calendar, inserts seven named programs (or overwrites names on code conflict), and backfills term/semester/curriculum fields; `20260913131636_academic_terms_rls` enables RLS and adds authenticated catalog-read policy; `20260913132135_harden_public_rls` enables RLS on seven legacy tables without policies; `20260913140500_activate_current_academic_term` sets 2026–2027 term states; `20260918000000_payment_proof_fields` adds payment proof fields; `20260919000000_curricula_verified_shape` adds curriculum/course metadata, drops `courses_code_key`, and adds replacement uniqueness plus prerequisite constraints; `20260920000000_rbac_role_alignment` renames `admin_staff`, seeds canonical roles/permission rows/links; `20260921000000_phase3_additive_structures` adds six supporting tables plus audit/enrollment-history columns, relaxes audit user nullability and recreates its FK; later migrations add enrollment uniqueness (non-null terms), audit snapshots, and KB indexing status.
- Consequence: `prisma db push` does not replay SQL migration seeds/backfills/policies/role mappings and does not establish `_prisma_migrations`. The prior exact `db push` schema diff was 583 lines: it would drop the currently empty `events` table; add ten modeled tables; change types/nullability/defaults and constraints/indexes; and drop no columns. That schema diff does not capture the separate effects listed above. It is not a substitute for a reviewed migration deployment.
- Specific unresolved data-impact decisions include the seven document fees, the hard-coded 2026–2027 calendar and seven programs, and any prior `courses_code_key` dependents. These values must be confirmed against approved institutional sources before replaying data-changing migrations. Existing live role policies (29 mention `admin_staff`) also remain unreconciled; finance policies cannot be blanket-renamed to Registrar under DEC-012.
- A zero-cost local rehearsal is not currently available: this Windows host has no PostgreSQL/`psql`/`initdb`, Docker/Podman, or Supabase CLI; the project folder has no local migration database. The paid Supabase branch option remains declined by the user. No package installation or cost-incurring resources were created. Production remains unchanged.
- This review did not modify SQL or application code and did not run database migrations. Exit criteria remain open: verify the tracked migration source set and add/review its Prisma lock metadata; identify and verify every historical SQL effect against live catalog/data; resolve the policy/role mapping and institutional seed values; obtain a free PostgreSQL+pgvector rehearsal environment; rehearse all migrations and the approved baseline sequence; verify provider backup/restore capability.

### Phase B — Production mock-store isolation correction: CANDIDATE FIX, VERIFICATION PARTIAL

- Updated `sisp-backend/src/prisma/prisma.service.ts` so `NODE_ENV=production` skips mock identity hashing, demo fixtures, JSON-store reads, and mock persistence setup entirely; production database connection failure continues to throw instead of enabling mock mode.
- `git diff --check` passes. Static review confirms the production start script still invokes only `prisma migrate deploy` and does not seed or invoke `db push`.
- Backend `npm run build` was attempted but Prisma client generation failed with Windows `EPERM` while renaming a locked `query_engine-windows.dll.node`; this is an environment/file-lock failure before TypeScript compilation, so the change is not yet build-verified. Backend `npx tsc --noEmit -p tsconfig.json` was started, emitted no output, then the terminal session ended without an exit code; record as **INCONCLUSIVE**, not PASS. No tests were run in this subphase.
- The ignored local `sisp-backend/mock-db.json` (67,669 bytes) already exists; it was not opened, modified, or deleted. Runtime guidance to remove it applies only after a mock-mode run, which was not performed here.
- This is uncommitted candidate code and is not deployed. Its behavior needs a targeted test proving production construction does not call mock initialization or touch the JSON file, plus a clean build when Prisma's Windows engine file is unlocked.

**Next action:** preserve and classify the candidate worktree, then reconcile the tracked migration source set and continue the schema/constraints/grants/RLS matrix. Supabase development branch staging remains out of scope because it incurs cost; use a free, isolated PostgreSQL+pgvector environment when available. Production migration/deployment remains blocked until live policy/schema drift is reconciled, data-changing seeds/backfills are approved, and a full rehearsal and recovery check pass. No production or database change has been performed.
