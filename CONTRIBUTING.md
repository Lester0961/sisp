# Contributing to SISP

Thank you for your interest in contributing to the **Student Information and Services Portal (SISP)**! This document will get you started with our workflow, coding standards, and how to submit changes.

---

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/sisp.git
   cd sisp
   ```
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## Development Workflow

### Running the Stack Locally

```bash
# Terminal 1 — Backend
cd sisp-backend
npm install
npm run start:dev

# Terminal 2 — Frontend
cd sisp-frontend
npm install
npm run dev

# Terminal 3 — ML (optional)
cd sisp-ml
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Before Committing

- **Backend**: Ensure `npx tsc --noEmit` passes with zero errors.
- **Frontend**: Ensure `npx tsc --noEmit` passes with zero errors.
- **Formatting**: The backend uses Prettier. The frontend uses its own ESLint config. Please match existing code style.

---

## Code Style

### Backend (NestJS)
- Follow the existing module structure: `controller → service → dto`.
- Use `class-validator` decorators on all DTOs.
- Guard all routes with `JwtAuthGuard` and `RolesGuard` where appropriate.
- Use `PrismaService` for all database access. Avoid raw SQL unless necessary.
- Log meaningful messages with `Logger` (avoid `console.log` in production code).

### Frontend (Next.js)
- Use **functional components** and hooks.
- State management lives in `stores/` (Zustand).
- API calls live in `lib/api/`.
- Reuse UI components from `components/ui/` (shadcn/ui base).
- Keep page components in `app/(protected)/` or `app/(auth)/`.

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

<body>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Code style (formatting, no logic change)
- `refactor` — Code refactoring
- `test` — Adding or updating tests
- `chore` — Maintenance, build, dependency updates

**Examples:**
```
feat(grades): add dean approval endpoint
fix(auth): resolve JWT expiry edge case on refresh
docs(readme): update setup instructions for Windows
```

---

## Pull Request Process

1. **Open a PR** from your feature branch to `main`.
2. **Fill in the PR template** (if provided) or describe:
   - What changed
   - Why it changed
   - How to test it
3. **Ensure the title follows** the commit convention above.
4. **Request review** from at least one core team member.
5. **Address feedback** promptly.
6. **Squash and merge** once approved.

---

## Reporting Bugs

Use GitHub Issues with the following template:

- **Title:** `[Bug] <short description>`
- **Body:**
  - What happened?
  - Steps to reproduce
  - Expected behavior
  - Screenshots (if applicable)
  - Environment (OS, Node version, Browser)

---

## Security

If you discover a security vulnerability, **do not open a public issue**. Instead, email the maintainers directly or reach out via the contact methods listed in the README.

---

## Questions?

Feel free to open a [GitHub Discussion](https://github.com/Lester0961/sisp/discussions) or reach out to the team.

---

Thank you for helping make SISP better! 🎓
