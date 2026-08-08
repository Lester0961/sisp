# SISP — Student Information and Services Portal

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" />
  <img src="https://img.shields.io/badge/NestJS-10-EA2845?logo=nestjs" />
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" />
</p>

<p align="center">
  <b>A modern, glassmorphic academic portal for higher education.</b><br>
  Built for students, faculty, registrars, deans, and support agents — all in one platform.
</p>

---

## What is SISP?

The current frontend deployment is available at [sisp-rmc.vercel.app](https://sisp-rmc.vercel.app).

**SISP** (Student Information and Services Portal) is a full-stack web application designed for **Regis Marie College**. It replaces fragmented academic workflows with a unified, real-time digital experience.

Think of it as the academic command center where:
- **Students** check grades, request documents, chat with an AI advisor (ARIA), and track payments.
- **Faculty** submit grades for review.
- **Registrars** validate and post grades to the dean.
- **Deans** approve or reject grades before they go live.
- **Live Agents** take over when ARIA can't answer — all inside the same chat thread.

---

## Feature Highlights

| Module | What It Does |
|--------|-------------|
| **Grade Workflow** | Faculty submit → Registrar posts → Dean approves → Student sees (only if tuition is paid for the semester). |
| **Document Requests** | Students request TOR, COE, diplomas, etc. Each request has a computed fee, a mock InstaPay QR code, and a payment confirmation step. |
| **ARIA Chatbot** | An AI academic advisor powered by hybrid NLP + semantic RAG. Answers policy questions in real time with cited sources. |
| **Live Agent Handoff** | When ARIA is stumped, the conversation seamlessly escalates to a human agent via async messaging sessions. |
| **Admin Dashboard** | Analytics, user management, audit logs, knowledge-base policies, and escalation queues. |
| **Real-Time Notifications** | In-app toast and bell notifications for status updates, approvals, and rejections. |

---

## Tech Stack

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 14    │────▶│   NestJS API    │────▶│   PostgreSQL    │
│  (Frontend)     │     │   (Backend)     │     │   + pgvector    │
│  Tailwind + Zustand│    │   JWT + Prisma  │     │   (Supabase)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   FastAPI ML    │
                        │  (ARIA Brain)   │
                        │ scikit-learn    │
                        └─────────────────┘
```

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Recharts |
| **Backend** | NestJS 10, TypeScript, Prisma ORM, JWT, class-validator |
| **ML / NLP** | FastAPI, Python 3.11, scikit-learn, sentence-transformers |
| **Database** | PostgreSQL 15 + pgvector (via Supabase) |
| **DevOps** | Render (backend + ML), Vercel (frontend), GitHub Actions |

---

## Quick Start

### Prerequisites
- **Node.js** >= 20
- **npm** >= 10
- **Python** >= 3.11 (for ML service)
- A **PostgreSQL** database (local or cloud)

### 1. Clone the repo
```bash
git clone https://github.com/Lester0961/sisp.git
cd sisp
```

### 2. Backend
```bash
cd sisp-backend
cp .env.example .env          # Fill in your own values
npm install
npx prisma generate
npm run start:dev              # Runs on http://localhost:3001
```

> **Note:** The backend uses an in-memory mock database when it can't connect to Postgres. Perfect for demos and local hacking.

### 3. Frontend
```bash
cd sisp-frontend
npm install
npm run dev                    # Runs on http://localhost:3000
```

### 4. ML Service (optional — ARIA works without it)
```bash
cd sisp-ml
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload   # Runs on http://localhost:8000
```

### Local Demo Identities
The mock store and local seed include role-based fixture identities for development. Their password is controlled by `LOCAL_DEMO_PASSWORD` and must never be reused in a deployed environment.

| Role | Email |
|------|-------|
| Student | `student@rmc.edu.ph` |
| Faculty | `faculty@rmc.edu.ph` |
| Admin / Registrar | `admin@rmc.edu.ph` |
| Dean | `dean@rmc.edu.ph` |
| Live Agent | `agent@rmc.edu.ph` |
| System Admin | `sysadmin@rmc.edu.ph` |

---

## Project Structure

```
sisp/
├── sisp-frontend/          # Next.js 14 app
│   ├── app/(protected)/    # Authenticated pages
│   ├── components/         # Reusable UI components
│   ├── stores/             # Zustand state management
│   └── lib/api/            # API client wrappers
│
├── sisp-backend/           # NestJS API
│   ├── prisma/             # Database schema & seed
│   ├── src/modules/        # Feature modules (grades, auth, chat, ...)
│   └── src/common/         # Guards, decorators, interceptors
│
├── sisp-ml/              # FastAI + FastAPI
│   └── app/                # RAG pipeline, intent classifier
```

---

---

## Key Design Decisions

1. **Grade Workflow with State Machine** — Grades move through `draft → submitted → posted → approved`. Only `approved` grades are visible to students, and only if they are fully paid for the semester.

2. **Payment Before Processing** — Document requests require a fee. A mock InstaPay QR code is generated per request. Admin confirms payment before the request enters the review pipeline.

3. **Escalation Creates a Chat Session** — When ARIA (the chatbot) can't answer, it doesn't just log a ticket. It spins up a `ChatSession` record so a live agent and the student can exchange async messages within the same chat UI.

4. **Mock-Aware Prisma Client** — The backend gracefully falls back to an in-memory JSON store when the database is unreachable. This makes demos and offline development frictionless.

---

## Roadmap

- [x] Core authentication & role-based access
- [x] Grade submission & approval workflow
- [x] Document request system with payment step
- [x] ARIA chatbot with RAG citations
- [x] Live agent async messaging
- [x] Admin analytics dashboard
- [ ] Real payment gateway integration (Stripe / GCash)
- [ ] WebSocket real-time chat (replace polling)
- [ ] Mobile app (React Native / Expo)
- [ ] LTI integration with Moodle / Canvas

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on pull requests, code style, and commit conventions.

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## Developed By

<table align="center">
  <tr>
    <td align="center">
      <b>Lester</b><br>
      <sub>Lead Developer & System Architect</sub>
    </td>
    <td align="center">
      <b>Raynan</b><br>
      <sub>Backend Engineer & Database Design</sub>
    </td>
    <td align="center">
      <b>Jiro</b><br>
      <sub>Frontend Engineer & UI/UX</sub>
    </td>
  </tr>
</table>

<p align="center">
  <sub>Made with ☕, 💻, and a lot of <code>console.log</code> for Regis Marie College.</sub>
</p>
