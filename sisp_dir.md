# SISP Directory Structure

This document contains the complete directory structure and files of the SISP project.

## Complete File Tree

```
.editorconfig

.vscode/
  settings.json

docs/
  dev_notes.md
  pgvector_benchmark.txt

package.json
README.md
sisp_dir.md
SISP_Master_Build_Checklist..md

sisp-backend/
  .prettierrc
  eslint.config.mjs
  nest-cli.json
  package.json
  package-lock.json
  README.md
  tsconfig.build.json
  tsconfig.json

  dist/
    (all compiled JavaScript files - excluded for brevity)

  prisma/
    schema.prisma

  src/
    app.controller.spec.ts
    app.controller.ts
    app.module.ts
    app.service.ts
    main.ts

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
        audit-log.interceptor.ts
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
        audit.controller.ts
        audit.module.ts
        audit.service.ts

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
        enrollment.controller.ts
        enrollment.module.ts
        enrollment.service.ts
        dto/
          create-history.dto.ts
          enroll.dto.ts
          update-enrollment.dto.ts

      grades/
        grades.controller.ts
        grades.module.ts
        grades.service.spec.ts
        grades.service.ts
        dto/
          bulk-grade.dto.ts
          create-grade.dto.ts
          update-grade.dto.ts

      notifications/
        notifications.controller.ts
        notifications.module.ts
        notifications.service.ts
        dto/
          send-notification.dto.ts

      requests/

      students/
        students.controller.ts
        students.module.ts
        students.service.ts
        dto/
          create-student-profile.dto.ts
          update-student.dto.ts

      users/
        users.controller.ts
        users.module.ts
        users.service.ts
        dto/
          update-user.dto.ts

    prisma/
      prisma.module.ts
      prisma.service.ts

  test/
    app.e2e-spec.ts
    auth.e2e-spec.ts
    jest-e2e.json

sisp-frontend/
  .eslintrc.json
  middleware.ts
  next.config.mjs
  next-env.d.ts
  package.json
  package-lock.json
  postcss.config.mjs
  README.md
  tailwind.config.ts
  tsconfig.json

  app/
    (auth)/
      layout.tsx
      login/
        page.tsx
      register/
        page.tsx

    (protected)/
      admin/
        dashboard/
          page.tsx
      curriculum/
        page.tsx
      dashboard/
        page.tsx
      dean/
        exceptions/
          page.tsx
      faculty/
        grades/
          page.tsx
      grades/
        page.tsx
      layout.tsx
      requests/
        page.tsx
      schedule/
        page.tsx

    favicon.ico
    fonts/
      GeistMonoVF.woff
      GeistVF.woff
    globals.css
    layout.tsx
    page.tsx

  components/
    components.json

    curriculum/
      CurriculumChecklist.tsx

    providers/
      AuthProvider.tsx

    shared/
      Navbar.tsx
      NotificationBell.tsx
      RequestStatusTracker.tsx

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
      sonner.tsx
      table.tsx
      tabs.tsx

  hooks/
    useAuth.ts

  lib/
    utils.ts

    api/
      auth.ts
      client.ts
      curricula.ts
      enrollments.ts
      grades.ts
      notifications.ts
      requests.ts
      students.ts

  public/

  stores/
    authStore.ts
    chatStore.ts
    notificationStore.ts
    requestStore.ts
    studentStore

  types/
    index.ts

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
  - Audit logging capabilities
  - Enhanced DTOs for bulk operations and student profiles

### 2. **sisp-frontend/** - Next.js 14+ Frontend Application

- **Framework**: Next.js with App Router and TypeScript
- **UI**: Tailwind CSS with shadcn/ui components
- **Structure**:
  - Route groups for authentication (`(auth)`) and protected routes (`(protected)`)
  - Role-based pages (admin dashboard, faculty grades, dean exceptions)
  - Component library with reusable UI components
  - State management with Zustand stores
  - API integration layer
- **Key Features**:
  - Curriculum management interface
  - Schedule management
  - Authentication provider
  - Notification system
  - Request tracking
  - Enhanced UI components with Sonner toast notifications

### 3. **sisp-ml/** - Python FastAPI ML Application

- **Framework**: FastAPI with Python
- **ML Capabilities**:
  - Document classification and retrieval
  - Chat service with Groq integration
  - Knowledge base for policies and procedures
  - Training data management
  - Embedding services
  - Feedback system for continuous improvement
  - Admin endpoints for model management

### Infrastructure & Development

- **Configuration**:
  - ESLint configurations for both frontend and backend
  - TypeScript configurations
  - Tailwind CSS setup
  - Middleware for authentication and routing
- **Documentation**:
  - Development notes and benchmarks
  - README files for each component
  - Master build checklist
- **Testing**:
  - E2E tests for backend
  - Unit tests for ML components
  - Service specifications

### Notable Updates & Enhancements

- **Backend**: Added audit module with logging interceptor, enhanced enrollment and grading DTOs, new bulk operations
- **Frontend**: Comprehensive state management, curriculum features, enhanced UI components, proper authentication flow
- **ML**: Structured service architecture, proper model management, comprehensive API endpoints

This architecture provides a comprehensive Student Information System with modern web technologies, AI/ML capabilities, and a scalable microservices approach.

---

_Last updated: April 5, 2026_
