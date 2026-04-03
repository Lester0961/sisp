# SISP Directory Structure

This document contains the complete directory structure and files of the SISP project.

## Complete File Tree

```
.github/
  workflows/
    backend.yml
    frontend.yml
    ml.yml

.vscode/
  settings.json

docs/
  dev_notes.md
  pgvector_benchmark.txt

package.json
README.md
sisp_dir.md

sisp-backend/
  dist/
    common/
      decorators/
        current-user.decorator.d.ts
        current-user.decorator.js
        current-user.decorator.js.map
        public.decorator.d.ts
        public.decorator.js
        public.decorator.js.map
        roles.decorator.d.ts
        roles.decorator.js
        roles.decorator.js.map
      guards/
        jwt-auth.guard.d.ts
        jwt-auth.guard.js
        jwt-auth.guard.js.map
        roles.guard.d.ts
        roles.guard.js
        roles.guard.js.map
    modules/
      admin/
        admin.controller.d.ts
        admin.controller.js
        admin.controller.js.map
        admin.module.d.ts
        admin.module.js
        admin.module.js.map
        admin.service.d.ts
        admin.service.js
        admin.service.js.map
      analytics/
        analytics.controller.d.ts
        analytics.controller.js
        analytics.controller.js.map
        analytics.module.d.ts
        analytics.module.js
        analytics.module.js.map
        analytics.service.d.ts
        analytics.service.js
        analytics.service.js.map
      auth/
        auth.controller.d.ts
        auth.controller.js
        auth.controller.js.map
        auth.module.d.ts
        auth.module.js
        auth.module.js.map
        auth.service.d.ts
        auth.service.js
        auth.service.js.map
        dto/
          login.dto.d.ts
          login.dto.js
          login.dto.js.map
          refresh.dto.d.ts
          refresh.dto.js
          refresh.dto.js.map
          register.dto.d.ts
          register.dto.js
          register.dto.js.map
        strategies/
          jwt.strategy.d.ts
          jwt.strategy.js
          jwt.strategy.js.map
      chat/
        chatbot.controller.d.ts
        chatbot.controller.js
        chatbot.controller.js.map
        chatbot.module.d.ts
        chatbot.module.js
        chatbot.module.js.map
        chatbot.service.d.ts
        chatbot.service.js
        chatbot.service.js.map
        dto/
          send-message.dto.d.ts
          send-message.dto.js
          send-message.dto.js.map
      documents/
        documents.controller.d.ts
        documents.controller.js
        documents.controller.js.map
        documents.module.d.ts
        documents.module.js
        documents.module.js.map
        documents.service.d.ts
        documents.service.js
        documents.service.js.map
        dto/
          create-request.dto.d.ts
          create-request.dto.js
          create-request.dto.js.map
          update-request.dto.d.ts
          update-request.dto.js
          update-request.dto.js.map
      enrollment/
        dto/
          enroll.dto.d.ts
          enroll.dto.js
          enroll.dto.js.map
        enrollment.controller.d.ts
        enrollment.controller.js
        enrollment.controller.js.map
        enrollment.module.d.ts
        enrollment.module.js
        enrollment.module.js.map
        enrollment.service.d.ts
        enrollment.service.js
        enrollment.service.js.map
      grades/
        dto/
          create-grade.dto.d.ts
          create-grade.dto.js
          create-grade.dto.js.map
        grades.controller.d.ts
        grades.controller.js
        grades.controller.js.map
        grades.module.d.ts
        grades.module.js
        grades.module.js.map
        grades.service.d.ts
        grades.service.js
        grades.service.js.map
      notifications/
        notifications.controller.d.ts
        notifications.controller.js
        notifications.controller.js.map
        notifications.module.d.ts
        notifications.module.js
        notifications.module.js.map
        notifications.service.d.ts
        notifications.service.js
        notifications.service.js.map
      students/
        dto/
          update-student.dto.d.ts
          update-student.dto.js
          update-student.dto.js.map
        students.controller.d.ts
        students.controller.js
        students.controller.js.map
        students.module.d.ts
        students.module.js
        students.module.js.map
        students.service.d.ts
        students.service.js
        students.service.js.map
      users/
        dto/
          update-user.dto.d.ts
          update-user.dto.js
          update-user.dto.js.map
        users.controller.d.ts
        users.controller.js
        users.controller.js.map
        users.module.d.ts
        users.module.js
        users.module.js.map
        users.service.d.ts
        users.service.js
        users.service.js.map
    prisma/
      prisma.module.d.ts
      prisma.module.js
      prisma.module.js.map
      prisma.service.d.ts
      prisma.service.js
      prisma.service.js.map
    app.controller.d.ts
    app.controller.js
    app.controller.js.map
    app.module.d.ts
    app.module.js
    app.module.js.map
    app.service.d.ts
    app.service.js
    app.service.js.map
    main.d.ts
    main.js
    main.js.map
    tsconfig.build.tsbuildinfo
  eslint.config.mjs
  nest-cli.json
  package.json
  package-lock.json
  prisma/
    schema.prisma
  README.md
  src/
    common/
      decorators/
        current-user.decorator.ts
        public.decorator.ts
        roles.decorator.ts
      filters/
      guards/
        jwt-auth.guard.ts
        roles.guard.ts
      interceptors/
      pipes/
    modules/
      admin/
        admin.controller.ts
        admin.module.ts
        admin.service.ts
      analytics/
        analytics.controller.ts
        analytics.module.ts
        analytics.service.ts
      audit/
      auth/
        auth.controller.ts
        auth.module.ts
        auth.service.spec.ts
        auth.service.ts
        dto/
          login.dto.ts
          refresh.dto.ts
          register.dto.ts
        strategies/
          jwt.strategy.ts
      chat/
        chatbot.controller.ts
        chatbot.module.ts
        chatbot.service.ts
        dto/
          send-message.dto.ts
      documents/
        documents.controller.ts
        documents.module.ts
        documents.service.spec.ts
        documents.service.ts
        dto/
          create-request.dto.ts
          update-request.dto.ts
      enrollment/
        dto/
          enroll.dto.ts
        enrollment.controller.ts
        enrollment.module.ts
        enrollment.service.ts
      grades/
        dto/
          create-grade.dto.ts
        grades.controller.ts
        grades.module.ts
        grades.service.spec.ts
        grades.service.ts
      notifications/
        notifications.controller.ts
        notifications.module.ts
        notifications.service.ts
      requests/
      students/
        dto/
          update-student.dto.ts
        students.controller.ts
        students.module.ts
        students.service.ts
      users/
        dto/
          update-user.dto.ts
        users.controller.ts
        users.module.ts
        users.service.ts
    prisma/
      prisma.module.ts
      prisma.service.ts
    app.controller.spec.ts
    app.controller.ts
    app.module.ts
    app.service.ts
    main.ts
  test/
    app.e2e-spec.ts
    auth.e2e-spec.ts
    jest-e2e.json
  tsconfig.build.json
  tsconfig.json

sisp-frontend/
  app/
    (auth)/
      login/
        page.tsx
      register/
        page.tsx
    (protected)/
      admin/
        dashboard/
          page.tsx
        dean/
          exceptions/
            page.tsx
        faculty/
          grades/
            page.tsx
      dashboard/
        page.tsx
      grades/
        page.tsx
      requests/
        page.tsx
    favicon.ico
    fonts/
      GeistMonoVF.woff
      GeistVF.woff
    globals.css
    layout.tsx
    page.tsx
  components.json
  components/
    ui/
      avatar.tsx
      badge.tsx
      button.tsx
      card.tsx
      checkbox.tsx
      dialog.tsx
      dropdown-menu.tsx
      input.tsx
      label.tsx
      select.tsx
      separator.tsx
      table.tsx
      tabs.tsx
  hooks/
    .gitkeep
  lib/
    utils.ts
    api/
      .gitkeep
  next.config.mjs
  next-env.d.ts
  package.json
  package-lock.json
  postcss.config.mjs
  public/
    .gitkeep
  README.md
  stores/
    .gitkeep
  tailwind.config.ts
  tsconfig.json
  types/
    .gitkeep

sisp-ml/
  README.md
  requirements.txt
  app/
    __init__.py
    config.py
    main.py
    data/
      knowledge_base/
        document_requests.txt
        enrollment_policy.txt
        grading_policy.txt
      training_data.json
    ml/
      __init__.py
      embed_documents.py
      retrain.py
      train_classifier.py
      models/
        __init__.py
    routers/
      __init__.py
      admin.py
      chat.py
      classify.py
      feedback.py
      retrieve.py
    services/
      __init__.py
      cache_service.py
      chat_service.py
      classifier_service.py
      groq_service.py
      retrieval_service.py
  tests/
    __init__.py
    test_classifier.py
    test_retrieval.py
```

## Project Summary

The SISP project consists of three main components:

### 1. **sisp-backend/** - NestJS Backend Application
- **Architecture**: Modular NestJS application with TypeScript
- **Key Features**:
  - Authentication system with JWT strategies
  - Role-based access control (admin, faculty, dean)
  - Modular design for different domains (auth, grades, documents, etc.)
  - Prisma ORM for database operations
  - Chatbot integration
  - Document management system
  - Enrollment and grading functionality
  - Analytics and notifications

### 2. **sisp-frontend/** - Next.js 14+ Frontend Application
- **Framework**: Next.js with App Router and TypeScript
- **UI**: Tailwind CSS with shadcn/ui components
- **Structure**:
  - Route groups for authentication (`(auth)`) and protected routes (`(protected)`)
  - Role-based pages (admin dashboard, faculty grades, dean exceptions)
  - Component library with reusable UI components
  - State management and API integration ready

### 3. **sisp-ml/** - Python FastAPI ML Application
- **Framework**: FastAPI with Python
- **ML Capabilities**:
  - Document classification and retrieval
  - Chat service with Groq integration
  - Knowledge base for policies and procedures
  - Training data management
  - Embedding services
  - Feedback system for continuous improvement

### Infrastructure
- **GitHub Workflows**: CI/CD pipelines for backend, frontend, and ML components
- **Documentation**: Development notes and benchmarks
- **Testing**: E2E tests for backend, unit tests for ML components

This architecture provides a comprehensive Student Information System with modern web technologies, AI/ML capabilities, and a scalable microservices approach.