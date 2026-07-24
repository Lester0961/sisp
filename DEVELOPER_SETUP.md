# Developer Onboarding Guide

Welcome to the team! This document will get you running the full SISP stack locally in under 10 minutes.

---

## What You Need

| Tool | Minimum Version | How to Check |
|------|----------------|--------------|
| Node.js | `>= 20.0.0` | `node -v` |
| npm | `>= 10.0.0` | `npm -v` |
| Python (optional, for ML) | `>= 3.11` | `python --version` |
| Git | any recent | `git --version` |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/Lester0961/sisp.git
cd sisp
```

---

## Step 2: Backend Setup (`sisp-backend/`)

### 2a. Install Dependencies

```bash
cd sisp-backend
npm install
```

### 2b. Environment Variables

The backend needs a `.env` file. You have **two options**:

#### Option A — Use the Real Database (Shared Team DB)
Ask the project lead (Lester) to securely share the `.env` file via:
- A password manager (Bitwarden, 1Password)
- A private message / encrypted note
- **Never paste secrets in Discord, WhatsApp, or public channels.**

Once you have it:
```bash
cp .env .env.local   # or just use the shared .env directly
```

#### Option B — Use Mock Mode (No Database Needed)
If you don't have the real credentials yet, **the backend automatically runs in mock mode**. It creates an in-memory database with sample data so you can develop and test immediately.

> **How it works:** If the backend can't connect to PostgreSQL on startup, it falls back to a mock JSON store. All CRUD operations work exactly the same.

### 2c. Generate Prisma Client

```bash
npx prisma generate
```

> **Note:** If you are using **mock mode**, you can skip Prisma migration. The mock DB is already seeded.

### 2d. Run the Backend

```bash
npm run start:dev
```

- API base URL: `http://localhost:3001`
- Health check: `GET http://localhost:3001/api/health`

---

## Step 3: Frontend Setup (`sisp-frontend/`)

### 3a. Install Dependencies

```bash
cd sisp-frontend
npm install
```

### 3b. Run the Frontend

```bash
npm run dev
```

- Default URL: `http://localhost:3000` (or `3002` if 3000 is busy)
- The frontend auto-detects the backend at `http://localhost:3001`

---

## Step 4: ML Service Setup (`sisp-ml/`) — Optional

ARIA (the chatbot) works without the ML service. If the backend can't reach it, ARIA gracefully degrades to a fallback response and auto-escalates to a live agent.

**To run ARIA's brain locally:**

```bash
cd sisp-ml

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# OR activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the ML API
uvicorn app.main:app --reload --port 8000
```

If you run the ML service, add this to your backend `.env`:
```
ML_SERVICE_URL=http://localhost:8000
```

---

## Demo Accounts (Mock Mode)

When running in **mock mode**, these accounts are pre-seeded:

| Role | Email | Password |
|------|-------|----------|
| Student | `student@rmc.edu.ph` | `password123` |
| Faculty | `faculty@rmc.edu.ph` | `password123` |
| Admin / Registrar | `admin@rmc.edu.ph` | `password123` |
| Dean | `dean@rmc.edu.ph` | `password123` |
| Live Agent | `agent@rmc.edu.ph` | `password123` |
| System Admin | `sysadmin@rmc.edu.ph` | `password123` |

---

## Workflow Testing Checklist

Test these features end-to-end after setup:

### Grade Workflow
1. Log in as **Faculty** → go to `/faculty/grades`
2. Edit a grade → click **Save** → click **Submit for Review**
3. Log in as **Admin** → go to `/admin/grades`
4. Click **Post to Dean**
5. Log in as **Dean** → go to `/dean/grades`
6. Click **Approve** (or **Reject** with remarks)
7. Log in as **Student** → go to `/grades`
8. If the student is fully paid for the semester, the approved grade appears.

### Document Payment
1. Log in as **Student** → go to `/requests`
2. Click **New Request** → select a document type → **Submit**
3. Expand the request card → see the **fee**, **reference number**, and **QR code**
4. Click **I Have Paid**
5. Log in as **Admin** → go to `/admin/requests`
6. Click **Confirm Payment** → request moves to `pending`

### Live Agent Chat
1. Log in as **Student** → go to `/chat`
2. Ask ARIA something nonsensical (e.g., "What is the meaning of life?")
3. ARIA escalates → click **"Click here to open live chat"**
4. Log in as **Live Agent** → go to `/live-agent`
5. Open the new session → send messages back and forth

---

## Common Issues

### `EADDRINUSE: address already in use :::3001`
**Fix:** A previous Node process is still running. Kill all Node processes:
```bash
# Windows PowerShell
Get-Process -Name node | Stop-Process -Force

# macOS / Linux
killall node
```

### `Module not found` or `Cannot resolve '@prisma/client'`
**Fix:** Run `npx prisma generate` inside `sisp-backend/`.

### Frontend shows "Failed to load grades"
**Fix:** The backend may still be compiling. Wait for `[Nest] ... Nest application successfully started` in the terminal, then refresh the page.

### Mock DB not persisting
**Fix:** The mock DB writes to `sisp-backend/mock-db.json`. If it becomes corrupted, delete the file and restart the backend. It will regenerate with fresh seed data.

---

## Project Commands Cheat Sheet

```bash
# From repo root

# Backend
cd sisp-backend && npm run start:dev        # dev mode with watch
cd sisp-backend && npm run build            # production build
cd sisp-backend && npm run test             # run tests

# Frontend
cd sisp-frontend && npm run dev             # dev server
cd sisp-frontend && npm run build           # production build
cd sisp-frontend && npx tsc --noEmit       # type check only

# ML
cd sisp-ml && uvicorn app.main:app --reload  # ML service
```

---

## Code Style & Conventions

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

Quick rules:
- **Backend:** Use `class-validator` on DTOs. Use `Logger` (not `console.log`).
- **Frontend:** Use Zustand for state. Keep API calls in `lib/api/`. Reuse `components/ui/`.
- **Commits:** Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`).

---

## Need Help?

1. Check the [README](./README.md) for architecture overview.
2. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for PR guidelines.
3. Ask in the team group chat — tag **Lester** for backend, **Raynan** for DB/API, **Jiro** for frontend/UI.

---

Happy coding! 🎓
