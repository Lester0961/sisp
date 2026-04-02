# SISP — Student Information and Services Portal

**Regis Marie College**
Web-Based Student Information and Services Portal with Hybrid NLP- and Semantic-Based Academic Advisory Chat System (ARIA)

---

## Monorepo Structure
```
sisp/
├── sisp-frontend/   → Next.js 14 (TypeScript) — Vercel
├── sisp-backend/    → NestJS (TypeScript) + Prisma — Render
└── sisp-ml/         → FastAPI + scikit-learn + pgvector — Render
```

## Tech Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand   |
| Backend  | NestJS, TypeScript, Prisma ORM, JWT, Zod        |
| ML/NLP   | FastAPI, Python 3.11, scikit-learn, Groq API    |
| Database | PostgreSQL + pgvector (Supabase)                |

## Development Phases

- Phase 1 — Core System Foundation
- Phase 2 — Academic Features
- Phase 3 — Chatbot MVP (ARIA)
- Phase 4 — Admin Dashboard & Analytics
- Phase 5 — ML Refinement, HITL, Testing & Deployment