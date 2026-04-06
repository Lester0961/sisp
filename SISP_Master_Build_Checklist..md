# SISP Master Build Checklist

> **Project:** Web-Based Student Information and Services Portal (SISP) with Hybrid NLP- and Semantic-Based Academic Advisory Chat System
> **Institution:** Regis Marie College
> **Developer:** Solo
> **OS:** Windows 10/11 — CMD Terminal
> **IDE:** VS Code
> **API Testing:** Postman
> **Repo Structure:** Single GitHub repository (monorepo with 3 sub-folders)

---

## 📊 Project Progress Overview

| Phase | Status | Progress | Key Milestones |
|-------|--------|----------|----------------|
| **Phase 1: Core System Foundation** | ✅ **COMPLETED** | **100%** | Monorepo setup, auth system, CI/CD |
| **Phase 2: Academic Features** | ✅ **COMPLETED** | **100%** | Student portal, grades, documents, notifications |
| **Phase 3: Chatbot MVP (ARIA)** | 🔄 **IN PROGRESS** | **0%** | NLP pipeline, semantic retrieval, escalation |
| **Phase 4: Admin Dashboard & Analytics** | ⏳ **PENDING** | **0%** | Admin panels, analytics, reporting |
| **Phase 5: ML Refinement & Deployment** | ⏳ **PENDING** | **0%** | HITL, testing, production deployment |

### 🎯 Overall Project Progress: **40% Complete**
**Current Focus:** Phase 3 - Building the ARIA chatbot system

---

---

## Change Log

- v2.0 | Fixes applied from SISP_Alignment_Audit_Report.md
- FIX #1: Alignment note added to §3.3
- FIX #2: UsersModule section added before Phase 2 §2.3
- FIX #3: adminStore creation steps added to Phase 4 §4.4
- FIX #4: AuditLogModule section added to Phase 2
- FIX #5: Registration page + consent checkbox steps added to Phase 1 §1.9
- FIX #6: ChatLogs.userId @@index step added to Phase 3 §3.2
- FIX #7: RequestStatusTracker component steps added to Phase 2 §2.8
- FIX #8: CurriculumChecklist component steps added to Phase 2 §2.8
- FIX #9: Dean exception workflow section added to Phase 4
- FIX #10: Alignment note added to Phase 2 §2.1

---

## Monorepo Folder Structure

```
sisp/                        ← single GitHub repo root
├── sisp-frontend/           ← Next.js app
├── sisp-backend/            ← NestJS app
├── sisp-ml/                 ← FastAPI app
├── docs/                    ← benchmarks, UAT scripts, notes
├── .github/
│   └── workflows/           ← CI/CD pipeline YAMLs
└── README.md
```

---

## Phase 1: Core System Foundation

**Objective:** Set up the single monorepo, all three service scaffolds, local development environment, Supabase database, Prisma schema for auth/RBAC, the full authentication system, and a working login page — so every later phase has a stable, runnable base.

**Prerequisites:** None — this is the starting phase.

---

### 1.1 Repository & Folder Setup

- [x] Create a new folder on your machine: open CMD and run `mkdir C:\Projects\sisp`
- [x] Navigate into it: `cd C:\Projects\sisp`
- [x] Initialize a Git repository: `git init`
- [x] Create the monorepo folder structure in CMD (run each line separately):
  ```
  mkdir sisp-frontend
  mkdir sisp-backend
  mkdir sisp-ml
  mkdir docs
  mkdir .github
  mkdir .github\workflows
  ```
- [x] Create a root `README.md`: `echo # SISP Monorepo > README.md`
- [x] Open `C:\Projects\sisp` in VS Code (`File → Open Folder`) and create a root `.gitignore` file with the following entries:
  ```
  node_modules/
  .env
  .env.local
  dist/
  build/
  __pycache__/
  *.pyc
  .venv/
  app/ml/models/*.pkl
  ```
- [x] Create a new **private** repository on github.com named `sisp`
- [x] Copy the remote URL from GitHub and add it as the origin in CMD: `git remote add origin https://github.com/<your-username>/sisp.git`
- [x] Stage all files: `git add .`
- [x] Make the first commit: `git commit -m "chore: initial monorepo setup"`
- [x] Push to GitHub: `git push -u origin main`
- [x] Create a `develop` branch locally: `git checkout -b develop`
- [x] Push the `develop` branch: `git push -u origin develop`
- [x] Create `docs\dev_notes.md` in VS Code — use this file to log credentials references, blockers, and decisions as you work (never commit this file; add `docs/dev_notes.md` to `.gitignore`)

---

### 1.2 Local Development Environment

- [x] Download and install **Node.js v20 LTS** from nodejs.org — use the Windows installer (.msi), check "Add to PATH" during install
- [x] Open a new CMD window and verify Node: `node -v` — expect `v20.x.x`
- [x] Verify npm installed alongside Node: `npm -v`
- [x] Install pnpm globally: `npm install -g pnpm`
- [x] Verify pnpm: `pnpm -v`
- [x] Download and install **Python 3.11** from python.org — check **"Add Python 3.11 to PATH"** on the first installer screen
- [x] Open a new CMD window and verify Python: `python --version` — expect `Python 3.11.x`
- [x] Verify pip: `pip --version`
- [x] Install the NestJS CLI globally: `npm install -g @nestjs/cli`
- [x] Verify NestJS CLI: `nest --version`
- [x] Install the Supabase CLI: `npm install -g supabase`
- [x] Verify Supabase CLI: `supabase --version`
- [x] Open VS Code → Extensions tab (Ctrl+Shift+X) and install these extensions:
  - **Prisma** (by Prisma)
  - **ESLint** (by Microsoft)
  - **Prettier – Code formatter** (by Prettier)
  - **Python** (by Microsoft)
  - **GitLens** (by GitKraken)
- [x] Create `.vscode\settings.json` in VS Code at the monorepo root with:
  ```json
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "[python]": {
      "editor.defaultFormatter": "ms-python.python"
    }
  }
  ```

---

### 1.3 Supabase Project Setup

- [x] Go to app.supabase.com, sign up or log in, and create a new project named `sisp`
- [x] Choose a strong database password and save it in `docs\dev_notes.md`
- [x] Wait for the project to finish provisioning (~2 minutes)
- [x] Go to **Project Settings → API** and copy the **Project URL** — save it in `docs\dev_notes.md`
- [x] Copy the **anon/public key** — save it in `docs\dev_notes.md`
- [x] Copy the **service_role secret key** — save it in `docs\dev_notes.md`
- [x] Go to **Project Settings → Database** and copy the **Connection string (URI)** with port `5432` — save it in `docs\dev_notes.md` as `DIRECT_URL`
- [x] On the same settings page, find **Connection Pooling**, copy the pooler URI with port `6543` — save it as `DATABASE_URL` in `docs\dev_notes.md`
- [x] Go to **Database → Extensions** in the Supabase dashboard, search for `vector`, and click **Enable**
- [x] Confirm pgvector is active: go to **SQL Editor**, run `SELECT extname FROM pg_extension WHERE extname = 'vector';` — expect one row returned

---

### 1.4 NestJS Backend Scaffolding

- [x] In CMD, navigate to the backend folder: `cd C:\Projects\sisp\sisp-backend`
- [x] Scaffold the NestJS project in the current folder: `nest new . --package-manager pnpm` — when prompted about the non-empty directory, choose to proceed
- [x] Install Prisma: `pnpm add prisma @prisma/client`
- [x] Install Prisma CLI as a dev dependency: `pnpm add -D prisma`
- [x] Initialize Prisma: `npx prisma init --datasource-provider postgresql`
- [x] Open `sisp-backend\.env` in VS Code and set the following (replace angle brackets with your real values from `docs\dev_notes.md`):
  ```
  DATABASE_URL="<pooler connection string port 6543>"
  DIRECT_URL="<direct connection string port 5432>"
  JWT_ACCESS_SECRET="<generate a random 64-character string>"
  JWT_REFRESH_SECRET="<generate a different random 64-character string>"
  FRONTEND_URL="http://localhost:3000"
  ML_SERVICE_URL="http://localhost:8000"
  PORT=3001
  ```
- [x] Open `prisma\schema.prisma` in VS Code and add `directUrl = env("DIRECT_URL")` on the line below `url = env("DATABASE_URL")` inside the `datasource` block
- [x] Install NestJS config module: `pnpm add @nestjs/config`
- [x] Install JWT and Passport packages: `pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt`
- [x] Install Passport JWT types: `pnpm add -D @types/passport-jwt`
- [x] Install bcrypt: `pnpm add bcrypt` then `pnpm add -D @types/bcrypt`
- [x] Install Zod and nestjs-zod: `pnpm add zod nestjs-zod`
- [x] Install class-validator and class-transformer: `pnpm add class-validator class-transformer`
- [x] Install HttpModule for calling FastAPI: `pnpm add @nestjs/axios rxjs`
- [x] Install ts-node for running seed scripts: `pnpm add -D ts-node`
- [x] Open `src\app.module.ts` in VS Code and add `ConfigModule.forRoot({ isGlobal: true })` to the `imports` array
- [x] Open `src\main.ts` in VS Code: set the port to `process.env.PORT || 3001`, add `app.useGlobalPipes(new ValidationPipe())`, and add `app.enableCors({ origin: process.env.FRONTEND_URL })`
- [x] Create the service folder structure from CMD (run each line separately):
  ```
  mkdir src\auth
  mkdir src\users
  mkdir src\students
  mkdir src\grades
  mkdir src\enrollment
  mkdir src\documents
  mkdir src\notifications
  mkdir src\chatbot
  mkdir src\admin
  mkdir src\analytics
  mkdir src\common
  mkdir src\common\guards
  mkdir src\common\decorators
  mkdir src\common\filters
  mkdir src\common\interceptors
  ```
- [x] Verify the backend starts: run `pnpm start:dev` from CMD inside `sisp-backend` — expect "Nest application successfully started" in the terminal

---

### 1.5 Prisma Schema — Phase 1 Tables (Auth & RBAC)

- [x] Open `sisp-backend\prisma\schema.prisma` in VS Code and add the `Role` model:
  ```prisma
  model Role {
    id          String           @id @default(uuid())
    name        String           @unique
    users       User[]
    permissions RolePermission[]
    createdAt   DateTime         @default(now())
  }
  ```
- [x] Add the `Permission` model:
  ```prisma
  model Permission {
    id       String           @id @default(uuid())
    action   String
    resource String
    roles    RolePermission[]
  }
  ```
- [x] Add the `RolePermission` join model:
  ```prisma
  model RolePermission {
    roleId       String
    permissionId String
    role         Role       @relation(fields: [roleId], references: [id])
    permission   Permission @relation(fields: [permissionId], references: [id])
    @@id([roleId, permissionId])
  }
  ```
- [x] Add the `User` model:
  ```prisma
  model User {
    id           String   @id @default(uuid())
    email        String   @unique
    passwordHash String
    isActive     Boolean  @default(true)
    roleId       String
    role         Role     @relation(fields: [roleId], references: [id])
    createdAt    DateTime @default(now())
  }
  ```
- [x] Run the first migration from CMD inside `sisp-backend`: `npx prisma migrate dev --name init_auth_rbac`
- [x] Confirm success: open the Supabase dashboard → Table Editor — the tables `Role`, `Permission`, `RolePermission`, `User` must all appear
- [x] Create the file `sisp-backend\prisma\seed.ts` in VS Code and write seed code that inserts four roles: `student`, `faculty`, `admin_staff`, `dean`
- [x] Add seed code in `seed.ts` that inserts base permissions: `read:grades`, `write:grades`, `read:students`, `manage:users`
- [x] Open `sisp-backend\package.json` in VS Code and add inside the root JSON object: `"prisma": { "seed": "ts-node prisma/seed.ts" }`
- [x] Run the seed from CMD inside `sisp-backend`: `npx prisma db seed`
- [x] Verify seed data: open Supabase dashboard → Table Editor → `Role` table — four role rows must appear

---

### 1.6 AuthModule — Backend

- [x] From CMD inside `sisp-backend`, generate the auth module: `nest g module auth`
- [x] Generate the auth controller: `nest g controller auth`
- [x] Generate the auth service: `nest g service auth`
- [x] Create `src\auth\dto\register.dto.ts` in VS Code — define a Zod schema with: `email` (valid email string), `password` (string min 8 chars), `roleId` (UUID string)
- [x] Create `src\auth\dto\login.dto.ts` — define a Zod schema with: `email` (string), `password` (string)
- [x] Create `src\auth\dto\refresh.dto.ts` — define a Zod schema with: `refreshToken` (string)
- [x] Create `src\auth\strategies\jwt.strategy.ts` — implement `PassportStrategy(Strategy)` that extracts the Bearer token from the Authorization header and returns the decoded payload (`sub`, `email`, `role`)
- [x] Create `src\common\guards\jwt-auth.guard.ts` — extend `AuthGuard('jwt')` from `@nestjs/passport`
- [x] Create `src\common\guards\roles.guard.ts` — implement `CanActivate` that reads the `roles` metadata key and checks it against `request.user.role`; return `true` if matched, `false` otherwise
- [x] Create `src\common\decorators\roles.decorator.ts` — use `SetMetadata('roles', roles)`
- [x] Create `src\common\decorators\current-user.decorator.ts` — use `createParamDecorator` to extract `req.user`
- [x] Register `JwtModule.registerAsync()` inside `AuthModule` using `ConfigService` to read `JWT_ACCESS_SECRET`, with `signOptions: { expiresIn: '15m' }`
- [x] Implement `AuthService.register(dto)`: hash password with `bcrypt.hash(dto.password, 12)`, create user via `prisma.user.create()`, return user object without `passwordHash`
- [x] Implement `AuthService.validateUser(email, password)`: find user by email, run `bcrypt.compare()`, throw `UnauthorizedException` if mismatch, return user object
- [x] Implement `AuthService.login(dto)`: call `validateUser()`, sign access token (payload: `{ sub, email, role }`, expiry 15m), sign refresh token (expiry 7d) using `JWT_REFRESH_SECRET`, return `{ accessToken, refreshToken }`
- [x] Implement `AuthService.refreshToken(token)`: verify using `JWT_REFRESH_SECRET`, extract payload, sign and return a new access token
- [x] Add `POST /auth/register` in AuthController — call `AuthService.register(dto)`, return `201`
- [x] Add `POST /auth/login` in AuthController — call `AuthService.login(dto)`, return `200` with both tokens
- [x] Add `POST /auth/refresh` in AuthController — apply `@UseGuards(JwtAuthGuard)`, call `AuthService.refreshToken()`
- [x] Open **Postman** and create a new Collection named `SISP API`
- [x] In Postman, add a Collection Variable named `token` (leave value empty for now)
- [x] Create a `POST` request to `http://localhost:3001/auth/register` with a JSON body — send and confirm `201` and a new `User` row appears in Supabase
- [x] Create a `POST` request to `http://localhost:3001/auth/login` with valid credentials — confirm `200` with `accessToken` and `refreshToken`
- [x] In the login request's **Tests** tab in Postman, add: `pm.collectionVariables.set("token", pm.response.json().accessToken);` — this auto-saves the token for all future requests
- [x] Create a `POST` request to `http://localhost:3001/auth/login` with a wrong password — confirm `401 Unauthorized`
- [x] Create a `POST` request to `http://localhost:3001/auth/refresh` with a valid `refreshToken` in the JSON body — confirm a new `accessToken` is returned

---

### 1.7 Next.js Frontend Scaffolding

- [x] Open a **new** CMD window and navigate to the monorepo root: `cd C:\Projects\sisp`
- [x] Scaffold Next.js inside `sisp-frontend`: `pnpm create next-app sisp-frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- [x] Navigate into the frontend folder: `cd sisp-frontend`
- [x] Install Zustand: `pnpm add zustand`
- [x] Install Axios: `pnpm add axios`
- [x] Install React Hook Form: `pnpm add react-hook-form`
- [x] Install Zod and its resolver: `pnpm add zod @hookform/resolvers`
- [x] Install Lucide React icons: `pnpm add lucide-react`
- [x] Initialize shadcn/ui: `pnpm dlx shadcn-ui@latest init` — accept defaults when prompted
- [x] Create `src\lib\axios.ts` in VS Code — export an Axios instance with `baseURL` set to `process.env.NEXT_PUBLIC_API_URL`
- [x] Add a request interceptor to the Axios instance in `axios.ts`: read the access token from `localStorage` and attach it as `Authorization: Bearer <token>` on every outgoing request
- [x] Add a response interceptor in `axios.ts`: on a `401` response, call `POST /auth/refresh` using the stored refresh token, save the new access token via `localStorage.setItem`, and retry the original request once; if the refresh also fails, redirect to `/login`
- [x] Create `src\types\user.types.ts` in VS Code — define TypeScript interfaces for `User`, `Role`, and `AuthTokens`
- [x] Create `sisp-frontend\.env.local` in VS Code and set: `NEXT_PUBLIC_API_URL=http://localhost:3001`
- [x] Verify the frontend starts: run `pnpm dev` from CMD inside `sisp-frontend` — expect Next.js running on `http://localhost:3000`

---

### 1.8 Zustand authStore

- [x] Create the folder `sisp-frontend\src\stores\` and the file `authStore.ts` inside it in VS Code
- [x] Define the store state interface: `user` (User | null), `accessToken` (string | null), `refreshToken` (string | null), `isAuthenticated` (boolean)
- [x] Implement the `login(tokens, user)` action: set all state fields and write both tokens to `localStorage`
- [x] Implement the `logout()` action: clear all state fields and call `localStorage.removeItem` for both token keys
- [x] Implement the `setAccessToken(token)` action: update `accessToken` in state and overwrite it in `localStorage`
- [x] Add hydration logic: at the bottom of the store creation function, check `typeof window !== 'undefined'` and if true, read tokens from `localStorage` and set the initial state values
- [x] Export `useAuthStore` as the named hook from `authStore.ts`

---

### 1.9 Login Page, Registration Page & Protected Route Guard

<!-- FIX #5: Registration page and consent checkbox steps added -->

- [x] Create the folder path `sisp-frontend\src\app\(auth)\login\` in VS Code (create each folder level manually)
- [x] Create `page.tsx` inside that folder — build a centered login form with two fields: email (`<input type="email">`) and password (`<input type="password">`)
- [x] Wire the form to `react-hook-form` with Zod validation: email must be a valid email format, password must be at least 1 character
- [x] Implement the `onSubmit` handler: call `POST /auth/login` via the Axios instance, on success call `authStore.login(tokens, user)` then use `router.push('/dashboard')` from `next/navigation`
- [x] Show a red error alert below the form when the API returns `401`
- [x] Display a green success banner on the login page when the URL contains the query parameter `?registered=true` (e.g., after a successful registration redirect)
- [x] Create `sisp-frontend\src\app\(auth)\register\page.tsx` in VS Code — build a registration form with fields: email (text input), password (password input), and a required data privacy consent checkbox
- [x] Set the checkbox label text to: `"I agree to the collection and use of my personal data in accordance with RA 10173 (Data Privacy Act of 2012)"`
- [x] Wire the checkbox to `react-hook-form` with the validation rule: `validate: v => v === true || 'You must accept the data privacy policy'`
- [x] Disable the Register button when `formState.isValid` is `false` — the button should use `disabled={!formState.isValid}` and show reduced opacity when disabled
- [x] Implement the registration `onSubmit` handler: call `POST /auth/register` via Axios with `{ email, password }`; on success redirect to `/login?registered=true`; on error display the API error message below the form
- [x] Create `sisp-frontend\src\app\(protected)\layout.tsx` in VS Code — read `useAuthStore().isAuthenticated`; if false, call `router.replace('/login')`; if true, render `{children}`
- [x] Create `sisp-frontend\src\app\(protected)\dashboard\page.tsx` with a simple `<h1>Welcome to SISP</h1>` as a placeholder
- [x] Start both dev servers (frontend on port 3000, backend on 3001) and manually test: navigate to `http://localhost:3000/login`, fill in credentials, confirm redirect to `/dashboard`
- [x] Test the route guard: navigate directly to `http://localhost:3000/dashboard` without being logged in — confirm redirect to `/login`
- [x] Test the registration flow: navigate to `http://localhost:3000/register`, fill in the form without checking the consent checkbox — confirm the Register button remains disabled; check the checkbox and submit — confirm redirect to `/login?registered=true` and the success banner appears

---

### 1.10 GitHub Actions CI/CD — Pipeline Scaffold

- [x] Open `sisp\.github\workflows\backend.yml` in VS Code and write:
  ```yaml
  name: Backend CI
  on:
    push:
      branches: [main, develop]
      paths: ["sisp-backend/**"]
  jobs:
    lint-test-build:
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: sisp-backend
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
        - run: npm install -g pnpm
        - run: pnpm install
        - run: pnpm lint
        - run: pnpm test --passWithNoTests
        - run: pnpm build
  ```
- [x] Create `sisp\.github\workflows\frontend.yml` in VS Code with the same structure but `working-directory: sisp-frontend` and steps: `pnpm install`, `pnpm lint`, `pnpm build`
- [x] Create `sisp\.github\workflows\ml.yml` in VS Code:
  ```yaml
  name: ML Service CI
  on:
    push:
      branches: [main, develop]
      paths: ["sisp-ml/**"]
  jobs:
    lint-test:
      runs-on: ubuntu-latest
      defaults:
        run:
          working-directory: sisp-ml
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with:
            python-version: "3.11"
        - run: pip install -r requirements.txt
        - run: pip install flake8 pytest
        - run: flake8 app/ --max-line-length=120
        - run: pytest tests/ -v || true
  ```
- [x] From CMD in the monorepo root, commit and push: `git add .` then `git commit -m "ci: add github actions workflows"` then `git push origin develop`
- [x] Open the GitHub repository → **Actions** tab — confirm all three workflow files appear and their first runs are shown (green or in progress)

---

## Phase 2: Academic Features

**Objective:** Build all student-facing academic data modules — profiles, grades with payment gate, enrollment, document requests, and notifications — with their frontend pages, Zustand stores, and Supabase RLS policies.

**Prerequisites (all must be ✅ before starting Phase 2):**

- All Phase 1 checkboxes complete
- `POST /auth/login` tested and working in Postman
- NestJS and Next.js dev servers start without errors
- Prisma migration `init_auth_rbac` is visible in the Supabase dashboard

---

### 2.1 Prisma Schema — Phase 2 Tables

<!-- FIX #10: Curriculum model uses programId FK (normalized) — confirmed and aligned with updated architecture §2.2 -->

- [x] Open `sisp-backend\prisma\schema.prisma` in VS Code and add the `Program` model: `id` (UUID PK), `name` (String), `code` (String @unique)
- [x] Add the `StudentProfile` model: `id` (UUID PK), `userId` (FK to User @unique), `studentNumber` (String @unique), `programId` (FK to Program), `yearLevel` (Int), `createdAt` (DateTime @default(now))
- [x] Add the `Course` model: `id` (UUID PK), `code` (String @unique), `title` (String), `units` (Int), `instructorId` (FK to User, nullable — use `String?`)
- [x] Add the `Curriculum` model: `id` (UUID PK), `programId` (FK to Program), `effectiveYear` (Int)
  > **Note:** Curriculum uses `programId` FK to Program (normalized approach) — confirmed and aligned with updated architecture §2.2.
- [x] Add the `CurriculumCourse` join model: `curriculumId` (FK), `courseId` (FK), `yearLevel` (Int), `semester` (Int), composite PK `@@id([curriculumId, courseId])`
- [x] Add the `EnrollmentHistory` model: `id` (UUID PK), `studentId` (FK to StudentProfile), `term` (String), `academicYear` (String), `status` (String)
- [x] Add the `Enrollment` model: `id` (UUID PK), `studentId` (FK to StudentProfile), `courseId` (FK to Course), `enrollmentHistoryId` (FK to EnrollmentHistory), `section` (String), `status` (String @default("enrolled"))
- [x] Add the `Grade` model: `id` (UUID PK), `enrollmentId` (FK to Enrollment @unique), `prelim` (Float?), `midterm` (Float?), `finals` (Float?), `finalGrade` (Float?), `isVisible` (Boolean @default(false)), `encodedById` (FK to User), `updatedAt` (DateTime @updatedAt)
- [x] Add the `AccountBalance` model: `id` (UUID PK), `studentId` (FK to StudentProfile @unique), `balance` (Decimal), `status` (String @default("unpaid"))
- [x] Add the `DocumentRequest` model: `id` (UUID PK), `studentId` (FK to StudentProfile), `type` (String), `status` (String @default("Pending")), `notes` (String?), `processedById` (FK to User, nullable), `createdAt` (DateTime @default(now)), `updatedAt` (DateTime @updatedAt)
- [x] Add the `Notification` model: `id` (UUID PK), `userId` (FK to User), `message` (String), `isRead` (Boolean @default(false)), `createdAt` (DateTime @default(now))
- [x] Run the migration from CMD inside `sisp-backend`: `npx prisma migrate dev --name add_academic_features`
- [x] Verify all new tables appear in the Supabase Table Editor
- [x] Update `prisma\seed.ts` to insert at least: one `Program`, one `Course`, one `Curriculum`, one `StudentProfile` tied to a test user, one `AccountBalance` with `status = "paid"` for that student
- [x] Re-run the seed: `npx prisma db seed` and verify the new rows appear in Supabase

---

### 2.2 Supabase RLS Policies

- [x] Open Supabase dashboard → Table Editor → select the `Grade` table → click the **RLS** tab → click **Enable RLS**
- [x] Click **Add policy** → "Create a policy from scratch" → name: `student_can_view_own_visible_grades` → command: `SELECT` → USING expression: `student_id = auth.uid() AND is_visible = true`
- [x] Add a second `Grade` SELECT policy named `staff_faculty_can_view_grades` → USING: `(auth.jwt() ->> 'role') IN ('faculty', 'admin_staff', 'dean')`
- [x] Enable RLS on the `StudentProfile` table
- [x] Add `StudentProfile` SELECT policy `student_view_own_profile`: USING `user_id = auth.uid()`
- [x] Add `StudentProfile` SELECT policy `staff_view_all_profiles`: USING `(auth.jwt() ->> 'role') IN ('admin_staff', 'faculty', 'dean')`
- [x] Enable RLS on the `AccountBalance` table
- [x] Add `AccountBalance` SELECT policy `student_view_own_balance`: USING `student_id = auth.uid()`
- [x] Enable RLS on the `DocumentRequest` table
- [x] Add `DocumentRequest` SELECT policy `student_view_own_requests`: USING `student_id = auth.uid()`
- [x] Add `DocumentRequest` SELECT policy `staff_view_all_requests`: USING `(auth.jwt() ->> 'role') = 'admin_staff'`
- [x] Test each policy in the Supabase SQL Editor by prepending `SET LOCAL "request.jwt.claims" = '{"sub":"<test-uuid>","role":"student"}';` before a SELECT statement on each table

---

### 2.3 UsersModule — Backend

<!-- FIX #2: UsersModule section added — provides GET /users and PATCH /users/:id service logic consumed by AdminModule -->

- [x] From CMD inside `sisp-backend`, run: `nest g module users`
- [x] Run: `nest g controller users`
- [x] Run: `nest g service users`
- [x] Create `src\users\dto\update-user.dto.ts` — Zod schema with optional fields: `email` (string, valid email format), `roleId` (UUID string)
- [x] Implement `UsersService.listAll()`: call `prisma.user.findMany({ include: { role: true } })`, omit `passwordHash` from each returned user object before returning the array
- [x] Implement `UsersService.updateById(userId, dto)`: call `prisma.user.update({ where: { id: userId }, data: dto })`, return the updated user without `passwordHash`
- [x] Add `GET /users` in UsersController: apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('admin_staff')`, call `usersService.listAll()`
- [x] Add `PATCH /users/:id` in UsersController: apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('admin_staff')`, call `usersService.updateById(params.id, body)`
- [x] In Postman, send `GET http://localhost:3001/users` with an `admin_staff` token — confirm `200` with the full user list (no `passwordHash` fields visible)
- [x] In Postman, send `GET http://localhost:3001/users` with a student token — confirm `403 Forbidden`

---

### 2.4 StudentsModule — Backend

- [x] From CMD inside `sisp-backend`, run: `nest g module students`
- [x] Run: `nest g controller students`
- [v] Run: `nest g service students`
- [x] Create `src\students\dto\update-student.dto.ts` — Zod schema with optional `yearLevel` (number) and `programId` (UUID string)
- [x] Implement `StudentsService.getMyProfile(userId)`: call `prisma.studentProfile.findUnique` where `userId` equals the argument, include `program` and `user` relations
- [x] Implement `StudentsService.getProfileById(id)`: same query but by `studentProfile.id`
- [x] Add `GET /students/me` in StudentsController: apply `@UseGuards(JwtAuthGuard)`, use `@CurrentUser()` to get the user, call `getMyProfile(currentUser.id)`
- [x] Add `GET /students/:id` in StudentsController: apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin_staff', 'faculty', 'dean')`, call `getProfileById(params.id)`
- [x] In Postman, send `GET http://localhost:3001/students/me` with Authorization set to `Bearer {{token}}` — confirm `200` with profile object
- [x] Send `GET http://localhost:3001/students/me` without a token — confirm `401`
- [x] Log in as a student and send `GET http://localhost:3001/students/<id>` — confirm `403`

---

### 2.5 GradesModule — Backend

- [x] From CMD inside `sisp-backend`, run: `nest g module grades` then `nest g controller grades` then `nest g service grades`
- [x] Create `src\grades\dto\create-grade.dto.ts` — Zod schema: `enrollmentId` (UUID), `prelim` (number, optional), `midterm` (number, optional), `finals` (number, optional)
- [x] Implement `GradesService.checkPaymentGate(studentProfileId)`: call `prisma.accountBalance.findUnique` by `studentId`, return `true` if `status === 'paid'`, return `false` otherwise
- [x] Implement `GradesService.getMyGrades(userId)`:
  1. Find `StudentProfile` by `userId`
  2. Call `checkPaymentGate(profile.id)` — if `false`, return `{ grades: [], paymentRequired: true }`
  3. Otherwise query `prisma.grade.findMany` where `enrollment.studentId = profile.id` AND `isVisible: true`, include course details
  4. Return `{ grades, paymentRequired: false }`
- [x] Implement `GradesService.encodeGrade(dto, encodedById)`: call `prisma.grade.upsert` using `enrollmentId` as the unique key, set `isVisible: false` by default
- [x] Implement `GradesService.releaseGrade(gradeId)`: call `prisma.grade.update({ where: { id: gradeId }, data: { isVisible: true } })`
- [x] Add `GET /grades` in GradesController: apply `@UseGuards(JwtAuthGuard)`, call `getMyGrades(currentUser.id)`
- [x] Add `POST /grades` in GradesController: apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('faculty', 'admin_staff')`, call `encodeGrade(dto, currentUser.id)`
- [x] Add `PATCH /grades/:id/release` in GradesController: apply guards + `@Roles('admin_staff', 'dean')`, call `releaseGrade(params.id)`
- [x] In Postman, test `GET /grades` with the test student token when `AccountBalance.status = 'unpaid'` (set directly in Supabase Table Editor) — confirm `{ "paymentRequired": true, "grades": [] }`
- [x] Update the test student's balance status to `'paid'` in Supabase, then call `GET /grades` again — confirm grades are returned
- [x] Test `POST /grades` with a faculty token — confirm `201`
- [x] Test `POST /grades` with a student token — confirm `403`

---

### 2.6 EnrollmentModule — Backend

- [x] From CMD inside `sisp-backend`, run: `nest g module enrollment` then `nest g controller enrollment` then `nest g service enrollment`
- [x] Create `src\enrollment\dto\enroll.dto.ts` — Zod schema: `courseId` (UUID), `enrollmentHistoryId` (UUID), `section` (string)
- [x] Implement `EnrollmentService.enroll(studentProfileId, dto)`: check if an `Enrollment` already exists with the same `studentId` and `courseId` — if so, throw `ConflictException('Already enrolled in this course')`; otherwise create the enrollment with `status: 'enrolled'`
- [x] Implement `EnrollmentService.getMyEnrollments(studentProfileId)`: query all enrollments for the student, include `course` relation
- [x] Implement `EnrollmentService.updateStatus(enrollmentId, status)`: call `prisma.enrollment.update` with the new status
- [x] Add `POST /enrollments` in EnrollmentController: apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('student')`, look up the student profile from `currentUser.id`, call `enroll(profile.id, dto)`
- [x] Add `GET /enrollments` in EnrollmentController: apply `@UseGuards(JwtAuthGuard)`, look up student profile and call `getMyEnrollments(profile.id)`
- [x] Add `PATCH /enrollments/:id` in EnrollmentController: apply guards + `@Roles('admin_staff')`, call `updateStatus(params.id, body.status)`
- [x] In Postman, test `POST /enrollments` with a valid student token and a real `courseId` from Supabase — confirm `201` and a new row in Supabase
- [x] Test `POST /enrollments` again with the same `courseId` — confirm `409 Conflict`

---

### 2.7 DocumentRequestModule — Backend

- [x] From CMD inside `sisp-backend`, run: `nest g module documents` then `nest g controller documents` then `nest g service documents`
- [x] Create `src\documents\dto\create-request.dto.ts` — Zod schema: `type` (enum: `transcript`, `certificate_of_enrollment`, `good_moral`, `diploma`, `tor`), `notes` (string optional)
- [x] Create `src\documents\dto\update-request.dto.ts` — Zod schema: `status` (enum: `Pending`, `Under Review`, `Approved`, `Released`)
- [x] Define the valid transitions constant at the top of `documents.service.ts`:
  ```typescript
  const VALID_TRANSITIONS: Record<string, string[]> = {
    Pending: ["Under Review"],
    "Under Review": ["Approved"],
    Approved: ["Released"],
    Released: [],
  };
  ```
- [x] Implement `DocumentsService.createRequest(studentProfileId, dto)`: call `prisma.documentRequest.create` with `status: 'Pending'`
- [x] Implement `DocumentsService.getMyRequests(studentProfileId)`: find all requests for the student, order by `createdAt` descending
- [x] Implement `DocumentsService.getAllRequests()`: find all requests, include `studentProfile → user` for name display
- [x] Implement `DocumentsService.updateStatus(requestId, newStatus, processedById)`:
  1. Load the current request via Prisma
  2. Check if `newStatus` is in `VALID_TRANSITIONS[currentStatus]` — if not, throw `BadRequestException('Invalid status transition')`
  3. Call `prisma.documentRequest.update` with the new status and `processedById`
- [x] Add `POST /requests` in DocumentsController: apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('student')`, look up student profile, call `createRequest()`
- [x] Add `GET /requests` in DocumentsController: apply `@UseGuards(JwtAuthGuard)` — if `currentUser.role === 'student'` call `getMyRequests()`, else call `getAllRequests()`
- [x] Add `PATCH /requests/:id` in DocumentsController: apply guards + `@Roles('admin_staff')`, call `updateStatus(id, dto.status, currentUser.id)`
- [x] In Postman, test the full status workflow: create request → update to `Under Review` → `Approved` → `Released` — confirm each step in Supabase
- [x] Test an invalid skip transition (Pending → Released directly) — confirm `400 Bad Request`

---

### 2.8 NotificationsModule — Backend

- [x] From CMD inside `sisp-backend`, run: `nest g module notifications` then `nest g controller notifications` then `nest g service notifications`
- [x] Implement `NotificationsService.create(userId, message)`: call `prisma.notification.create()` with `userId` and `message`
- [x] Implement `NotificationsService.getUnread(userId)`: query notifications where `userId` matches and `isRead: false`
- [x] Implement `NotificationsService.markAllRead(userId)`: call `prisma.notification.updateMany()` setting `isRead: true` where `userId` matches
- [x] Import `NotificationsModule` into `DocumentsModule` and inject `NotificationsService` into `DocumentsService` via the constructor
- [x] Call `notificationsService.create(studentUserId, 'Your document request status has been updated to: ' + newStatus)` inside `DocumentsService.updateStatus()` after a successful Prisma update
- [x] Add `GET /notifications` in NotificationsController: apply `@UseGuards(JwtAuthGuard)`, call `getUnread(currentUser.id)`
- [x] Add `PATCH /notifications/read-all` in NotificationsController: apply `@UseGuards(JwtAuthGuard)`, call `markAllRead(currentUser.id)`
- [x] In Postman, update a document request status as admin_staff, then switch to the student token and call `GET /notifications` — confirm a notification record is returned

---

### 2.9 AuditLogModule — Backend

<!-- FIX #4: AuditLog table and global interceptor added for RA 10173 compliance -->

- [x] Open `sisp-backend\prisma\schema.prisma` in VS Code and add the `AuditLog` model:
  ```prisma
  model AuditLog {
    id         String   @id @default(uuid())
    userId     String
    user       User     @relation(fields: [userId], references: [id])
    action     String
    resource   String
    resourceId String?
    ipAddress  String?
    createdAt  DateTime @default(now())
  }
  ```
- [x] Run from CMD inside `sisp-backend`: `npx prisma migrate dev --name add_audit_log`
- [x] Confirm the `AuditLog` table appears in the Supabase Table Editor
- [x] Create `src\common\interceptors\audit.interceptor.ts` in VS Code — implement a NestJS interceptor using `@Injectable()` and `NestInterceptor` that:
  1. Reads `userId` from `ExecutionContext` via `request.user?.sub` (available after JWT auth)
  2. Extracts HTTP method and URL from the request object
  3. Skips logging for `GET` and `OPTIONS` requests (only logs `POST`, `PATCH`, `DELETE`)
  4. After the handler completes, writes a row to `prisma.auditLog.create()` with `userId`, `action` (method + path), `resource` (first URL segment after `/`), `ipAddress` (from `request.ip`)
  5. Returns the original response unchanged using `tap()` from `rxjs/operators`
- [x] Register `AuditInterceptor` globally in `src\app.module.ts` by adding `{ provide: APP_INTERCEPTOR, useClass: AuditInterceptor }` to the `providers` array — import `APP_INTERCEPTOR` from `@nestjs/core`
- [x] In Postman, call `POST /auth/login` with valid credentials, then open Supabase Table Editor → `AuditLog` — confirm one row was created with the correct `action` value of `POST /auth/login`

---

### 2.10 Frontend Pages — Student Portal

<!-- FIX #7: RequestStatusTracker component steps added before /requests page -->
<!-- FIX #8: CurriculumChecklist component steps added before /curriculum page -->

- [x] Create `sisp-frontend\src\app\(protected)\dashboard\page.tsx` — display a heading with the student's name (from `GET /students/me`) and two summary cards: enrolled units count and pending document requests count
- [x] Create `sisp-frontend\src\app\(protected)\grades\page.tsx` — render a table with columns: Course Code, Course Title, Prelim, Midterm, Finals, Final Grade — fetch from `GET /grades`
- [x] Add a visible yellow banner on the grades page that reads "You have an outstanding balance. Grades are locked until payment is confirmed." when the API returns `paymentRequired: true`
- [x] Create `sisp-frontend\src\components\requests\RequestStatusTracker.tsx` — accept props: `status` (string) and `updatedAt` (Date); render a 4-step horizontal progress indicator with steps: Pending (yellow), Under Review (blue), Approved (green), Released (gray outline); highlight the current step based on the `status` prop
- [x] Import `<RequestStatusTracker status={request.status} updatedAt={request.updatedAt} />` inside the `/requests` page and render it below each request row
- [x] Create `sisp-frontend\src\app\(protected)\requests\page.tsx` — render a list of document requests showing type, status (with color-coded badges: yellow=Pending, blue=Under Review, green=Approved, gray=Released), and date submitted
- [x] Add a "New Request" button that opens a modal with a `<select>` dropdown for document type and a `<textarea>` for notes
- [x] Implement modal submit: call `POST /requests` via Axios, close the modal on success, and refresh the requests list
- [x] Create `sisp-frontend\src\app\(protected)\schedule\page.tsx` — render a table of the student's current enrollments from `GET /enrollments`: Course Code, Title, Section, Units
- [x] Create `sisp-frontend\src\components\curriculum\CurriculumChecklist.tsx` — accept props: `curriculumCourses` (Course[] grouped by yearLevel and semester) and `completedCourseIds` (string[]); render each course as a list item; show a green checkmark icon from `lucide-react` if `course.id` is in `completedCourseIds`, a gray circle icon if not
- [x] Import `<CurriculumChecklist>` inside the `/curriculum` page; pass `curriculumCourses` from `GET /curricula` API response and `completedCourseIds` derived from the student's `EnrollmentHistory`
- [x] Create `sisp-frontend\src\app\(protected)\curriculum\page.tsx` — render a checklist of all curriculum courses grouped by Year Level and Semester using the `CurriculumChecklist` component; mark courses that appear in the student's enrollment history with a green checkmark

---

### 2.11 Zustand Stores — Phase 2

- [x] Create `sisp-frontend\src\stores\studentStore.ts` — state: `profile` (StudentProfile | null), `grades` (Grade[]), `paymentRequired` (boolean)
- [x] Implement `fetchProfile()` action: call `GET /students/me` and set `profile` in state
- [x] Implement `fetchGrades()` action: call `GET /grades`, set `grades` and `paymentRequired` from the response
- [x] Create `sisp-frontend\src\stores\requestStore.ts` — state: `requests` (DocumentRequest[])
- [x] Implement `fetchRequests()` action: call `GET /requests` and set `requests` in state
- [x] Implement `submitRequest(type, notes)` action: call `POST /requests` then call `fetchRequests()` to refresh

---

### 2.12 NotificationBell Component

- [x] Create `sisp-frontend\src\components\ui\NotificationBell.tsx` in VS Code
- [x] Display a bell icon from `lucide-react` with a red badge showing the unread notification count — fetch from `GET /notifications` on mount
- [x] Implement click behavior: clicking the bell toggles a dropdown list showing each unread notification message
- [x] Add a "Mark all as read" button inside the dropdown: call `PATCH /notifications/read-all` and then set the unread count to `0` in local state
- [x] Set up polling in `useEffect`: call `GET /notifications` every 30 seconds using `setInterval` and clear the interval in the `useEffect` cleanup return function
- [x] Import and add `<NotificationBell />` to `sisp-frontend\src\app\(protected)\layout.tsx` in the top navigation bar

---

## Phase 3: Chatbot MVP (ARIA) 

**Objective:** Build the complete NLP pipeline — intent classification, semantic retrieval, Groq LLM fallback, escalation queue, and the student-facing ChatWidget — so ARIA is functional end-to-end.

**Prerequisites (all must be ✅ before starting Phase 3):**

- ✅ All Phase 1 and Phase 2 checkboxes complete
- ✅ All academic endpoints tested in Postman
- ✅ RLS policies verified in Supabase
- ✅ Student frontend pages rendering data correctly

**📈 Phase 3 Progress: 0% - Ready to begin**

---

### 3.1 FastAPI Project Scaffolding

- [ ] Open a **new** CMD window and navigate to: `cd C:\Projects\sisp\sisp-ml`
- [ ] Create a Python virtual environment: `python -m venv .venv`
- [ ] Activate the virtual environment on Windows CMD: `.venv\Scripts\activate` — confirm the `(.venv)` prefix appears in the prompt
- [ ] Install all required packages: `pip install fastapi "uvicorn[standard]" scikit-learn sentence-transformers psycopg2-binary pgvector python-dotenv groq joblib httpx redis pytest`
- [ ] Freeze all dependencies: `pip freeze > requirements.txt`
- [ ] Create the folder structure from CMD (run each line separately):
  ```
  mkdir app
  mkdir app\routers
  mkdir app\services
  mkdir app\models
  mkdir app\data
  mkdir app\data\knowledge_base
  mkdir app\ml
  mkdir app\ml\models
  mkdir tests
  ```
- [ ] Create `sisp-ml\app\main.py` in VS Code: initialize the FastAPI app, add `CORSMiddleware` allowing `http://localhost:3001`, and define `GET /health` returning `{"status": "ok"}`
- [ ] Create `sisp-ml\app\config.py` in VS Code: load `.env` using `python-dotenv` and expose `DATABASE_URL`, `GROQ_API_KEY`, and `ML_SECRET_KEY` as module-level variables
- [ ] Create `sisp-ml\.env` in VS Code and set:
  ```
  DATABASE_URL=<your Supabase direct connection string port 5432>
  GROQ_API_KEY=<your key from console.groq.com>
  ML_SECRET_KEY=<a random secret string>
  ```
- [ ] Start the ML service from CMD (with venv active): `uvicorn app.main:app --reload --port 8000`
- [ ] In Postman, send `GET http://localhost:8000/health` — confirm `{"status": "ok"}`

---

### 3.2 Prisma Schema — Chatbot Tables

<!-- FIX #6: @@index([userId]) added to ChatLog model per Arch §2.7 -->

- [ ] Open `sisp-backend\prisma\schema.prisma` in VS Code and add the `ChatLog` model:
  ```prisma
  model ChatLog {
    id         String           @id @default(uuid())
    userId     String
    user       User             @relation(fields: [userId], references: [id])
    message    String
    response   String
    intent     String?
    confidence Float?
    source     String
    createdAt  DateTime         @default(now())
    escalation EscalationQueue?
    @@index([userId])
  }
  ```
  > **Note:** The `@@index([userId])` directive is required by Arch §2.7 for query performance on chat history retrieval by user.
- [ ] Add the `EscalationQueue` model:
  ```prisma
  model EscalationQueue {
    id           String    @id @default(uuid())
    chatLogId    String    @unique
    chatLog      ChatLog   @relation(fields: [chatLogId], references: [id])
    status       String    @default("open")
    assignedToId String?
    resolution   String?
    resolvedAt   DateTime?
    createdAt    DateTime  @default(now())
  }
  ```
- [ ] From CMD inside `sisp-backend`, run: `npx prisma migrate dev --name add_chatbot_tables`
- [ ] Confirm `ChatLog` and `EscalationQueue` appear in Supabase Table Editor

---

### 3.3 VectorEmbeddings Table Setup

<!-- FIX #1: Using all-MiniLM-L6-v2 (384 dimensions) — confirmed and aligned with architecture §2.6 -->

> **Note:** This table uses `vector(384)` dimensions, which corresponds to the `sentence-transformers/all-MiniLM-L6-v2` embedding model used throughout this project. This dimension is confirmed and aligned with the updated architecture §2.6. All embedding scripts and retrieval queries must use the same model consistently.

- [ ] Open the Supabase SQL Editor and run:
  ```sql
  CREATE TABLE IF NOT EXISTS "VectorEmbeddings" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(384) NOT NULL,
    source TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
  _(384 dimensions matches the `all-MiniLM-L6-v2` model used in this project — aligned with Arch §2.6)_
- [ ] Create the IVFFlat index — run in Supabase SQL Editor:
  ```sql
  CREATE INDEX ON "VectorEmbeddings" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
  ```
- [ ] Confirm the table and index exist by running `SELECT * FROM "VectorEmbeddings" LIMIT 1;` — expect no error

---

### 3.4 Intent Classifier — Training Data

- [ ] Create `sisp-ml\app\data\training_data.json` in VS Code as a JSON array of objects
- [ ] Add at least 30 labeled examples for `enrollment_inquiry` — e.g., "How do I enroll?", "When is the enrollment period?", "How do I add a subject?", "Can I drop a course?"
- [ ] Add at least 30 labeled examples for `grade_inquiry` — e.g., "What is my grade?", "When will grades be released?", "How is my GPA calculated?", "Did I pass?"
- [ ] Add at least 30 labeled examples for `payment_inquiry` — e.g., "How much is my tuition?", "When is the payment deadline?", "Do I have an outstanding balance?"
- [ ] Add at least 30 labeled examples for `document_request` — e.g., "I need a transcript", "How do I get a certificate of enrollment?", "Can I request a good moral certificate?"
- [ ] Add at least 30 labeled examples for `policy_question` — e.g., "What is the attendance policy?", "What happens if I fail?", "How many units can I take per semester?"
- [ ] Add at least 10 labeled examples for a `general` intent for unrecognized or out-of-scope queries
- [ ] Verify every object in the JSON has exactly two keys: `"text"` and `"intent"` — no extra fields
- [ ] Save a CSV version as `sisp-ml\app\data\training_data_v1.csv` with columns `text` and `intent` — this file will grow via the HITL loop

---

### 3.5 Intent Classifier — Training Script

- [ ] Create `sisp-ml\app\ml\train_classifier.py` in VS Code
- [ ] Write code to load `app\data\training_data.json` and extract `texts` (list of strings) and `labels` (list of intent strings)
- [ ] Import `Pipeline`, `TfidfVectorizer`, `LogisticRegression`, `train_test_split`, `classification_report` from scikit-learn
- [ ] Build the pipeline: `Pipeline([('tfidf', TfidfVectorizer(ngram_range=(1,2))), ('clf', LogisticRegression(max_iter=1000))])`
- [ ] Split data 80/20: `train_test_split(texts, labels, test_size=0.2, random_state=42)`
- [ ] Fit the pipeline on the training split
- [ ] Evaluate on the test split, print the classification report, and compute `accuracy_score`
- [ ] Assert accuracy >= 0.80: `assert accuracy >= 0.80, f"Accuracy {accuracy:.2f} is below the 0.80 threshold"`
- [ ] Save the trained model using joblib: `joblib.dump({"model": pipeline, "version": "v1", "accuracy": round(accuracy, 4)}, "app/ml/models/intent_classifier_v1.pkl")`
- [ ] Run the script from CMD (with venv active) inside `sisp-ml`: `python app\ml\train_classifier.py`
- [ ] Confirm the script prints the classification report and `app\ml\models\intent_classifier_v1.pkl` is created

---

### 3.6 Intent Classifier — Inference Service

- [ ] Create `sisp-ml\app\services\classifier_service.py` in VS Code
- [ ] At module level, call `joblib.load("app/ml/models/intent_classifier_v1.pkl")` and store the result in `_model_data`; extract `_pipeline = _model_data["model"]`
- [ ] Implement `classify(text: str) -> dict`:
  - `intent = _pipeline.predict([text])[0]`
  - `confidence = float(_pipeline.predict_proba([text])[0].max())`
  - If `confidence < 0.7`: `intent = "escalate"`, `escalate = True`, else `escalate = False`
  - Return `{"intent": intent, "confidence": round(confidence, 4), "escalate": escalate}`
- [ ] Create `sisp-ml\app\routers\classify.py` in VS Code — define a Pydantic request model `ClassifyRequest(text: str)` and a response model `ClassifyResponse(intent: str, confidence: float, escalate: bool)`
- [ ] Add `POST /classify` endpoint calling `classifier_service.classify(request.text)`
- [ ] Register the router in `app\main.py`: `app.include_router(classify.router)`
- [ ] Restart the FastAPI server and in Postman test `POST http://localhost:8000/classify` with body `{"text": "How do I enroll?"}` — confirm `intent = "enrollment_inquiry"` and `confidence >= 0.7`
- [ ] Test with body `{"text": "xkqowerhasdkjfh"}` — confirm `escalate = true`

---

### 3.7 pgvector Knowledge Base

- [ ] Create `sisp-ml\app\data\knowledge_base\enrollment_policy.txt` in VS Code — write 3–5 paragraphs about enrollment procedures, deadlines, and requirements for Regis Marie College
- [ ] Create `sisp-ml\app\data\knowledge_base\grading_policy.txt` — write 3–5 paragraphs about the grading system, GPA computation, and grade release procedures
- [ ] Create `sisp-ml\app\data\knowledge_base\document_requests.txt` — write 3–5 paragraphs about how to request documents, processing times, fees, and available document types
- [ ] Create `sisp-ml\app\ml\embed_documents.py` in VS Code
- [ ] Import `SentenceTransformer`, `psycopg2`, `os`, `json` and import `config` from `app.config`
- [ ] Load the embedding model at module level: `model = SentenceTransformer('all-MiniLM-L6-v2')`
- [ ] Write `chunk_text(text, max_chars=600)`: split text on `\n\n`, filter out empty strings, return list of chunks
- [ ] Write `embed_and_upsert(content, source, category)`: call `model.encode([content])[0].tolist()`, connect via psycopg2, INSERT into `"VectorEmbeddings"`, commit, close connection
- [ ] Loop through all `.txt` files in `app\data\knowledge_base\`, chunk each file, call `embed_and_upsert()` for every chunk
- [ ] Run the script from CMD (with venv active) inside `sisp-ml`: `python app\ml\embed_documents.py`
- [ ] Confirm rows appear in the Supabase `VectorEmbeddings` table in Table Editor

---

### 3.8 Vector Retrieval Service

- [ ] Create `sisp-ml\app\services\retrieval_service.py` in VS Code
- [ ] Import `psycopg2`, `SentenceTransformer`, and `config`
- [ ] Load the embedding model at module level: `_model = SentenceTransformer('all-MiniLM-L6-v2')`
- [ ] Implement `retrieve(query_text: str, top_k: int = 3) -> list`:
  - Generate query embedding: `query_vec = _model.encode([query_text])[0].tolist()`
  - Open a psycopg2 connection using `config.DATABASE_URL`
  - Execute: `SELECT content, 1 - (embedding <=> %s::vector) AS similarity FROM "VectorEmbeddings" ORDER BY embedding <=> %s::vector LIMIT %s`
  - Pass `(str(query_vec), str(query_vec), top_k)` as parameters
  - Return `[{"content": row[0], "similarity": round(row[1], 4)} for row in cursor.fetchall()]`
  - Close the connection in a `finally` block
- [ ] Create `sisp-ml\app\routers\retrieve.py` — define `RetrieveRequest(query: str, top_k: int = 3)` and `POST /retrieve` calling `retrieval_service.retrieve()`
- [ ] Register the router in `app\main.py`
- [ ] In Postman, test `POST http://localhost:8000/retrieve` with `{"query": "enrollment deadline"}` — confirm at least one result chunk is returned

---

### 3.9 Groq API Integration

- [ ] Create `sisp-ml\app\services\groq_service.py` in VS Code
- [ ] Import `groq` and `config`; initialize `_client = groq.Groq(api_key=config.GROQ_API_KEY)` at module level
- [ ] Define the system prompt constant:
  ```python
  SYSTEM_PROMPT = (
      "You are ARIA, an academic advisory assistant for Regis Marie College. "
      "Answer questions about enrollment, grades, documents, and school policies "
      "based only on the provided context. If the answer is not in the context, "
      "say: 'I don't have enough information on that. Please contact the registrar directly.' "
      "Keep responses concise and helpful."
  )
  ```
- [ ] Implement `call_groq(user_query: str, context: str) -> str`:
  - Build the user message: `f"Context:\n{context}\n\nQuestion: {user_query}"`
  - Call `_client.chat.completions.create(model="llama3-8b-8192", messages=[{"role":"system","content":SYSTEM_PROMPT},{"role":"user","content":<built message>}], max_tokens=512)`
  - Return `response.choices[0].message.content`
  - Wrap in `try/except groq.APIError` — return `"I'm having trouble connecting right now. Please try again later."` on error
- [ ] Test from CMD Python REPL (with venv active): `python -c "from app.services import groq_service; print(groq_service.call_groq('What is enrollment?', 'Enrollment starts Aug 1.'))"`

---

### 3.10 Chat Orchestration Endpoint

- [ ] Create `sisp-ml\app\services\chat_service.py` in VS Code
- [ ] Implement `process_chat(user_id: str, message: str) -> dict`:
  1. Call `classifier_service.classify(message)` → `intent, confidence, escalate`
  2. If `escalate` is `True`: return `{"response": "Your query has been forwarded to an adviser who will follow up with you.", "intent": "escalate", "confidence": confidence, "source": "classifier", "escalate": True}`
  3. Call `retrieval_service.retrieve(message, top_k=3)` → `results`
  4. If `results` is non-empty and `results[0]["similarity"] >= 0.5`: join top-3 content chunks as context, call `groq_service.call_groq(message, context)`, set `source = "groq_rag"`
  5. Else: call `groq_service.call_groq(message, "")`, set `source = "groq_direct"`
  6. Return `{"response": response_text, "intent": intent, "confidence": confidence, "source": source, "escalate": False}`
- [ ] Create `sisp-ml\app\routers\chat.py` — define `ChatRequest(user_id: str, message: str)` and `POST /chat` calling `chat_service.process_chat()`
- [ ] Register the chat router in `app\main.py`
- [ ] In Postman, test `POST http://localhost:8000/chat` with `{"user_id":"test","message":"How do I enroll?"}` — confirm a relevant response
- [ ] Test with a nonsense message — confirm the escalation response text is returned

---

### 3.11 NestJS ChatbotModule

- [ ] From CMD inside `sisp-backend`, run: `nest g module chatbot` then `nest g controller chatbot` then `nest g service chatbot`
- [ ] Import `HttpModule` into `ChatbotModule`
- [ ] Create `src\chatbot\dto\send-message.dto.ts` — Zod schema: `message` (string, min 1 char, max 1000 chars)
- [ ] Implement `ChatbotService.sendMessage(userId, message)`:
  1. Call `POST {ML_SERVICE_URL}/chat` via `HttpService` — use `firstValueFrom()` to convert the Observable: `const result = await firstValueFrom(this.httpService.post(url, { user_id: userId, message }))`
  2. Destructure `{ response, intent, confidence, source, escalate }` from `result.data`
  3. Create a `ChatLog` record via `prisma.chatLog.create()`
  4. If `escalate === true`: create an `EscalationQueue` record via `prisma.escalationQueue.create()` referencing the new `chatLog.id`
  5. Return `{ response, intent, confidence, source, escalate }`
- [ ] Implement `ChatbotService.getChatHistory(userId)`: call `prisma.chatLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 })`
- [ ] Add `POST /chat` in ChatbotController: apply `@UseGuards(JwtAuthGuard)`, call `sendMessage(currentUser.id, dto.message)`
- [ ] Add `GET /chat/history` in ChatbotController: apply `@UseGuards(JwtAuthGuard)`, call `getChatHistory(currentUser.id)`
- [ ] In Postman, test `POST http://localhost:3001/chat` with a student token and `{"message":"How do I enroll?"}` — confirm a `ChatLog` row appears in Supabase
- [ ] Test with a vague message — confirm an `EscalationQueue` row is created in Supabase
- [ ] Test `GET http://localhost:3001/chat/history` with a student token — confirm past messages are returned

---

### 3.12 Frontend ChatWidget

- [ ] Create `sisp-frontend\src\components\chat\ChatWidget.tsx` in VS Code
- [ ] Render a fixed floating button in the bottom-right corner using `position: fixed`, `bottom-6`, `right-6` Tailwind classes and a `MessageCircle` icon from `lucide-react`
- [ ] Clicking the button toggles a chat panel open (a tall card rendered above the button)
- [ ] Inside the chat panel, render a scrollable `<div>` listing messages — user messages right-aligned with blue background, ARIA responses left-aligned with gray background
- [ ] Render a text `<input>` and "Send" `<button>` at the bottom of the panel
- [ ] On send: immediately append the user message to local state (optimistic update), call `POST /chat` via Axios, then append ARIA's response once the API responds
- [ ] Show a spinning loader icon in the message list while waiting for the response
- [ ] If the response contains the escalation message text, render it in orange with an info icon
- [ ] Import and render `<ChatWidget />` in `sisp-frontend\src\app\(protected)\layout.tsx`
- [ ] Test manually: start both dev servers, open the dashboard, click the chat button, send a message, confirm ARIA's response appears

---

### 3.13 Zustand chatStore

- [ ] Create `sisp-frontend\src\stores\chatStore.ts` in VS Code
- [ ] Define the `ChatMessage` type: `{ role: 'user' | 'aria', content: string, timestamp: Date }`
- [ ] Define store state: `messages` (ChatMessage[]), `isOpen` (boolean), `isLoading` (boolean)
- [ ] Implement `sendMessage(text)` action: set `isLoading = true`, call `POST /chat`, append both user and ARIA messages to `messages`, set `isLoading = false`; on API error, append an ARIA error message and set `isLoading = false`
- [ ] Implement `toggleOpen()` action: flip `isOpen`
- [ ] Implement `loadHistory()` action: call `GET /chat/history`, map each `ChatLog` into two `ChatMessage` entries, set `messages`
- [ ] Replace all local state in `ChatWidget.tsx` with `chatStore` actions and selectors

---

### 3.14 Escalation Review — Adviser Page

- [ ] Add `GET /admin/escalations` endpoint in ChatbotController: apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin_staff', 'dean')`, call `prisma.escalationQueue.findMany({ where: { status: 'open' }, include: { chatLog: true } })`
- [ ] Add `PATCH /admin/escalations/:id` endpoint: accept body `{ resolution: string }`, update the record setting `status = 'resolved'`, `resolvedAt = new Date()`, save `resolution`; then call `POST {ML_SERVICE_URL}/ml/feedback` via HttpService with `{ text: chatLog.message, intent: <corrected intent> }`
- [ ] Create `sisp-ml\app\routers\feedback.py` in VS Code — define `FeedbackRequest(text: str, intent: str)` and `POST /ml/feedback` endpoint: check `X-ML-Secret` header matches `config.ML_SECRET_KEY`; open `app\data\training_data_v1.csv` in append mode (Python `open(path, 'a')`) and write a new CSV row
- [ ] Register the feedback router in `sisp-ml\app\main.py`
- [ ] Create `sisp-frontend\src\app\(protected)\admin\escalations\page.tsx` in VS Code
- [ ] Fetch open escalations from `GET /admin/escalations` on page load
- [ ] Render each escalation as a card showing: the student's original message, ARIA's response, and confidence score
- [ ] Add a `<textarea>` for the adviser's resolution text and a "Resolve" button that calls `PATCH /admin/escalations/:id` with the resolution
- [ ] On successful resolve, remove the card from the list
- [ ] In Postman, test the full loop: send a low-confidence chat message via NestJS → confirm escalation row in Supabase → resolve via the PATCH endpoint → confirm `training_data_v1.csv` has a new line appended (open the file in VS Code to verify)

---

## Phase 4: Admin Dashboard & Analytics

**Objective:** Build Admin, Faculty, and Dean dashboards, analytics endpoints with chart data, grade upload workflows, and report export features.

**Prerequisites (all must be ✅ before starting Phase 4):**

- ⏳ All Phase 1, 2, and 3 checkboxes complete
- ⏳ Full chatbot loop (classify → retrieve → escalate → resolve) working end-to-end
- ⏳ `POST /chat` via NestJS saving to `ChatLog` and creating `EscalationQueue` records correctly

**📈 Phase 4 Progress: 0% - Waiting for Phase 3 completion**

---

### 4.1 AdminModule — Backend

- [ ] From CMD inside `sisp-backend`, run: `nest g module admin` then `nest g controller admin` then `nest g service admin`
- [ ] Implement `AdminService.listUsers(page, limit)`: call `prisma.user.findMany` with `include: { role: true }`, skip `(page-1)*limit`, take `limit`; also call `prisma.user.count()` for total; return `{ data, total }`
- [ ] Implement `AdminService.updateUserRole(userId, roleId)`: call `prisma.user.update({ where: { id: userId }, data: { roleId } })`
- [ ] Implement `AdminService.deactivateUser(userId)`: call `prisma.user.update({ where: { id: userId }, data: { isActive: false } })`
- [ ] Add `GET /admin/users` endpoint: apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin_staff')`, call `AdminService.listUsers()`
- [ ] Add `PATCH /admin/users/:id/role` endpoint: apply guards + `@Roles('admin_staff')`, call `AdminService.updateUserRole()`
- [ ] Add `PATCH /admin/users/:id/deactivate` endpoint: apply guards + `@Roles('admin_staff')`, call `AdminService.deactivateUser()`
- [ ] Update `JwtStrategy.validate()` in `sisp-backend\src\auth\strategies\jwt.strategy.ts`: after looking up the user by `payload.sub`, if `user.isActive === false` throw `UnauthorizedException`
- [ ] In Postman, test `GET /admin/users` with an admin token — confirm paginated user list is returned
- [ ] In Postman, call `PATCH /admin/users/:id/deactivate` on a test user, then try logging in as that user — confirm `401`

---

### 4.2 AnalyticsModule — Backend

- [ ] From CMD inside `sisp-backend`, run: `nest g module analytics` then `nest g controller analytics` then `nest g service analytics`
- [ ] Implement `AnalyticsService.getEnrollmentStats()`: use `prisma.studentProfile.groupBy({ by: ['programId'], _count: true })` for per-program counts; use `prisma.enrollment.count()` for total enrolled
- [ ] Implement `AnalyticsService.getGpaDistribution()`: query all visible grades, group `finalGrade` values into brackets (1.0–1.5, 1.5–2.0, 2.0–2.5, 2.5–3.0, 3.0+) in JavaScript, return bracket counts
- [ ] Implement `AnalyticsService.getPassFailRates()`: for each course, count enrollments where `grade.finalGrade <= 3.0` (pass) and `> 3.0` (fail) using Prisma groupBy
- [ ] Implement `AnalyticsService.getRequestVolume()`: use `prisma.documentRequest.groupBy({ by: ['type', 'status'], _count: true })`
- [ ] Implement `AnalyticsService.getChatbotAnalytics()`: query total `ChatLog` count, group by `intent`, compute average confidence, compute escalation rate as `escalated count / total count`
- [ ] Add `GET /analytics/enrollment` endpoint: apply guards + `@Roles('admin_staff', 'dean')`
- [ ] Add `GET /analytics/grades` endpoint: apply guards + `@Roles('admin_staff', 'dean', 'faculty')`
- [ ] Add `GET /analytics/requests` endpoint: apply guards + `@Roles('admin_staff')`
- [ ] Add `GET /analytics/chatbot` endpoint: apply guards + `@Roles('admin_staff')`
- [ ] In Postman, test each analytics endpoint with an admin token — confirm non-empty responses

---

### 4.3 Report Export Endpoints

- [ ] From CMD inside `sisp-backend`, run: `pnpm add exceljs pdfkit` and `pnpm add -D @types/pdfkit`
- [ ] Implement `AnalyticsService.exportEnrollmentExcel()`: create an `ExcelJS.Workbook`, add a worksheet with headers (Student Number, Name, Program, Year Level, Status), query all enrolled students from Prisma, add each as a row, return `workbook.xlsx.writeBuffer()` as a `Buffer`
- [ ] Implement `AnalyticsService.exportGradesPdf(studentId)`: use `pdfkit` to generate a PDF with the student's name, student number, program, and a grade table; pipe to a `Buffer`, return the `Buffer`
- [ ] Add `GET /analytics/export/enrollment` endpoint: set `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename=enrollment.xlsx` on the Express `res` object, call `res.send(buffer)`
- [ ] Add `GET /analytics/export/grades/:studentId` endpoint: apply guards + `@Roles('admin_staff')`, set PDF headers, call `res.send(pdfBuffer)`
- [ ] In Postman, call `GET /analytics/export/enrollment` → click **Save Response → Save to a file** → open the file in Excel and verify data
- [ ] Call `GET /analytics/export/grades/:studentId` → save the response as a `.pdf` → open it and verify student name and grades appear

---

### 4.4 Frontend Admin Dashboard

<!-- FIX #3: adminStore creation steps added before dashboard page -->

- [ ] From CMD inside `sisp-frontend`, run: `pnpm add recharts`
- [ ] Create `sisp-frontend\src\stores\adminStore.ts` in VS Code
- [ ] Define the store state interface: `enrollmentStats` (object | null), `gpaDistribution` (object | null), `requestVolume` (object | null), `chatbotAnalytics` (object | null), `isLoading` (boolean)
- [ ] Implement `fetchEnrollmentStats()` action: call `GET /analytics/enrollment` via Axios, set result in `enrollmentStats` state
- [ ] Implement `fetchGpaDistribution()` action: call `GET /analytics/grades` via Axios, set result in `gpaDistribution` state
- [ ] Implement `fetchRequestVolume()` action: call `GET /analytics/requests` via Axios, set result in `requestVolume` state
- [ ] Implement `fetchChatbotAnalytics()` action: call `GET /analytics/chatbot` via Axios, set result in `chatbotAnalytics` state
- [ ] Export `useAdminStore` as the named hook from `adminStore.ts`
- [ ] Create `sisp-frontend\src\app\(protected)\admin\dashboard\page.tsx` in VS Code
- [ ] Import `useAdminStore()` at the top of the admin dashboard page and call all four fetch actions inside `useEffect` on mount — use `isLoading` state to show a spinner while data loads
- [ ] Add four stat cards using data from the store selectors: Total Students, Total Document Requests, Chatbot Escalation Rate, Average Confidence Score
- [ ] Add a `BarChart` from `recharts` for enrollment counts per program — data from `enrollmentStats` store selector
- [ ] Add a `PieChart` from `recharts` for document request volume by type — data from `requestVolume` store selector
- [ ] Add a "Download Enrollment Report" `<button>` that calls `GET /analytics/export/enrollment` and downloads the file using `URL.createObjectURL(blob)` with a temporary `<a>` element
- [ ] Create `sisp-frontend\src\components\admin\AdminDashboard.tsx` as a layout wrapper component for the admin dashboard page

---

### 4.5 Frontend Faculty Pages

- [ ] Add `GET /faculty/courses` endpoint in the backend: apply `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('faculty')`, return all `Course` records where `instructorId = currentUser.id`
- [ ] Add `GET /grades/course/:courseId` endpoint in GradesController: apply guards + `@Roles('faculty', 'admin_staff')`, return all `Enrollment` records for the course with joined student name and grade data
- [ ] Create `sisp-frontend\src\app\(protected)\faculty\grades\page.tsx` in VS Code
- [ ] Render a `<select>` dropdown populated with courses from `GET /faculty/courses`
- [ ] When a course is selected, fetch and display enrollment + grade data from `GET /grades/course/:courseId`
- [ ] Create `sisp-frontend\src\components\grades\GradeTable.tsx` — a table with one row per student, and prelim/midterm/finals as `<input type="number">` cells; track changed values in `useState`
- [ ] Implement "Save Grades" button: loop through changed rows and call `POST /grades` for each changed row, show a success message on completion
- [ ] Implement "Release All Grades" button: call `PATCH /grades/:id/release` for every grade in the course, show a success message

---

### 4.6 Frontend Dean Pages

- [ ] Create `sisp-frontend\src\app\(protected)\dean\dashboard\page.tsx` in VS Code
- [ ] Fetch GPA distribution data from `GET /analytics/grades` and render as a `BarChart`
- [ ] Fetch pass/fail rates per course from `GET /analytics/grades` and render as a second `BarChart`
- [ ] Compute and display the school-wide average GPA from the distribution data in a summary card

---

### 4.7 Dean Exception Workflows

<!-- FIX #9: Dean exception approval endpoint and frontend page added per Arch §3.8 and §4.1 -->

- [ ] Add `POST /dean/approve-exception` in AdminModule controller: apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('dean')`; accept body `{ type: ('grade_override' | 'enrollment_override'), targetId: string, decision: ('approved' | 'rejected'), notes: string }`
- [ ] Implement `AdminService.approveException(dto, deanUserId)`: write an `AuditLog` row with `action = 'dean_exception_approval'`, `userId = deanUserId`, `resource = dto.type`, `resourceId = dto.targetId`; update the target record's status based on `dto.decision`; return the updated record
- [ ] Create `sisp-frontend\src\app\(protected)\dean\exceptions\page.tsx` in VS Code — fetch pending exceptions from `GET /admin/escalations` (filtered by type where applicable); render each as a card showing the original request details, type, and current status
- [ ] Add an "Approve" button on each exception card that calls `POST /dean/approve-exception` with `decision: 'approved'` and the `notes` from a `<textarea>` input
- [ ] Add a "Reject" button on each exception card that calls `POST /dean/approve-exception` with `decision: 'rejected'` and the `notes` from the same `<textarea>` input
- [ ] On successful approval or rejection, remove the card from the list and display a success message
- [ ] In Postman, send `POST /dean/approve-exception` with a dean token and a valid payload — confirm `201` and a new row in the `AuditLog` table in Supabase
- [ ] In Postman, send `POST /dean/approve-exception` with a student token — confirm `403 Forbidden`

---

## Phase 5: ML Refinement, HITL, Testing & Deployment

**Objective:** Harden the ML pipeline, write complete test suites, benchmark performance, and deploy all three services to production with CI/CD.

**Prerequisites (all must be ✅ before starting Phase 5):**

- ⏳ All Phase 1, 2, 3, and 4 checkboxes complete
- ⏳ All admin, faculty, and dean pages rendering correctly
- ⏳ All analytics endpoints returning data
- ⏳ Escalation resolution flow saving corrections to the CSV

**📈 Phase 5 Progress: 0% - Final phase after all others complete**

---

### 5.1 HITL Feedback Loop & Model Retraining

- [ ] Create `sisp-ml\app\ml\retrain.py` in VS Code
- [ ] Write code to load `app\data\training_data_v1.csv` using Python's `csv.DictReader`
- [ ] Use the same `Pipeline` structure as `train_classifier.py` to retrain on the updated CSV data
- [ ] Detect the current highest version number by listing `app\ml\models\` for `.pkl` files using `os.listdir`, parse the version numbers, and increment by 1
- [ ] Save the new model as `intent_classifier_v<N>.pkl` with metadata `{"model": pipeline, "version": "v<N>", "accuracy": float, "trained_at": datetime.now().isoformat()}`
- [ ] Update `classifier_service.py` so the `load_model()` function auto-selects the latest `.pkl`: list all `.pkl` files, sort by version suffix, load the highest
- [ ] Create `sisp-ml\app\routers\admin.py` in VS Code — add `POST /ml/retrain` endpoint: check `X-ML-Secret` header; use FastAPI `BackgroundTasks` to call `retrain()` in the background and return `{"status": "retraining started"}` immediately
- [ ] Add `GET /ml/model-info` endpoint in the same router: return current model version, training date, and accuracy score from the loaded model metadata
- [ ] Register `admin.router` in `app\main.py`
- [ ] In Postman, manually append 5 new rows to `training_data_v1.csv` in VS Code, then call `POST http://localhost:8000/ml/retrain` with header `X-ML-Secret: <your secret>` — confirm a new `.pkl` appears in `app\ml\models\` and `GET /ml/model-info` returns the new version

---

### 5.2 Groq API Response Caching

- [ ] Sign up for a free account at upstash.com → create a new Redis database
- [ ] Copy the Redis connection URL from Upstash (format: `redis://:<password>@<host>:<port>`) and add it to `sisp-ml\.env` as `REDIS_URL`
- [ ] Add `REDIS_URL` to `sisp-ml\app\config.py` so it is loaded from `.env`
- [ ] Create `sisp-ml\app\services\cache_service.py` in VS Code
- [ ] Initialize `_client = redis.from_url(config.REDIS_URL)` at module level inside a `try/except` — set `_client = None` if the connection fails
- [ ] Implement `get(key: str) -> str | None`: if `_client` is None return `None`; call `_client.get(key)`, decode bytes if not None, catch any `redis.RedisError` and return `None`
- [ ] Implement `set(key: str, value: str, ttl: int = 3600)`: if `_client` is None return; call `_client.setex(key, ttl, value)`, catch and silence `redis.RedisError`
- [ ] Update `groq_service.call_groq()`:
  - Import `hashlib` and compute: `cache_key = "groq:" + hashlib.md5(f"{context[:200]}{user_query}".encode()).hexdigest()`
  - Call `cache_service.get(cache_key)` — if a cached value exists, return it immediately without calling Groq
  - After receiving a live Groq response, call `cache_service.set(cache_key, response, ttl=3600)`
- [ ] Test in Postman: send the same chat query twice — the second call should respond faster

---

### 5.3 pgvector Index Tuning

- [ ] Open the Supabase SQL Editor and run an `EXPLAIN ANALYZE` on the similarity query using a real embedding vector from the `VectorEmbeddings` table
- [ ] Paste the output into `docs\pgvector_benchmark.txt` and note the "Execution Time" value
- [ ] Update `retrieval_service.py` to set `SET LOCAL ivfflat.probes = 10;` before the SELECT on the same connection cursor, then execute the SELECT — this improves recall at the cost of a small speed tradeoff
- [ ] Re-run `EXPLAIN ANALYZE` with the updated query and paste the new output below the first one in `docs\pgvector_benchmark.txt`
- [ ] Confirm execution time is under 500ms for the current dataset size

---

### 5.4 Unit Tests — NestJS (Jest)

- [ ] Create `sisp-backend\src\auth\auth.service.spec.ts` in VS Code
- [ ] Write a test for `register()`: mock `PrismaService.user.create` with `jest.fn()` and mock `bcrypt.hash`; assert `create` was called with the hashed password (not plain text)
- [ ] Write a test for `login()` success: mock `validateUser` to return a fake user object; assert the return value contains `accessToken` and `refreshToken`
- [ ] Write a test for `login()` failure: mock `validateUser` to throw `UnauthorizedException`; assert the exception propagates
- [ ] Create `sisp-backend\src\grades\grades.service.spec.ts` in VS Code
- [ ] Write a test for `getMyGrades()` when balance status is `unpaid`: mock the `AccountBalance` Prisma query to return `{ status: 'unpaid' }`; assert the return is `{ grades: [], paymentRequired: true }`
- [ ] Write a test for `getMyGrades()` when balance status is `paid`: mock `AccountBalance` to return `{ status: 'paid' }` and mock the grade query to return sample data; assert `paymentRequired: false` and grades array is non-empty
- [ ] Create `sisp-backend\src\documents\documents.service.spec.ts` in VS Code
- [ ] Write a test for `updateStatus()` with valid transition `Pending → Under Review`: mock `prisma.documentRequest.findUnique` to return `{ status: 'Pending' }`; assert `prisma.documentRequest.update` is called with `{ status: 'Under Review' }`
- [ ] Write a test for `updateStatus()` with invalid transition `Pending → Released`: assert `BadRequestException` is thrown
- [ ] Create `sisp-backend\src\common\guards\roles.guard.spec.ts` in VS Code
- [ ] Write a test for `RolesGuard.canActivate()` with mismatched role: mock execution context to return user with role `student` and required role `admin_staff`; assert `canActivate()` returns `false`
- [ ] Write a test with matching role: assert `canActivate()` returns `true`
- [ ] From CMD inside `sisp-backend`, run: `pnpm test` — all tests must pass (green output)

---

### 5.5 Unit Tests — FastAPI Classifier (pytest)

- [ ] Create `sisp-ml\tests\__init__.py` in VS Code (empty file — required for pytest to find the tests folder)
- [ ] Create `sisp-ml\tests\test_classifier.py` in VS Code
- [ ] Write a test: assert `classify("How do I enroll?")["intent"] == "enrollment_inquiry"` and `confidence >= 0.7`
- [ ] Write a test: assert `classify("What is my grade in Math?")["intent"] == "grade_inquiry"`
- [ ] Write a test: assert `classify("When is the tuition deadline?")["intent"] == "payment_inquiry"`
- [ ] Write a test: assert `classify("I need a transcript")["intent"] == "document_request"`
- [ ] Write a test: assert `classify("xkqowerhasdkjfh")["escalate"] == True`
- [ ] Create `sisp-ml\tests\test_retrieval.py` in VS Code
- [ ] Write a test marked with `@pytest.mark.skipif(not DB_AVAILABLE, reason="requires live DB")` that calls `retrieve("enrollment deadline", top_k=3)` and asserts the result list is non-empty
- [ ] From CMD inside `sisp-ml` (with venv active), run: `pytest tests\test_classifier.py -v` — all tests must pass

---

### 5.6 Integration Tests

- [ ] Create `sisp-backend\test\auth.e2e-spec.ts` in VS Code (NestJS e2e uses `supertest`)
- [ ] Write an e2e test for the login → dashboard flow: call `POST /auth/login` with valid credentials, use the returned token to call `GET /students/me`, assert both return `200`
- [ ] Write an e2e test for the request submission flow: login → `POST /requests` → `GET /requests` — assert the new request appears with `status: 'Pending'`
- [ ] Write an e2e test for the chat → escalation flow: login → `POST /chat` with a low-confidence message → login as admin → `GET /admin/escalations` — assert at least one open escalation exists
- [ ] From CMD inside `sisp-backend`, run: `pnpm test:e2e` — all three tests must pass

---

### 5.7 UAT Preparation

- [ ] Create `docs\uat_test_accounts.md` in VS Code listing credentials for: 5 test student accounts, 1 faculty account, 1 admin_staff account, 1 dean account
- [ ] Insert all test accounts into the database by updating `prisma\seed.ts` and re-running `npx prisma db seed`, or by inserting directly in Supabase Table Editor
- [ ] Pre-populate the database with realistic data: at least 10 `StudentProfile` records, 5 `Course` records, 2 `Program` records, 20 `ChatLog` records with varied intents
- [ ] Create `docs\uat_test_scripts.md` in VS Code with step-by-step scenarios for each role:
  - **Student scenario:** Log in → View grades (test both payment-gated and released) → Submit a document request → Ask ARIA a question → Verify notification bell updates after request status change
  - **Faculty scenario:** Log in → Select an assigned course → Enter grades for three students → Click Release All Grades → Log in as student and verify grades are now visible
  - **Admin Staff scenario:** Log in → Update a document request through all four stages → View analytics dashboard → Deactivate a test user → Review and resolve an open escalation
  - **Dean scenario:** Log in → View GPA distribution chart → View pass/fail rates per course → Submit an exception approval via the `/dean/exceptions` page

---

### 5.8 Performance Benchmark Tests

- [ ] Download and install k6 for Windows from k6.io (use the Windows installer `.msi`)
- [ ] Open a new CMD window and verify: `k6 version`
- [ ] Create `docs\benchmark\api_benchmark.js` in VS Code — write a k6 script that logs in once, stores the token, then sends `GET /students/me` 100 times and records response times
- [ ] From CMD, run: `k6 run docs\benchmark\api_benchmark.js`
- [ ] Record the p95 response time from the k6 output in `docs\benchmark_results.md`
- [ ] Confirm p95 is under 2000ms — if not, open Prisma Studio (`npx prisma studio` from `sisp-backend`) to inspect the query, and add a missing Prisma `@@index` if needed
- [ ] Create `docs\benchmark\chatbot_benchmark.js` in VS Code — write a k6 script that sends `POST /chat` via the NestJS backend with 10 varied messages
- [ ] From CMD, run: `k6 run docs\benchmark\chatbot_benchmark.js`
- [ ] Record the p95 chatbot response time in `docs\benchmark_results.md`
- [ ] Confirm p95 is under 3000ms — if not, add timing print statements to `chat_service.py` to identify the slowest step (classify, retrieve, or Groq)

---

### 5.9 Supabase Production Checklist

- [ ] Open Supabase dashboard → Table Editor → for each sensitive table, confirm the RLS toggle is ON: `Grade`, `StudentProfile`, `AccountBalance`, `DocumentRequest`, `ChatLog`, `EscalationQueue`
- [ ] Go to the Policies tab for each table above and confirm all policies from Phase 2 and Phase 3 are still listed as active
- [ ] Go to **Project Settings → Database → Connection Pooling** and enable PgBouncer in **Transaction mode**; set pool size to `10`
- [ ] Go to **Project Settings → Backups** and enable automated daily backups
- [ ] From CMD inside `sisp-backend`, run migrations against the production database: `npx prisma migrate deploy`
- [ ] Verify all tables and indexes appear in the Supabase dashboard after migration completes

---

### 5.10 Vercel Deployment — Frontend

- [ ] Go to vercel.com, create an account, and click "Add New Project"
- [ ] Import the `sisp` GitHub repository from the list
- [ ] Set **Root Directory** to `sisp-frontend` in the Vercel project settings
- [ ] Set **Framework Preset** to `Next.js`
- [ ] Add environment variable `NEXT_PUBLIC_API_URL` — set the value to the production NestJS Render URL (complete after step 5.11)
- [ ] Trigger the first deployment from the Vercel dashboard
- [ ] Wait for the build to complete and confirm the app is accessible at the Vercel-provided URL
- [ ] Confirm HTTPS is active on the URL (Vercel enforces HTTPS by default)
- [ ] After completing step 5.11, return here, update `NEXT_PUBLIC_API_URL` in Vercel, and click **Redeploy**

---

### 5.11 Render Deployment — NestJS Backend

- [ ] Go to render.com, create an account, click "New +" → "Web Service"
- [ ] Connect the `sisp` GitHub repository and set **Root Directory** to `sisp-backend`
- [ ] Set **Runtime** to `Node`
- [ ] Set **Build Command** to: `npm install -g pnpm && pnpm install && pnpm build && npx prisma generate && npx prisma migrate deploy`
- [ ] Set **Start Command** to: `node dist/main.js`
- [ ] Add all environment variables in the Render dashboard: `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL` (Vercel URL), `NODE_ENV=production`, `PORT=3001`
- [ ] Leave `ML_SERVICE_URL` blank for now — set it after the ML service is deployed in step 5.12
- [ ] Click "Create Web Service" and monitor the build logs in Render
- [ ] Once deployed, copy the Render backend URL (e.g., `https://sisp-backend.onrender.com`)
- [ ] In Postman, test `POST https://sisp-backend.onrender.com/auth/login` — confirm a `200` response with tokens
- [ ] Return to Vercel and update `NEXT_PUBLIC_API_URL` with this Render URL, then redeploy

---

### 5.12 Render Deployment — FastAPI ML Service

- [ ] Open Supabase dashboard → **Storage** → create a new public bucket named `ml-models`
- [ ] Upload `sisp-ml\app\ml\models\intent_classifier_v1.pkl` to the `ml-models` bucket and copy its public URL
- [ ] Create `sisp-ml\app\startup.py` in VS Code — write code that checks if `app/ml/models/intent_classifier_v1.pkl` exists; if not, download it from the Supabase Storage public URL using `httpx` and save it to the correct path
- [ ] Add `MODEL_URL=<Supabase Storage public URL for the pkl>` to `sisp-ml\.env`
- [ ] Update `app\config.py` to expose `MODEL_URL`
- [ ] Go to render.com → "New +" → "Web Service" → connect the `sisp` repository → set **Root Directory** to `sisp-ml`
- [ ] Set **Runtime** to `Python 3`
- [ ] Set **Build Command** to: `pip install -r requirements.txt`
- [ ] Set **Start Command** to: `python app/startup.py && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Add environment variables: `DATABASE_URL`, `GROQ_API_KEY`, `ML_SECRET_KEY`, `REDIS_URL`, `MODEL_URL`
- [ ] Click "Create Web Service" and monitor the build logs
- [ ] Once deployed, test `GET https://sisp-ml.onrender.com/health` in Postman — confirm `{"status": "ok"}`
- [ ] Copy the Render ML service URL and update `ML_SERVICE_URL` in the NestJS backend Render service environment variables, then redeploy the backend

---

### 5.13 GitHub Actions CI/CD — Deploy Jobs

- [ ] Go to the Render dashboard → `sisp-backend` service → **Settings** → scroll to "Deploy Hook" → copy the deploy hook URL
- [ ] Go to your `sisp` GitHub repository → **Settings** → **Secrets and variables** → **Actions** → click "New repository secret" → name: `RENDER_BACKEND_DEPLOY_HOOK`, value: the copied URL
- [ ] Repeat for the ML service: copy its Render deploy hook URL and save as GitHub secret `RENDER_ML_DEPLOY_HOOK`
- [ ] Open `sisp\.github\workflows\backend.yml` in VS Code and add a `deploy` job after `lint-test-build`:
  ```yaml
  deploy:
    needs: lint-test-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Trigger Render deploy
        run: curl -X POST ${{ secrets.RENDER_BACKEND_DEPLOY_HOOK }}
  ```
- [ ] Add the same `deploy` job to `sisp\.github\workflows\ml.yml` using `RENDER_ML_DEPLOY_HOOK`
- [ ] Vercel auto-deploys from the `sisp-frontend` path on pushes to `main` — no additional CI step needed
- [ ] From CMD in the monorepo root, commit and push to main: `git add .` → `git commit -m "ci: add render deploy hooks"` → `git push origin main`
- [ ] Open GitHub → **Actions** tab — confirm the backend and ML pipelines each show all jobs completing (lint-test-build → deploy)

---

### 5.14 Final Pre-Launch Checklist

- [ ] Open the production Vercel URL in a browser and confirm the login page loads over HTTPS
- [ ] Log in with a test student account on production — confirm redirect to `/dashboard` and profile data loads correctly
- [ ] Verify JWT expiry: note the login time, wait 16 minutes, then reload a protected page — confirm the Axios interceptor refreshes the token automatically and the page continues working
- [ ] Verify refresh token: call `POST /auth/refresh` on the production backend URL in Postman with a valid refresh token — confirm a new access token is returned
- [ ] Run the RBAC audit — for each test below, confirm the response code:
  - [ ] Student token calling `GET /admin/users` → confirm `403`
  - [ ] Student token calling `GET /analytics/enrollment` → confirm `403`
  - [ ] Faculty token calling `PATCH /admin/users/:id/role` → confirm `403`
  - [ ] Dean token calling `PATCH /requests/:id` → confirm `403`
- [ ] Test ARIA on production: send 5 chat messages covering enrollment, grade, payment, document request, and a nonsense input — confirm appropriate responses for each
- [ ] Update a document request status on production as admin_staff — confirm the student's notification bell badge count increases
- [ ] Run `EXPLAIN ANALYZE` on the production pgvector similarity query in the Supabase SQL Editor — confirm execution time is under 500ms
- [ ] Data Privacy Act compliance audit:
  - [ ] Inspect a `User` row in Supabase — confirm `passwordHash` starts with `$2b$` (bcrypt prefix) and no plaintext password is stored
  - [ ] Confirm all three production service URLs use HTTPS
  - [ ] Confirm the Next.js registration page has a data privacy consent checkbox that must be checked before the form can be submitted — verify the Register button is disabled when unchecked
  - [ ] Confirm `ChatLog`, `DocumentRequest`, and `EscalationQueue` production rows all have `createdAt` timestamps
  - [ ] Call `GET /students/me` with Student A's token — confirm Student B's data is NOT visible in the response
  - [ ] Open the `AuditLog` table in Supabase and confirm mutating actions from production testing are recorded with correct `userId`, `action`, and `resource` values
- [ ] Tag the production release from CMD in the monorepo root:
  ```
  git tag v1.0.0
  git push origin v1.0.0
  ```

---

## Quick Reference — Tech Stack Commands

> All commands use **Windows CMD** syntax. Open a new CMD window for each service. Do NOT use PowerShell for the FastAPI venv activation — use CMD.

---

### Scaffold Commands

```cmd
:: ── Monorepo root setup ──────────────────────────────────────
mkdir C:\Projects\sisp
cd C:\Projects\sisp
git init

:: ── Next.js frontend (from C:\Projects\sisp) ─────────────────
pnpm create next-app sisp-frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

:: ── NestJS backend (from C:\Projects\sisp\sisp-backend) ──────
nest new . --package-manager pnpm

:: ── FastAPI ML service (from C:\Projects\sisp\sisp-ml) ───────
python -m venv .venv
.venv\Scripts\activate
pip install fastapi "uvicorn[standard]" scikit-learn sentence-transformers psycopg2-binary pgvector python-dotenv groq joblib httpx redis pytest
pip freeze > requirements.txt
mkdir app app\routers app\services app\models app\data app\data\knowledge_base app\ml app\ml\models tests
```

---

### Prisma Commands (run from `sisp-backend` in CMD)

```cmd
:: Initialize Prisma
npx prisma init --datasource-provider postgresql

:: Create and apply a new migration (dev)
npx prisma migrate dev --name <migration_name>

:: Apply migrations on production (no interactive prompt)
npx prisma migrate deploy

:: Regenerate the Prisma client after schema changes
npx prisma generate

:: Run the seed script
npx prisma db seed

:: Open Prisma Studio — visual DB browser at http://localhost:5555
npx prisma studio
```

---

### Key Dependency Install Commands

```cmd
:: ── NestJS backend (run from sisp-backend) ───────────────────
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/axios
pnpm add passport passport-jwt bcrypt zod nestjs-zod class-validator class-transformer rxjs
pnpm add prisma @prisma/client exceljs pdfkit
pnpm add -D @types/passport-jwt @types/bcrypt @types/pdfkit ts-node

:: ── Next.js frontend (run from sisp-frontend) ────────────────
pnpm add zustand axios react-hook-form zod @hookform/resolvers lucide-react recharts
pnpm dlx shadcn-ui@latest init

:: ── FastAPI ML service (run from sisp-ml WITH venv active) ───
pip install fastapi "uvicorn[standard]" scikit-learn sentence-transformers
pip install psycopg2-binary pgvector python-dotenv groq joblib httpx redis pytest
pip freeze > requirements.txt
```

---

### NestJS Module Generation (run from `sisp-backend` in CMD)

```cmd
:: Repeat this pattern for each module name:
:: auth, users, students, grades, enrollment, documents, notifications, chatbot, admin, analytics
nest g module <n>
nest g controller <n>
nest g service <n>
```

---

### Testing Commands

```cmd
:: ── NestJS unit tests (from sisp-backend) ───────────────────
pnpm test
pnpm test:cov
pnpm test:e2e

:: ── FastAPI tests (from sisp-ml with venv active) ────────────
pytest tests\ -v
pytest tests\ -v --cov=app --cov-report=term-missing
```

---

### Run Commands — 3 Separate CMD Windows for Local Dev

```cmd
:: CMD Window 1 — Frontend
cd C:\Projects\sisp\sisp-frontend
pnpm dev
:: Accessible at: http://localhost:3000

:: CMD Window 2 — Backend
cd C:\Projects\sisp\sisp-backend
pnpm start:dev
:: Accessible at: http://localhost:3001

:: CMD Window 3 — ML Service (must activate venv first)
cd C:\Projects\sisp\sisp-ml
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
:: Accessible at: http://localhost:8000
```

---

### Git Workflow — Solo Developer

```cmd
:: Start a new feature from develop
git checkout develop
git pull origin develop
git checkout -b feature/my-feature-name

:: Save progress regularly
git add .
git commit -m "feat: describe what you built"

:: Merge completed feature into develop
git checkout develop
git merge feature/my-feature-name
git push origin develop

:: Release to production (triggers CI/CD)
git checkout main
git merge develop
git push origin main

:: Tag a release
git tag v1.0.0
git push origin v1.0.0
```

---

### Postman Setup Tips

```
1. Create a Collection named "SISP API"
2. Add a Collection Variable named "token" (leave the value empty initially)
3. In the Login request → Tests tab, add:
      pm.collectionVariables.set("token", pm.response.json().accessToken);
   This auto-saves the token after every login.
4. For all protected requests, set:
      Authorization → Type: Bearer Token → Token: {{token}}
5. Create folders inside the Collection for each module:
      Auth / Users / Students / Grades / Enrollment / Documents / Notifications / Chatbot / Admin / Analytics / ML
6. Save every tested request inside its folder as you build — you will reuse them for integration testing.
7. Use Postman Environments if you want to switch between local (localhost) and production (Render/Vercel) URLs easily.
```

---

## Definition of Done

Each phase is **complete** only when ALL binary criteria below are confirmed. Do not proceed to the next phase if even one criterion is failing.

---

### Phase 1 — Complete When:

- [ ] `pnpm start:dev` in `sisp-backend` prints "Nest application successfully started" in CMD with zero errors
- [ ] `pnpm dev` in `sisp-frontend` prints "Ready on http://localhost:3000" in CMD with zero errors
- [ ] `uvicorn app.main:app --reload --port 8000` in `sisp-ml` starts with zero errors (venv active)
- [ ] `POST /auth/register` in Postman returns `201` and a new row appears in the Supabase `User` table
- [ ] `POST /auth/login` in Postman returns `200` with both `accessToken` and `refreshToken`
- [ ] `POST /auth/refresh` in Postman returns `200` with a new `accessToken`
- [ ] Navigating to `http://localhost:3000/dashboard` without being logged in redirects to `/login`
- [ ] Logging in via the Next.js login page redirects to `/dashboard` showing the welcome heading
- [ ] Navigating to `http://localhost:3000/register` and attempting to submit without checking the consent checkbox results in the Register button remaining disabled
- [ ] All three GitHub Actions workflow files appear in the GitHub Actions tab with green status
- [ ] The Prisma migration `init_auth_rbac` is listed in the Supabase `_prisma_migrations` table
- [ ] Four roles (student, faculty, admin_staff, dean) exist in the `Role` table in Supabase

### Phase 2 — Complete When:

- [ ] `GET /users` in Postman with an admin_staff token returns `200` with the user list; with a student token returns `403`
- [ ] `GET /students/me` in Postman returns the authenticated student's profile with program name included
- [ ] `GET /grades` with an `unpaid` student token returns `{ "grades": [], "paymentRequired": true }`
- [ ] `GET /grades` with a `paid` student token returns grade records (only those with `isVisible: true`)
- [ ] `POST /requests` creates a `DocumentRequest` row in Supabase with `status = "Pending"`
- [ ] All four status transitions (Pending → Under Review → Approved → Released) succeed in Postman
- [ ] `PATCH /requests/:id` with `{ "status": "Released" }` on a `Pending` request returns `400 Bad Request`
- [ ] The `/grades` page in the browser shows the yellow payment-required banner for the unpaid test student
- [ ] The `/requests` page in the browser shows all submitted requests with the `RequestStatusTracker` component and color-coded status badges
- [ ] The notification bell badge count increases after a document request status is changed in Postman
- [ ] `POST /auth/login` in Postman creates a row in the `AuditLog` table in Supabase
- [ ] All six RLS policies pass their SQL Editor tests in Supabase without errors

### Phase 3 — Complete When:

- [ ] `GET http://localhost:8000/health` in Postman returns `{"status": "ok"}`
- [ ] `POST http://localhost:8000/classify` with `{"text": "How do I enroll?"}` returns `intent = "enrollment_inquiry"` and `confidence >= 0.7`
- [ ] `POST http://localhost:8000/classify` with a nonsense string returns `escalate = true`
- [ ] `POST http://localhost:8000/retrieve` with `{"query": "enrollment deadline"}` returns at least one result
- [ ] `POST http://localhost:3001/chat` with a student token saves a `ChatLog` row in Supabase
- [ ] A low-confidence `POST /chat` message creates an `EscalationQueue` row in Supabase
- [ ] The `ChatWidget` opens and closes on the dashboard page in the browser
- [ ] Sending a message in the `ChatWidget` displays ARIA's response in the chat panel
- [ ] Resolving an escalation via the adviser page appends a new row to `sisp-ml\app\data\training_data_v1.csv`

### Phase 4 — Complete When:

- [ ] `GET /admin/users` with an admin token returns a paginated user list; with a student token returns `403`
- [ ] Deactivating a test user and then logging in with that user returns `401`
- [ ] `GET /analytics/enrollment` returns non-empty stats with program-level breakdowns
- [ ] `GET /analytics/export/enrollment` downloads a valid XLSX file that opens correctly in Excel
- [ ] `GET /analytics/export/grades/:studentId` downloads a valid PDF file that opens in a PDF viewer
- [ ] The admin dashboard page renders the stat cards and at least two charts with live data from `useAdminStore`
- [ ] The faculty grades page allows editing grade fields and saving them via the "Save Grades" button
- [ ] After clicking "Release All Grades" on the faculty page, `isVisible = true` for those grades in Supabase
- [ ] `POST /dean/approve-exception` with a dean token returns `201` and creates a row in `AuditLog`
- [ ] `POST /dean/approve-exception` with a student token returns `403 Forbidden`

### Phase 5 — Complete When:

- [ ] Running `python app\ml\retrain.py` in CMD produces a new versioned `.pkl` file with accuracy >= 0.80
- [ ] `GET /ml/model-info` returns the new version number after retraining
- [ ] Sending the same Groq-routed query twice in Postman returns the second response noticeably faster
- [ ] `pnpm test` in `sisp-backend` passes with zero failing tests
- [ ] `pytest tests\test_classifier.py -v` passes with zero failing tests
- [ ] `pnpm test:e2e` passes all three integration test flows
- [ ] k6 benchmark reports p95 API response time below 2000ms
- [ ] k6 benchmark reports p95 chatbot response time below 3000ms
- [ ] The production Vercel URL loads the login page over HTTPS
- [ ] `POST /auth/login` on the production Render backend URL returns a valid JWT
- [ ] `GET /health` on the production Render ML service URL returns `{"status": "ok"}`
- [ ] All sensitive tables have RLS enabled in the production Supabase project
- [ ] All four RBAC audit tests in section 5.14 return `403` as expected
- [ ] All five Data Privacy Act compliance checkboxes in section 5.14 are confirmed
- [ ] The `AuditLog` table in production Supabase contains records from the pre-launch testing session
- [ ] The repository is tagged `v1.0.0` on GitHub
