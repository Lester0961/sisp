# SISP Complete System Implementation Audit — 2026-09-20

**Project:** Student Information and Services Portal with ARIA — Regis Marie College  
**Mode:** Read-only implementation, security, data, and thesis-compliance audit.  
**Scope:** deployed production snapshot, checked-in commit, dirty local worktree, live Supabase schema/counts, available public runtime, and safe local static/unit checks.  
**Production code reference:** `main` / `2d07a82e18c0ab460c8b7c866d71379c7ab4b4e1`.  
**Important scope split:** at audit time the worktree had 178 changed/untracked paths (129 tracked files in the diff). The fixes in that worktree are not part of the deployed commit and are not treated as deployed behavior. The last observed Vercel production deployment was Ready at the production reference commit above.  

No production write, migration, seed, account change, or destructive endpoint was run. No secret values or student-identifying records are reproduced. The report is evidence-based; untested behavior is marked UNVERIFIED.

## A. Executive Summary

**Overall state: NOT READY for a production thesis demonstration.** The deployed revision has material authentication, privacy, data-loss, and role-boundary defects. The live database also does not match the newer local Prisma schema: required permission links and several new models are absent. Public login-page rendering was observed, but real role sign-in and protected workflows could not be validated; the backend health request timed out. A read-only browser check cannot establish authenticated role behavior.

This report records **35 traceability findings:** 4 PASS, 13 PARTIAL, 9 FAIL, and 9 UNVERIFIED. Counts refer to the individually enumerated requirements in section C, not to every UI control or every possible security test.

Highest-priority findings:

1. **CRITICAL — deployed boot can alter schema and recreate a known-credential system administrator.** `HEAD:sisp-backend/scripts/start-prod.js` runs `prisma db push --accept-data-loss`, seed scripts, and sysadmin recreation; deployed Render configuration invokes it.
2. **CRITICAL — deployed login contains a hard-coded sysadmin credential bypass and an MFA exception.** Stored password verification is bypassed for the known pair. The dirty worktree removes this branch, but that correction is uncommitted.
3. **CRITICAL — public admission status exposes sensitive applicant/student data including a password hash; public activation can take over accounts and returns a temporary password.** Both are present in deployed HEAD; the worktree contains safer implementations.
4. **HIGH — production RBAC is inconsistent with current code and thesis roles.** Live DB has six role records and 86 active users, including five legacy `admin_staff`; it has zero `permissions` and zero `role_permissions`. There are no Registrar or Treasury assignments. New code routes guarded by permission checks therefore cannot be presumed usable with this database.
5. **HIGH — live schema is behind the local Prisma schema.** `payment_transactions`, `class_sections`, `adviser_assignments`, `advising_concerns`, `knowledge_documents`, and `knowledge_chunks` do not exist in live `public`; no safe migration/baseline was performed.
6. **HIGH — course_prerequisites has RLS disabled and no policies.** This is a direct database exposure surface and needs an explicit reviewed access policy before client-role use. See [Supabase Row Level Security guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Objective coverage:** OBJ-01 PARTIAL/FAIL (central portal exists, but deployed auth/RBAC/admin safety and schema mismatch undermine it); OBJ-02 PARTIAL (core student workflows are present in code but role and persistence verification is incomplete, and financial separation/history remain weak); OBJ-03 PARTIAL (the code contains a real classifier/retrieval/generation path, but production vector schema/index readiness and live end-to-end behavior are unverified).

**ARIA:** integrated in the application code, not merely a decorative chat page. The intended code path is student UI → Nest `/api/chat` with JWT/role/quota → FastAPI with shared-secret check → intent classification → retrieval → provider router → response/fallback → Nest persistence in `ChatLog` and optional escalation/session. The deployed live KB/vector path cannot be confirmed against the actual schema, and model artifact compatibility is uncertain.

**Validation run on dirty local candidate only:** backend build and Prisma generation PASS; Jest 22 suites / 132 tests PASS; backend TypeScript PASS; Prisma validate PASS; frontend TypeScript PASS (0 errors); ML compileall PASS; ML pytest 38 passed with 7 warnings. These are useful source-level checks, not production verification. The ML warnings include a scikit-learn artifact version mismatch (artifact trained with 1.5.2, environment 1.9.1), so classifier artifact runtime compatibility is UNVERIFIED. No deployment, DB write, or authenticated production test was run.

## B. System Inventory

### Frontend

Next.js / TypeScript application (`sisp-frontend/app`). Public pages include `/`, `/about`, `/services`, `/support`; auth pages include `/login`, `/register`, `/activate`, `/admission`. Protected pages include `/dashboard`, `/grades`, `/enrollment`, `/curriculum`, `/financials`, `/requests`, `/schedule`, `/settings`, `/force-password-change`, `/chat`, `/faculty`, `/faculty/grades`, `/dean/advisees`, `/dean/grades`, `/live-agent`, and admin pages for dashboard, users, admission, requests, documents, escalations, enrollments, grades, financials, KB, and audit. UI existence does not prove operation. `middleware.ts` is a client-navigation boundary and must not be considered server authorization.

API wrappers are under `sisp-frontend/lib/api/`; Zustand stores include auth, student, request, notification, chat, and admin state. The public landing ARIA preview is scripted and is not the authenticated advisory system. Specific UI concerns verified in the existing audit and source include a support success state that can misrepresent failed submission, static landing preview, misleading schedule surface, and legacy placeholder/demo content. See section I.

### Backend

NestJS application (`sisp-backend/src`) with modules for auth/MFA, students/admission, enrollment/terms, curriculum, grades, documents/finance, dean advising, faculty, notifications, chat/escalation/live-agent sessions, admin/KB, analytics, and audit. Global pipeline includes validation, auth/role/permission guards, throttling, audit interceptor, Helmet, and configured CORS in the local source; production commit behavior is separately discussed in H and K. Local source controllers are route-specific; deployment must use a reconciled schema and grants for those decorators to work.

### ML/NLP

FastAPI under `sisp-ml/app`: chat/classify/retrieve/feedback/admin/knowledge-base routers; classifier service loads a serialized scikit-learn model; retrieval service supports migration-managed pgvector and local fallback subject to configuration; LLM provider router includes Groq and fallback providers; moderation, language handling, and scope services are present. ML secret checks exist in current local routers. Production credentials/configuration were not inspected or disclosed.

### Database

Local Prisma schema has 36 models, including role/permission tables; users/audit; student/program/curriculum/course/prerequisites; academic term, semester, enrollment/history, grade, balances; requests/catalog/items/payment transaction; notifications; ARIA chat/escalation/session/quota; admissions; class sections/schedules; adviser assignment/concerns; knowledge documents/chunks. Live public schema inventory returns 27 tables, including extra `events`; ten tables represented in the local schema are absent from live `public`: three admission tables, class sections/schedules, payment transactions, adviser assignments/concerns, and knowledge documents/chunks. Live Supabase checks show 6 role rows, 0 permission rows, 0 role-permission links, 86 active users. Six named demo accounts previously requested are absent. Production role counts: `student` 59, `faculty` 10, `dean` 4, `sys_admin` 3, `admin_staff` 5, `live_agent` 5. There are no separate live `registrar` or `treasury` roles.

### Deployment / configuration

Frontend production origin observed: `https://sisp-rmc.vercel.app`; backend configured on Render; database on Supabase. Last observed Vercel deployment: Ready at `2d07a82e…`. Backend health request timed out, so service readiness is UNVERIFIED. Local `render.yaml` and start script are dirty changes and do not prove production config changed. Do not use tokens supplied in chat in this report or put them in logs. A database connection string was inadvertently exposed in a prior browser-copy tool output during earlier work; value redacted. Treat it as exposed and rotate its password before future use.

## C. Requirement Traceability Matrix

| ID | Thesis requirement | Role | Evidence (UI → API/service → data) | Runtime evidence | Status | Severity / reason |
|---|---|---|---|---|---|---|
| AUTH-01 | Secure login and role session | All | Login page → deployed `auth.service.ts`; `User`/`Role` | Public login page only; production API timed out | FAIL | CRITICAL — deployed bypass/MFA exception |
| AUTH-02 | Invalid/inactive credentials rejected, logout/expiry | All | Auth service/JWT strategy; local tests cover current candidate | No production account test | PARTIAL | HIGH — production cannot be confirmed; session revocation/staleness limitations |
| AUTH-03 | Password hashes and forced change | All | bcrypt auth/admin services; `User.passwordHash`, `mustChangePassword` | Current candidate build/test only | PARTIAL | HIGH — deployed known-password path; admin candidate creates users without mandatory reset and returns temporary password |
| RBAC-01 | Thesis roles and permission-based API enforcement | All | role guards plus `Permission`/`RolePermission` models | DB has 6 roles, 0 permission records/links; 5 legacy `admin_staff`; no registrar/treasury | FAIL | CRITICAL — production schema/data does not support current permission guards or role split |
| STUD-01 | Student own dashboard/profile/records | Student | `/dashboard`, `/grades`, `/financials`; `/students/me`, grades and terms services | No authenticated production test | UNVERIFIED | HIGH — ownership path not runtime-proven |
| STUD-02 | Protected student academic records/grades | Student | `/grades`; `GET /grades/me`; `Grade` with visibility/status | No production read test | UNVERIFIED | HIGH — cannot confirm deployed filtering/data |
| ENR-01 | Online enrollment and student status | Student | `/enrollment`; enrollment create/drop/status service; `Enrollment` | No production write test | PARTIAL | HIGH — workflow code exists, persistence and no-self-approval not production-tested |
| ENR-02 | Enrollment history and duplicate integrity | Student/Registrar | `EnrollmentHistory`; status service | Live DB write forbidden; local worktree tests only | PARTIAL | MEDIUM — history emission and uniqueness require migration/runtime confirmation |
| CURR-01 | Curriculum, effective year, prerequisites and progress | Student | `/curriculum`; curriculum/enrollment services; `CurriculumCourse`, `CoursePrerequisite` | Live prerequisites table exists but RLS disabled; data correctness unverified | PARTIAL | HIGH — direct DB exposure and completion semantics require verification |
| FIN-01 | Student balance/payment status/history | Student | `/financials`; finance/terms services; `AccountBalance`, `StudentSemester` | No production authenticated read | UNVERIFIED | HIGH — actual live data flow not verified |
| FIN-02 | Treasury payment administration and ledger | Treasury | local finance/payment services; local `PaymentTransaction` model | No Treasury role in live DB; no live transaction table | FAIL | HIGH — distinct Treasury responsibility unavailable in production |
| SRV-01 | Request submission, status and history | Student | `/requests`; documents service and state transitions; `DocumentRequest` | No safe production submission | UNVERIFIED | HIGH — runtime persistence not verified |
| SRV-02 | Administrative request processing and payment verification | Registrar/Treasury | admin requests/documents; permission checks in current source | Live permission data empty; no Treasury role | FAIL | HIGH — current role grants cannot be established; payment authorization is not operationally proven |
| FAC-01 | Faculty access scoped to assigned classes/students | Faculty | `/faculty/grades`; current `ClassSection`/schedule models and grade service | Models absent in live DB; no authenticated test | PARTIAL | HIGH — local code supports scope; production lacks schema and scope proof |
| DEAN-01 | Adviser-scoped academic progress and advising concerns | Dean | `/dean/advisees`, `/dean/grades`; `AdviserAssignment`, `AdvisingConcern` | Both tables absent in live DB; no runtime test | FAIL | HIGH — current production cannot support this worktree workflow |
| ARIA-01 | Authenticated student chat/session/quota | Student | `/chat`; Nest chatbot controller/service; `ChatLog`, `ChatDailyUsage` | No production login or chat test | UNVERIFIED | HIGH — deployed integration unavailable to audit |
| ARIA-02 | Classifier/confidence/direct response | Student | FastAPI classifier/chat pipeline and serialized artifact | ML unit tests pass; artifact version warning | PARTIAL | MEDIUM — model code exists; deployed artifact compatibility unverified |
| ARIA-03 | Semantic RAG, pgvector, source-grounded generation | Student | retrieval service; KB chunk models; provider router | Vector extension installed, but live KB/vector tables are absent | FAIL | HIGH — persistent production semantic store absent by table check |
| ARIA-04 | Fallback/escalation/chat logs/privacy | Student/adviser/live agent | Nest chat and escalation/session services; `ChatLog`, `EscalationQueue`, session/message models | Current candidate tests pass; no production interaction | PARTIAL | MEDIUM — code path exists, production persistence/authorization unverified |
| KB-01 | Approved content CRUD, durable indexing and retrieval | Registrar/System Admin | `/admin/kb`; FastAPI KB API; `KnowledgeDocument/Chunk` | Live tables absent; no write test performed | FAIL | HIGH — cannot provide durable live KB/index under current schema |
| REP-01 | Enrollment/service/grade/system reports from real data | Registrar/System Admin | admin dashboard, analytics/export services | No report authenticated or reconciled against production data | PARTIAL | MEDIUM — code exists; source/reconciliation not verified |
| AUD-01 | Login/change/request audit, protected logs | System Admin | audit interceptor/service; `AuditLog` | Live columns/policy details incomplete; no role test | PARTIAL | HIGH — coverage/actor snapshots and permission store mismatch |
| USER-01 | Admin user/role/status management | System Admin | `/admin/users`; service; User/Role/permissions | No live permission links and no admin login test | FAIL | HIGH — production authorization path not established |
| NOTIF-01 | User-scoped event notifications | All as recipient | notification page/bell; service; `Notification` | Candidate tests cover ownership; production event flow unverified | PARTIAL | MEDIUM — core events/DB alignment unverified |
| SCHED-01 | Actual class/course schedules | Student/Faculty | `/schedule`; local `ClassSection`/`ClassSchedule` | Local schema present, live schema lacks sections | FAIL | MEDIUM — production schema not ready; UI’s older schedule behavior may not be an actual schedule |
| ADMIT-01 | Admission application/status/document evidence | Applicant/Registrar | `/admission`; admission APIs; application/submission models | Safe current-code unit tests pass; no production flow | PARTIAL | HIGH — deployed public endpoints contain sensitive disclosure/takeover defects |
| NFR-SEC-01 | Safe boot, secrets, no mock fallback in production | System | `start-prod.js`, Prisma service, deployment config | Local candidate uses migrate deploy/strict DB; deployed commit uses unsafe startup | FAIL | CRITICAL — schema-loss and credential-seeding risk |
| NFR-SEC-02 | Database access and RLS | All | Supabase RLS/policies | `course_prerequisites`: RLS false, zero policies; other sampled tables have RLS and policies | FAIL | HIGH — course prereq exposure; backend privilege path also requires validation |
| NFR-UX-01 | Validation, responsive UI, error/empty states | All | Next routes/components, global DTO validation | Frontend typecheck green; no role/browser flow | PARTIAL | MEDIUM — static checks do not establish usability or responsive behavior |
| NFR-REL-01 | Persistence/failure handling | All | Prisma services, fallback behavior, retry/error paths | Health endpoint timeout; no production transaction test | UNVERIFIED | HIGH — availability/persistence unknown |
| NFR-MAINT-01 | Maintainable typed code/test/migrations | Engineering | TS/Python modules, Prisma migrations, CI config | Local build/type/test checks green; migrations drift from live | PARTIAL | MEDIUM — migration/baseline inconsistency blocks confidence |
| NFR-PRIV-01 | Minimize sensitive-data exposure and privacy safeguards | Student/Staff | auth/admission/admin/chat projections | Live app not authenticated; deployed routes expose PII/hash per checked code | FAIL | CRITICAL — sensitive disclosure/takeover |
| NFR-PORT-01 | Desktop/mobile and deployment portability | All | responsive components; Vercel/Render config | Only login page rendered; backend timed out | PARTIAL | LOW | Cross-browser/responsive behavior not fully tested |
| NFR-SCALE-01 | Bounded queries and growth path | All | list/report/chat/KB services | No load test; candidate includes bounded chat list but live schema is behind | UNVERIFIED | MEDIUM | Performance under expected volume not measured |
| OBJ-01 | Central portal, RBAC, reports | All | route inventory, admin/analytics/RBAC | Database permission tables empty; production auth unsafe | PARTIAL | CRITICAL | Central UI exists, secure usable centralized service not established |
| OBJ-02 | Online enrollment, academic access, service request | Student/Registrar/Treasury | enrollment/grades/documents routes and models | No safe end-to-end role test; database divergence | PARTIAL | HIGH | Main flow not shown working against production |
| OBJ-03 | ARIA academic advisory | Student | chat UI→Nest→FastAPI pipeline | Production KB/vector and model execution unverified | PARTIAL | HIGH | Architecture exists; production grounding cannot be claimed |

## D. Role-Permission Verification Matrix

| Feature | Student | Faculty | Dean/Adviser | Registrar / Records | Treasury / Accounting | System Admin | Actual result / status |
|---|---|---|---|---|---|---|---|
| Sign-in | Own account | Own account | Own account | Own account | Own account | Own account | UNVERIFIED in production; deployed hard-coded bypass is CRITICAL |
| Own student profile, grades, finance | Own only | No broad student access | Assigned advisees | Records workflow | Finance workflow | Administrative need | PARTIAL in local code; production direct/API tests not performed |
| Course/class roster and grade entry | No | Assigned sections only | Review / approve workflow | Publish/approve where mapped | No | Admin as required | Local candidate has class-section model; live model absent; UNVERIFIED production |
| Enrollment and requests | Submit/track own | No approval | Academic review | Process records/requests | Verify payment | Manage/control as authorized | Workflows exist in source; role/data path fails live mapping; PARTIAL/FAIL |
| Student finance and payment verification | View own, submit proof | No | No | As authorized, no Treasury substitution | Update/verify payment | Administrative oversight | FAIL in production: no Treasury role; no transaction table |
| Advising concerns and student progress | Own concerns as specified | No | Assigned students | Records as authorized | No | Oversight | Current route/service exists locally; tables absent in live DB, FAIL production |
| ARIA | Use | No normal chat | Summaries/escalation as permitted | Escalation/support as permitted | No | Configuration/audit | Student chat and support roles are coded; live verification UNVERIFIED |
| Users/roles/audit | No | No | No | No | No | Manage users/roles/audit | Permission schema has no records or links; FAIL live support |
| Direct route/API bypass checks | No | Assignment boundary | Assignment boundary | Assigned operational boundary | Finance boundary | Elevated but auditable | None executed against production; all such outcomes UNVERIFIED |

## E. Module-by-Module Findings

### MOD-01 — Authentication and access control

**Status: FAIL. Severity: CRITICAL.** UI login and auth/JWT/MFA implementation exist. The deployed revision has a known-credential shortcut and MFA special case; public student activation also has takeover behavior. The current local candidate has bcrypt-only verification and tests for inactive users, but those changes are uncommitted. Production login was not tested. Required: deploy reviewed auth fixes only after DB baseline and test real safe staging accounts, forced reset, expiry/refresh/revocation, and failure audit.

### MOD-02/03 — Student portal and academic records

**Status: UNVERIFIED. Severity: HIGH.** Dashboard, grades, curriculum, finance and request pages map to student-specific endpoints. Local code uses authenticated identity for `/me` paths, and grade filtering checks visibility/approval/payment conditions. Production identity, data ownership, refresh persistence, hidden-grade response, and cross-student IDOR tests were not run. Required: staging A/B ownership tests on direct URLs and APIs; inspect response projections and reconcile record counts.

### MOD-04 — Enrollment

**Status: PARTIAL. Severity: HIGH.** Student enrollment create/drop/status and staff processing exist. Current worktree adds history-related hardening, but production commit and live schema must be examined independently. Duplicate checking without an authoritative unique constraint can race; history needs to be transactionally emitted for state changes. No production mutation was attempted. Required: reviewed migration, safe staging workflow and reconciliation tests.

### MOD-05 — Curriculum

**Status: PARTIAL. Severity: HIGH.** Curriculum, effective-year and prerequisite data are modeled locally; progress depends on actual enrollment records. Live `course_prerequisites` is exposed at the database policy level (RLS disabled/no policies). No rule should infer GPA/probation or schedule facts; apply DEC-009/010/014/015/017/018. Required: reviewed RLS policies, institutional source validation and safe read tests.

### MOD-06 — Financial information

**Status: FAIL. Severity: HIGH.** Student financial views and staff payment flows are represented in code, but no Treasury role or live `PaymentTransaction` table is present. The local worktree has separate roles and a transaction entity, but is not production. Fees/payment channel configuration and live ledger reconciliation were not tested. Required: establish Treasurer role mapping and reviewed schema migration before data writes; reconcile balances against transactions.

### MOD-07 — Service requests

**Status: PARTIAL. Severity: HIGH.** Request creation, state transitions, fees, payment proof and status notifications are represented. Production authorization and persistence are unverified; the current role-permission data is empty. No request was created in production. Required: staging lifecycle tests, including student ownership, duplicate submits, staff transitions, payment verification separation and audit record.

### MOD-08 — Registrar / administrative management

**Status: FAIL. Severity: HIGH.** Worktree separates Registrar and Treasury and narrows routes. Live DB still uses legacy `admin_staff` with 5 active users and no Registrar/Treasury accounts. Permission tables are empty. Never delete or blindly remap existing users; follow the existing decision log for role migration. Required: reviewed role migration/backfill and least-privilege acceptance tests.

### MOD-09 — Faculty

**Status: PARTIAL. Severity: HIGH.** Current local source has class section/schedule support and assignment-scoped data paths. Production lacks the local class models; no live direct access or roster checks were performed. Required: migrate/baseline safely, then test faculty A cannot see faculty B’s roster or edit unrelated grades.

### MOD-10 — Dean / adviser

**Status: FAIL. Severity: HIGH.** Worktree has `AdviserAssignment`, advisee service/controller and concern lifecycle; production database lacks those entities. No live advising screen/API flow was tested. Required: reviewed migration and assignment-scoped tests, using only factual standing under DEC-018; no invented thresholds.

### MOD-11 — ARIA chat

**Status: PARTIAL. Severity: HIGH.** Real orchestration, intent model, retrieval, grounded provider interface, deterministic personal-data answers, fallbacks, quota, logs and escalation exist in code. Production route reachability, service auth, grounded response behavior and persisted logging are unverified. Required: environment-matched, non-sensitive staging questions and provider-failure tests.

### MOD-12 — Knowledge base

**Status: FAIL. Severity: HIGH.** Current worktree adds durable `KnowledgeDocument`/`KnowledgeChunk` Prisma models and API-backed workflows. The live DB has neither table, so durable production indexing cannot be claimed. No KB write was made. Required: apply reviewed migration after baseline, verify active-source approval metadata, index/retrieve round trip, and persistence after restart.

### MOD-13 — Reports and dashboards

**Status: PARTIAL. Severity: MEDIUM.** Analytics/report endpoints and admin dashboards exist. No production report was inspected against source data. Old audit findings identified some fabricated executive report metrics; current local candidate has tests preventing invented escalation rates, but production code is still HEAD. Required: query-level report reconciliation, role gating and date/term filters.

### MOD-14 — Audit/activity logging

**Status: PARTIAL. Severity: HIGH.** Audit interceptor and service exist; current candidate adds action attribution. Login coverage, immutability, actor snapshots and retention behavior are not established for production. Live permission links are absent. Required: test login/change/request events and ensure normal users cannot read/change logs; preserve audit data when accounts are deactivated/deleted.

### MOD-15 — User/role administration

**Status: FAIL. Severity: HIGH.** User-management pages and APIs exist, but live RBAC data has no permissions or role links, legacy role naming persists, and production startup recreates a known account. Current worktree create-user endpoint returns temporary credentials and does not enforce a password reset flag, which is a remaining candidate concern (`admin.service.ts`, around lines 234–298). Required: remove unsafe boot behavior, seed reviewed permission records through migrations/controlled seed, force first-login reset, and avoid returning credentials in broadly accessible response payloads.

### MOD-16 — Notifications

**Status: PARTIAL. Severity: MEDIUM.** Per-user notification entity/service/UI exist; ownership checks are represented in code. Full trigger coverage and live event persistence were not tested. Required: verify intended event triggers and user ownership against staging.

## F. Database / ERD Compliance

| Thesis object/capability | Local Prisma object(s) | Live database evidence | Status / issue |
|---|---|---|---|
| User → Role → RolePermission → Permission | `User`, `Role`, `RolePermission`, `Permission` | Six roles; 0 permissions; 0 links | FAIL — production RBAC relationship is empty |
| Student profile/program/curriculum | `StudentProfile`, `Program`, `Curriculum`, `CurriculumCourse` | Core tables exist in live schema | PARTIAL — relationships/data correctness not row-by-row audited |
| Course prerequisites | `CoursePrerequisite` | Table exists; RLS disabled, zero policies | FAIL — critical RLS exposure |
| Enrollment/history | `Enrollment`, `EnrollmentHistory` | Legacy tables exist | PARTIAL — history trigger/write behavior not live-tested; migration baseline mismatch |
| Grades and visibility | `Grade` | Legacy table exists | PARTIAL — live API projections/grade gates untested |
| Finance/payment history | `AccountBalance`, `StudentSemester`, `PaymentTransaction` | New transaction table absent | FAIL — no verifiable transaction ledger |
| Faculty assignment/schedule | `ClassSection`, `ClassSchedule` | Both absent | FAIL — new assignment model cannot run live |
| Adviser assignment/concerns | `AdviserAssignment`, `AdvisingConcern` | Both absent | FAIL — advisor scope cannot run live |
| Knowledge base/vector chunks | `KnowledgeDocument`, `KnowledgeChunk` | Both absent | FAIL — persistent KB/RAG schema unavailable |
| Audit | `AuditLog` | Table exists but expected new actor/value snapshot fields not fully aligned | PARTIAL — audit completeness and integrity remain to verify |
| Notifications | `Notification` | Existing table | PARTIAL — event coverage/runtime not verified |
| Admission | `AdmissionApplication`, requirement definition/submission | Existing legacy schema | PARTIAL — deployed endpoint privacy defect; upload path/UI needs proof |

**Migration drift:** Supabase migration history contains eight entries through `20260913135640_activate_current_academic_term`; local Prisma has 15 migration directories, including later September changes. The live migration versions/timestamps do not match several local folder versions, and `public._prisma_migrations` is absent. This discrepancy makes automated migrate deployment unsafe until the actual database is baselined/reconciled. Follow DEC-011 and DEC-039. Do not run `db push`, reset, or production migrations as part of this audit.

**Five previously identified requirement-to-ERD gaps:** GAP-01 KB storage; GAP-02 payment history/obligations; GAP-03 faculty class assignment; GAP-04 adviser assignment; GAP-05 course prerequisites. The dirty local worktree has additive models addressing them (including prerequisites), but production still lacks the new classes/tables for GAP-01 through GAP-04, and the live prerequisite table is not protected by RLS. Thus source-level progress does not close the production gaps.

**Constraints/relationships:** full FK/index and data-integrity reconciliation was not safely completed because schema/migration histories diverge and production writes are prohibited. Do not claim all foreign keys are valid based only on Prisma schema.

## G. ARIA Technical Audit

| Concern | Code evidence | Audit result |
|---|---|---|
| Authentication / role | Nest chat controller has Student role/permission gate; service derives user identity | Present in local candidate; production route test UNVERIFIED and DB permission grants absent |
| Preprocessing and limits | DTO validation, moderation/scope/language services | Implemented in source; live abuse/edge tests not run |
| Intent classifier | `sisp-ml/app/services/classifier_service.py`, serialized sklearn pipeline | Present; pytest passes; environment warns model artifact from sklearn 1.5.2 loaded in 1.9.1 |
| Confidence / direct response | Classifier threshold and chat direct response branches | Present; threshold behavior source-tested, not live evaluated |
| pgvector / embeddings | `retrieval_service.py`, `embed_documents.py`, `KnowledgeChunk.embedding vector(384)` | Query/index logic present. Live knowledge tables absent; live pgvector readiness/row count not confirmed |
| Knowledge ingestion | KB router and current Nest proxy; local durable Prisma model | Candidate implementation exists, production schema absent; no mutation test performed |
| Groq and grounding | server-side provider router and context prompt | Present in source; provider secret/runtime response not tested |
| Fallback/escalation | confidence/retrieval failure path, `EscalationQueue` and sessions | Present in code; actual production record creation/assignment not verified |
| Chat logs / trends | `ChatLog`, analytics, session/messages | Models and paths exist; live persistence and role authorization unverified |
| Privacy | student-bound chat history; agent queue summary/scoping code | Candidate code includes constraints; DB/RLS and production role tests absent |
| Autolearning | no evidence live conversations retrain model automatically | No automatic learning path identified; controlled retraining tooling is separate |

**Intended flow in current source:** `student chat UI → POST /api/chat → JWT + Student/aria.use guard + quota → Nest derives student identity → FastAPI X-ML-Secret → moderation/scope/classifier → pgvector retrieval when configured → provider with retrieved institutional context OR safe direct/database response → response/fallback → Nest persists ChatLog and optional EscalationQueue/ChatSession`.

**Production conclusion:** ARIA architecture is genuine, but thesis-level production semantic grounding is **UNVERIFIED/FAIL for currently observed DB readiness**, because the live knowledge document/chunk tables are absent. Do not claim production RAG merely from installed code or local evaluation.

## H. Security and Privacy Findings

### Authentication

- **CRITICAL:** deployed `HEAD` auth service accepts the hard-coded sysadmin credential branch and exempts that account from MFA. It bypasses stored bcrypt verification. Current worktree removes it, but not deployed.
- **HIGH:** no production login/session/refresh/revocation test. JWT access expiry defaults to 1 day and refresh to 7 days in candidate settings; current-role reload helps but does not equal revocation.
- **HIGH:** candidate admin user creation sets `mustChangePassword: false` and returns `temporaryPassword` in the API response; improve before using for production onboarding.

### Authorization / role data

- **CRITICAL:** six role names exist live, but no permission records/links. Backend permission decorators in candidate source rely on those tables and may fail closed or be unusable. No proof of effective role permissions in production.
- **HIGH:** live role naming has `admin_staff`, not `registrar` or `treasury`; active staff are not aligned with current role boundaries.
- Local candidate RBAC has explicit permission keys and server guards; middleware is UX only. Production direct URL/API authorization remains UNVERIFIED.

### Record-level authorization / IDOR

- Local `/me` service flows derive the principal from JWT; Dean and live-agent candidate services add assignment/session ownership checks. No cross-student production tests were performed. Treat as UNVERIFIED until staging test matrix is run.

### Public data exposure / admission

- **CRITICAL:** deployed public admission status endpoint leaks applicant/student data, including `passwordHash`, per deployed source path in `admission.controller.ts`/`admission.service.ts` at HEAD. Current dirty candidate has safe projection and email proof tests.
- **CRITICAL:** deployed activation endpoint can reset/reactivate account without strong verified admission identity proof and returns a temporary password. Candidate source now requires registrar-approved record and avoids returning a plaintext credential.

### Database / RLS

- **HIGH:** `course_prerequisites` has `relrowsecurity=false` and zero policies. RLS is enabled with policies for the sampled `users`, `roles`, `permissions`, `role_permissions`, and `student_profiles`, but policies themselves were not inspected for full role correctness. Enable/define policy only via reviewed migration after testing; blindly enabling RLS without policies can break legitimate access.

### Audit, secrets, transport, and errors

- **HIGH:** deployed production boot uses destructive `db push --accept-data-loss`, seeds, and known sysadmin recreation. This can alter production schema/data on startup.
- **HIGH:** sensitive database URL was displayed by a prior browser-copy tool output during earlier assistance. `Secret exposure detected at prior browser-copy tool output; value redacted.` Rotate the associated DB password. Current tracked-source token scan found no common token signatures; the active git remote currently has no embedded credential. This does not establish that all repository history or provider dashboards are clean.
- TLS provider endpoints are configured for production; exact headers and service policies were not exhaustively tested. Current source uses Helmet, allowlisted CORS, global DTO validation and throttling; live configuration not confirmed.
- No formal Data Privacy Act of 2012 legal compliance certification is claimed. This is a technical review only.

## I. Broken / Placeholder / Mock Features

| UI / feature | Appears to do | Actual issue / evidence | Status |
|---|---|---|---|
| Public ARIA preview | Answer academic questions | Scripted keyword responses; no authenticated backend/RAG path | PARTIAL/demo-only |
| Support form | Submit ticket and show success | Existing audit/source found success UI can show after failed request; public form is not proof of persisted ticket | FAIL |
| Schedule page | Show schedule | Older deployed implementation reused enrollment-like data; current schedule models are not present live | FAIL |
| Admin create-user program selector | Select program | Existing audit found hard-coded mock program IDs; current candidate should load real program ids and be separately verified | PARTIAL |
| Admission requirements | Upload documents | Requirements can be fetched but no verified full upload/storage workflow; applicant-supplied file URL is not secure file persistence | FAIL |
| KB CRUD/index status | Manage approved ARIA facts | UI/source exists locally, but live tables/index path absent; an acknowledgment is not proof of durable index | FAIL |
| Role-specific dashboards | Show permitted modules | Menus/pages do not establish API authorization; role grants empty in DB | UNVERIFIED |
| Mock/offline database | Keep app responsive | Current candidate fails closed in production; deployed start path/config is the controlling risk; no mock data treated as production success | FAIL at deployed revision |

Search for TODO/mock indicators also found ordinary Jest mocks and user-facing input placeholders, which are not themselves fake production workflows. This audit does not treat every match as a defect.

## J. Missing Pages / Routes / Actions

Production-functional gaps or unverified actions:

1. Safe production-grade sysadmin onboarding/login without fixed backdoor credential.
2. Effective Registrar and Treasury role assignment with working, persisted permissions.
3. Payment transaction history/obligation ledger and Treasury-only verification.
4. Live adviser assignment and advising-concern tables/workflow.
5. Live faculty class/section/schedule persistence and assignment-scoped rosters.
6. Durable KB document/chunk persistence and verified semantic retrieval in production.
7. Secure admission document upload/storage and least-data public application status.
8. Production-tested student ownership and staff boundary tests for direct APIs.
9. Real end-to-end role tests for all six thesis roles; no demo accounts currently exist at the six requested addresses.
10. Reconciled production migration ledger/baseline before any schema deployment.

## K. Prioritized Fix List

### P0 — Critical

| Issue | Area | Recommended path | Dependency / validation |
|---|---|---|---|
| Remove known-credential auth bypass and MFA exception | Deployed auth | Promote reviewed source correction; inspect exact deployed diff; never retain shared credentials | Stage test: fixed pair rejected, valid stored hash succeeds, MFA enforced |
| Remove destructive production startup and seed-on-boot | Render/backend startup | Replace with reviewed `prisma migrate deploy` only after DEC-011/039 baseline; no db push/seed/account recreation | Dry-run against staging clone and migration ledger review; verify no user/data changes |
| Close public admission exposure and activation takeover | Admission | Use minimal public projection plus adequate identity proof; never return hash/plaintext password | Unit + staging API tests prove no PII/hash and no takeover |
| Revoke exposed DB credential | Secrets | Rotate DB password, update deployment secret store out-of-band, review access logs | Confirm service reconnects and old credential fails without printing either |

### P1 — Core thesis requirements

| Issue | Area | Recommended path | Dependency / validation |
|---|---|---|---|
| Reconcile production role and permission records | RBAC | Review role mapping with DEC-001/005/012; preserve `admin_staff` history; add canonical roles and permission grants via reviewed migration | Matrix tests for Student/Faculty/Dean/Registrar/Treasury/System Admin; no privilege escalation |
| Reconcile DB schema and migration baseline | Database | Inventory actual schema/ledger, create reviewed baseline, then apply additive migrations only; follow DEC-011/039 | Schema diff reviewed before execution; staging deploy and read checks |
| Protect course prerequisites at DB layer | Supabase | Define RLS policies consistent with API role model; test service role and client roles | Anonymous/authenticated select/insert/update/delete denied as intended |
| Provision missing production modules | Finance/adviser/classes/KB | Migrate local reviewed `PaymentTransaction`, `ClassSection`, `ClassSchedule`, `AdviserAssignment`, `AdvisingConcern`, KB models | Schema exists and workflows pass against staging persistent DB |
| Verify all six roles end to end | Product | Use synthetic non-PII staging accounts, no shared weak password, and read-only checks before safe writes | Record direct-route/API allow/deny outcomes and persistence after re-login |

### P2 — Functional completeness

- Make enrollment-history writes atomic with state changes and add DB-level duplicate constraints after reviewing existing duplicates.
- Complete admission document ingestion with server-side storage, MIME/size validation, access control, and retention decisions from institution—not invented defaults.
- Verify payment balances against a transaction ledger; keep status-only notifications and no payment gateway requirement unless approved.
- Reconcile analytics/export totals with persisted records and remove any non-source-derived metrics.
- Verify advisor trends use aggregated/minimized chat data and expose no private transcripts beyond approved workflow.

### P3 — Quality and evidence

- Add release CI gates for unit, type, Prisma migration validation, frontend lint/type, and pinned ML artifact runtime; current local checks alone do not gate deployment.
- Measure responsive routes, empty/error states, bounded list performance and accessibility using approved test accounts.
- Replace/report any stale wording about MFA, password reset, settings, demo preview, and schedule only after confirming institution-approved behavior.

## L. Final Thesis Readiness Checklist

- [ ] Authentication works safely for all required roles (production backdoor/MFA exception)
- [ ] RBAC enforced frontend + backend with live permission grants (permission tables empty)
- [ ] Students can access only their own records (code present, production not tested; admission endpoints violate privacy)
- [ ] Student academic records are persistent and correctly filtered (production unverified)
- [ ] Enrollment workflow is end-to-end (source exists; prod workflow unverified)
- [ ] Enrollment history is maintained atomically (unverified)
- [ ] Curriculum tracking is data-driven (source exists; live relationship/access needs review)
- [ ] Prerequisites represented correctly and protected (RLS disabled)
- [ ] Financial information is complete with Treasury separation (no live Treasury role)
- [ ] Payment history/obligations supported by persisted transaction facts (live transaction model absent)
- [ ] Service requests are end-to-end and payment verified by authorized staff (not verified)
- [ ] Faculty assigned-record access works (live class schema absent)
- [ ] Dean/adviser review works on assigned students (live adviser tables absent)
- [ ] Chat inquiry trends work with minimized data (production unverified)
- [ ] Knowledge Base management and indexing persist in production (live tables absent)
- [ ] ARIA authentication works in production (unverified)
- [ ] Intent classification works with production-compatible artifact (warning/version mismatch)
- [ ] Semantic retrieval/pgvector works against live approved KB (not verified; live KB tables absent)
- [ ] Groq integration is grounded and secure (code present; runtime unverified)
- [ ] ARIA fallback/escalation works in production (unverified)
- [ ] Chat logs work and are protected (unverified)
- [ ] Reports use real data and reconcile (not verified)
- [ ] Audit logs cover actions and are protected (partial)
- [ ] User/role management works safely (permission store empty; boot backdoor)
- [ ] Notifications work for intended persisted events (partial/unverified)
- [ ] Responsive desktop/mobile UI works across roles (not tested)
- [ ] Input validation is enforced in production (local source yes; runtime unverified)
- [ ] Failure handling avoids data loss (deployed boot violates)
- [ ] No critical secrets/data exposure (not met)
- [ ] Required database relationships and migrations are valid (drift unresolved)
- [ ] No critical placeholder/mock-only thesis features remain (not met)

### Thesis Objective Coverage

| Objective | Status | Evidence | Remaining gaps |
|---|---|---|---|
| OBJ-01 Central portal/admin dashboard/RBAC/reports | **PARTIAL — not safe to accept** | Multi-role UI, Nest modules, Prisma model and report code | Deployed auth/startup defects; empty permission links; role mismatch; report reconciliation absent |
| OBJ-02 Online enrollment, academic access, services | **PARTIAL** | Enrollment/grade/request pages and service logic exist | Live end-to-end persistence unverified; no Treasury; schedule/adviser/transaction models absent; migration drift |
| OBJ-03 ARIA academic advisory | **PARTIAL** | Classifier, retrieval, provider routing, fallback/logging code exists | Production KB/vector tables/index not established; artifact compatibility warning; no live authenticated pipeline test |

## Audit Execution Notes and Reproducibility

- **Repository state:** `E:\projects\sisp`, branch `main`, HEAD `2d07a82e18c0ab460c8b7c866d71379c7ab4b4e1`; worktree dirty (178 changed/untracked paths at capture). Report only; no application source/schema/data changed during this audit.
- **Live database:** read-only Supabase SELECTs confirmed role/user/permission counts, requested-demo-account absence, 27-table public inventory, absence of ten local Prisma tables, migration-ledger state, sampled RLS/policy/grants, and vector-extension presence. No student-specific records or credentials were queried/reported.
- **Runtime:** public deployed login page rendered. Backend health probe timed out; no production login, role API, workflow write, migration, or deployment was attempted.
- **Local candidate checks:** `sisp-backend`: build+Prisma generate PASS; Jest 22 suites / 132 tests PASS; `tsc --noEmit` PASS; `prisma validate` PASS. `sisp-frontend`: `tsc --noEmit` PASS with 0 errors. `sisp-ml`: `compileall` PASS; `pytest -q` 38 passed, 7 warnings (including sklearn artifact-version mismatch). No local DB; no mock-db file remained.
- **Limits:** unit tests use mocks and cannot prove deployed permissions/data. Production comparison uses the deployed commit and read-only database observations, not a penetration test. Full browser inventory across all role pages is impossible without safe test credentials and reachable backend; no such credentials were available. No legal compliance determination is made.
- **Secret handling:** no secret values are included. `Secret exposure detected at prior browser-copy tool output; value redacted.` Rotate the associated DB password. The user had also pasted provider tokens in conversation; they are intentionally not repeated here and should be rotated if still active.

## Audit Addendum — Read-only database findings and candidate correction (2026-09-20)

This addendum records checks run after the main audit report was drafted. It does not imply any production remediation.

### Migration and extension evidence

- Supabase migration history currently returns eight entries. Local Prisma contains 15 migration folders, several with timestamps different from the listed live versions. `public._prisma_migrations` is absent. Do not assume matching names mean matching effects or that `prisma migrate deploy` is ready.
- The `vector` extension is installed, but the local models `admission_applications`, `admission_requirement_definitions`, `admission_requirement_submissions`, `class_sections`, `class_schedules`, `payment_transactions`, `adviser_assignments`, `advising_concerns`, `knowledge_documents`, and `knowledge_chunks` all map to tables absent from live `public`. This was confirmed by a single read-only `information_schema.tables` query. The public migration inventory listed 27 tables, including the extra `events` table, versus 36 local Prisma models. The absent admission tables also mean admission API runtime behavior cannot be inferred from the deployed controller code; its behavior remains UNVERIFIED and may fail at DB access.
- The `vector` extension being installed does not establish a working production vector index; both KB tables are absent.
- Read-only review of local SQL shows constraint drops in `20260919000000_curricula_verified_shape` and `20260921000000_phase3_additive_structures`; each requires explicit schema/data impact review before any environment applies it.
- The untracked `sisp-backend/diff.sql` contains 64 `DROP` and 43 `DELETE` keywords. It was not run and is not accepted as a migration artifact.

### Supabase security advisor and grants

- Supabase security advisor flags `public.course_prerequisites` with RLS disabled. A separate catalog query confirms both `anon` and `authenticated` have table grants, including write-capable privileges. Treat this as **CRITICAL exposure** until the table is protected with reviewed policies or direct client grants are revoked through a reviewed migration. Do not attempt an ad hoc dashboard toggle.
- The exact read-only grants are `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` for both `anon` and `authenticated`. Together with RLS being off, this is a broad Data API write/read exposure, not only a missing defense-in-depth policy.
- A read-only catalog query found 29 live policy definitions whose expressions reference `admin_staff`. The local `rbac_role_alignment` migration renames that role to `registrar` but does not update those database policies. Running the rename without coordinated RLS policy changes can break Registrar access; the current finance policies also require separation in line with DEC-012 before Treasury is assigned.
- The local Phase 3 migration creates seven new public tables (including knowledge, payment, class, and adviser structures) but does not enable RLS or define/revoke direct client grants for them. These table-access policies must be reviewed before that migration is accepted; run the Supabase advisor on a staging schema afterward.
- The advisor also reports seven RLS-enabled tables without policies. RLS with no policy denies ordinary Data API access by default; these findings require checking intended access/grants and the Nest service connection role, not blanket policy creation.
- The public `SECURITY DEFINER` function `public.get_user_role()` is executable by `PUBLIC`, `anon`, and `authenticated`. Its inspected body uses `auth.uid()` to look up only the caller’s own role and returns NULL when no caller is present; no role data was returned by this inspection. Still review function `EXECUTE` grants, search path, and policy dependence as part of hardening.
- Performance advisor reports an unindexed prerequisite foreign key and policy evaluation/multiple-permissive-policy warnings. These are secondary to resolving access correctness; do not alter policies or indexes without a reviewed migration.
- Read-only duplicate-key prechecks for proposed unique keys found zero duplicate groups in live `enrollments` (non-null terms), `courses` by code/title, `curricula` by program/effective year, and `course_prerequisites` by course/requires-code. These checks reduce one migration risk but do not prove the rest of the migration baseline.
- Supabase lists only a `main` branch for the project. A current provider cost lookup estimates a development branch at $0.01344/hour (about $9.68 per 30-day month if it remains running continuously). No branch was created; staging rehearsal requires explicit cost acknowledgement or an available separate staging database.

### Worktree security correction after the audit snapshot

On `codex/sisp-foundation-recovery`, the candidate admin account creation flow was corrected to generate a random, policy-compliant one-time password, hash it, set `mustChangePassword=true`, and remove the predictable personal-data-derived UI preview and manual staff password field. Validation after this edit: admin/auth/admission/student focused Jest suites **4/4, 29 tests PASS**; backend build PASS; backend TypeScript PASS; frontend TypeScript PASS; `git diff --check` PASS. The code is still uncommitted and undeployed; it does not change the production audit result.
