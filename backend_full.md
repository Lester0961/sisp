# SISP Full Backend Source Code

## Index of Backend Code Files
```text
  - README.md
  - sisp-backend/package.json
  - sisp-backend/prisma/schema.prisma
  - sisp-backend/src/app.controller.ts
  - sisp-backend/src/app.module.ts
  - sisp-backend/src/app.service.ts
  - sisp-backend/src/common/decorators/current-user.decorator.ts
  - sisp-backend/src/common/decorators/public.decorator.ts
  - sisp-backend/src/common/decorators/roles.decorator.ts
  - sisp-backend/src/common/guards/jwt-auth.guard.ts
  - sisp-backend/src/common/guards/roles.guard.ts
  - sisp-backend/src/common/interceptors/audit-log.interceptor.ts
  - sisp-backend/src/common/utils/require-student-profile.ts
  - sisp-backend/src/common/utils/state-machine.ts
  - sisp-backend/src/main.ts
  - sisp-backend/src/modules/admin/admin.controller.ts
  - sisp-backend/src/modules/admin/admin.module.ts
  - sisp-backend/src/modules/admin/admin.service.ts
  - sisp-backend/src/modules/admin/dto/create-user.dto.ts
  - sisp-backend/src/modules/analytics/analytics.controller.ts
  - sisp-backend/src/modules/analytics/analytics.module.ts
  - sisp-backend/src/modules/analytics/analytics.service.ts
  - sisp-backend/src/modules/audit/audit.controller.ts
  - sisp-backend/src/modules/audit/audit.module.ts
  - sisp-backend/src/modules/audit/audit.service.ts
  - sisp-backend/src/modules/auth/auth.controller.ts
  - sisp-backend/src/modules/auth/auth.module.ts
  - sisp-backend/src/modules/auth/auth.service.ts
  - sisp-backend/src/modules/auth/dto/change-password.dto.ts
  - sisp-backend/src/modules/auth/dto/login.dto.ts
  - sisp-backend/src/modules/auth/dto/refresh.dto.ts
  - sisp-backend/src/modules/auth/dto/register.dto.ts
  - sisp-backend/src/modules/auth/strategies/jwt.strategy.ts
  - sisp-backend/src/modules/chat/chatbot.controller.ts
  - sisp-backend/src/modules/chat/chatbot.module.ts
  - sisp-backend/src/modules/chat/chatbot.service.ts
  - sisp-backend/src/modules/chat/dto/send-message.dto.ts
  - sisp-backend/src/modules/documents/documents.controller.ts
  - sisp-backend/src/modules/documents/documents.module.ts
  - sisp-backend/src/modules/documents/documents.service.ts
  - sisp-backend/src/modules/documents/dto/create-request.dto.ts
  - sisp-backend/src/modules/documents/dto/update-request.dto.ts
  - sisp-backend/src/modules/enrollment/dto/create-history.dto.ts
  - sisp-backend/src/modules/enrollment/dto/enroll.dto.ts
  - sisp-backend/src/modules/enrollment/dto/update-enrollment.dto.ts
  - sisp-backend/src/modules/enrollment/enrollment.controller.ts
  - sisp-backend/src/modules/enrollment/enrollment.module.ts
  - sisp-backend/src/modules/enrollment/enrollment.service.ts
  - sisp-backend/src/modules/events/dto/update-event-status.dto.ts
  - sisp-backend/src/modules/events/events.controller.ts
  - sisp-backend/src/modules/events/events.module.ts
  - sisp-backend/src/modules/events/events.service.ts
  - sisp-backend/src/modules/grades/dto/bulk-grade.dto.ts
  - sisp-backend/src/modules/grades/dto/create-grade.dto.ts
  - sisp-backend/src/modules/grades/dto/update-grade.dto.ts
  - sisp-backend/src/modules/grades/grades.controller.ts
  - sisp-backend/src/modules/grades/grades.module.ts
  - sisp-backend/src/modules/grades/grades.service.ts
  - sisp-backend/src/modules/notifications/dto/send-notification.dto.ts
  - sisp-backend/src/modules/notifications/notifications.controller.ts
  - sisp-backend/src/modules/notifications/notifications.module.ts
  - sisp-backend/src/modules/notifications/notifications.service.ts
  - sisp-backend/src/modules/students/dto/admin-create-student-profile.dto.ts
  - sisp-backend/src/modules/students/dto/create-student-profile.dto.ts
  - sisp-backend/src/modules/students/dto/update-student.dto.ts
  - sisp-backend/src/modules/students/students.controller.ts
  - sisp-backend/src/modules/students/students.module.ts
  - sisp-backend/src/modules/students/students.service.ts
  - sisp-backend/src/modules/users/dto/update-user.dto.ts
  - sisp-backend/src/modules/users/users.controller.ts
  - sisp-backend/src/modules/users/users.module.ts
  - sisp-backend/src/modules/users/users.service.ts
  - sisp-backend/src/prisma/prisma.module.ts
  - sisp-backend/src/prisma/prisma.service.ts
  - sisp-ml/app/__init__.py
  - sisp-ml/app/config.py
  - sisp-ml/app/database.py
  - sisp-ml/app/main.py
  - sisp-ml/app/ml/__init__.py
  - sisp-ml/app/ml/embed_documents.py
  - sisp-ml/app/ml/init_db.py
  - sisp-ml/app/ml/models/__init__.py
  - sisp-ml/app/ml/retrain.py
  - sisp-ml/app/ml/train_classifier.py
  - sisp-ml/app/models/__init__.py
  - sisp-ml/app/routers/__init__.py
  - sisp-ml/app/routers/admin.py
  - sisp-ml/app/routers/chat.py
  - sisp-ml/app/routers/classify.py
  - sisp-ml/app/routers/feedback.py
  - sisp-ml/app/routers/retrieve.py
  - sisp-ml/app/services/__init__.py
  - sisp-ml/app/services/cache_service.py
  - sisp-ml/app/services/chat_service.py
  - sisp-ml/app/services/classifier_service.py
  - sisp-ml/app/services/groq_service.py
  - sisp-ml/app/services/retrieval_service.py
  - sisp-ml/requirements.txt
```


### File: `README.md`

```text
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
```


### File: `sisp-backend/package.json`

```json
{
  "name": "sisp-backend",
  "version": "0.0.1",
  "description": "",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.22",
    "@nestjs/config": "^3.3.0",
    "@nestjs/core": "^10.4.22",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/mapped-types": "^2.1.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.22",
    "@prisma/client": "^5.22.0",
    "@supabase/supabase-js": "^2.101.1",
    "@types/pdfkit": "^0.17.6",
    "bcryptjs": "^2.4.3",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "cookie-parser": "^1.4.7",
    "exceljs": "^4.4.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "pdfkit": "^0.18.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.9",
    "@nestjs/schematics": "^10.2.3",
    "@nestjs/testing": "^10.4.22",
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.10",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.14",
    "@types/node": "^20.17.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/passport-local": "^1.0.38",
    "@types/supertest": "^6.0.2",
    "eslint": "^8.57.1",
    "jest": "^29.7.0",
    "prettier": "^3.4.2",
    "prisma": "^5.22.0",
    "source-map-support": "^0.5.21",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": [
      "js",
      "json",
      "ts"
    ],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}

```


### File: `sisp-backend/prisma/schema.prisma`

```graphql
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================================
// RBAC
// ============================================================

model Role {
  id          String           @id @default(uuid())
  name        String           @unique
  permissions RolePermission[]
  users       User[]
  createdAt   DateTime         @default(now()) @map("created_at")

  @@map("roles")
}

model Permission {
  id          String           @id @default(uuid())
  action      String
  resource    String
  roles       RolePermission[]
  createdAt   DateTime         @default(now()) @map("created_at")

  @@unique([action, resource])
  @@map("permissions")
}

model RolePermission {
  roleId       String     @map("role_id")
  permissionId String     @map("permission_id")
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}

// ============================================================
// USERS
// ============================================================

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  firstName    String   @default("") @map("first_name")
  lastName     String   @default("") @map("last_name")
  roleId             String            @map("role_id")
  role               Role              @relation(fields: [roleId], references: [id])
  isActive           Boolean           @default(true) @map("is_active")
  mustChangePassword Boolean           @default(true) @map("must_change_password")
  createdAt          DateTime          @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  studentProfile StudentProfile?
  auditLogs      AuditLog[]
  events         Event[]
  notifications  Notification[]
  escalations    EscalationQueue[]
  chatLogs       ChatLog[]

  @@map("users")
}

// ============================================================
// AUDIT LOG
// ============================================================

model AuditLog {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id])
  action     String
  resource   String
  resourceId String?  @map("resource_id")
  ipAddress  String?  @map("ip_address")
  createdAt  DateTime @default(now()) @map("created_at")

  @@map("audit_logs")
}

// ============================================================
// ACADEMIC — PROGRAMS
// ============================================================

model Program {
  id        String   @id @default(uuid())
  name      String
  code      String   @unique
  createdAt DateTime @default(now()) @map("created_at")

  curricula       Curriculum[]
  studentProfiles StudentProfile[]

  @@map("programs")
}

// ============================================================
// STUDENT PROFILE
// ============================================================

model StudentProfile {
  id            String   @id @default(uuid())
  userId        String   @unique @map("user_id")
  user          User     @relation(fields: [userId], references: [id])
  studentNumber String   @unique @map("student_number")
  programId     String   @map("program_id")
  program       Program  @relation(fields: [programId], references: [id])
  yearLevel     Int      @map("year_level")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  enrollments       Enrollment[]
  enrollmentHistory EnrollmentHistory[]
  accountBalance    AccountBalance?
  documentRequests  DocumentRequest[]

  @@map("student_profiles")
}

// ============================================================
// COURSES & CURRICULUM
// ============================================================

model Course {
  id        String   @id @default(uuid())
  code      String   @unique
  title     String
  units     Int
  createdAt DateTime @default(now()) @map("created_at")

  curriculumCourses CurriculumCourse[]
  enrollments       Enrollment[]

  @@map("courses")
}

model Curriculum {
  id            String   @id @default(uuid())
  programId     String   @map("program_id")
  program       Program  @relation(fields: [programId], references: [id])
  effectiveYear Int      @map("effective_year")
  createdAt     DateTime @default(now()) @map("created_at")

  curriculumCourses CurriculumCourse[]

  @@map("curricula")
}

model CurriculumCourse {
  curriculumId String     @map("curriculum_id")
  courseId     String     @map("course_id")
  curriculum   Curriculum @relation(fields: [curriculumId], references: [id], onDelete: Cascade)
  course       Course     @relation(fields: [courseId], references: [id], onDelete: Cascade)
  yearLevel    Int        @map("year_level")
  semester     Int

  @@id([curriculumId, courseId])
  @@map("curriculum_courses")
}

// ============================================================
// ENROLLMENT
// ============================================================

model EnrollmentHistory {
  id        String         @id @default(uuid())
  studentId String         @map("student_id")
  student   StudentProfile @relation(fields: [studentId], references: [id])
  term      String
  status    String
  createdAt DateTime       @default(now()) @map("created_at")

  @@map("enrollment_history")
}

model Enrollment {
  id        String         @id @default(uuid())
  studentId String         @map("student_id")
  student   StudentProfile @relation(fields: [studentId], references: [id])
  courseId  String         @map("course_id")
  course    Course         @relation(fields: [courseId], references: [id])
  section   String?
  status    String         @default("enrolled")
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")

  grade Grade?

  @@map("enrollments")
}

// ============================================================
// GRADES — 3NF: student derived via enrollment → no student_id
// ============================================================

model Grade {
  id           String     @id @default(uuid())
  enrollmentId String     @unique @map("enrollment_id")
  enrollment   Enrollment @relation(fields: [enrollmentId], references: [id])
  prelim       Float?
  midterm      Float?
  finals       Float?
  finalGrade   Float?     @map("final_grade")
  isVisible    Boolean    @default(false) @map("is_visible")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")

  @@map("grades")
}

// ============================================================
// FINANCIAL
// ============================================================

model AccountBalance {
  id        String         @id @default(uuid())
  studentId String         @unique @map("student_id")
  student   StudentProfile @relation(fields: [studentId], references: [id])
  balance   Decimal        @db.Decimal(10, 2)
  status    String         @default("active")
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")

  @@map("account_balances")
}

// ============================================================
// DOCUMENT REQUESTS
// ============================================================

model DocumentRequest {
  id        String         @id @default(uuid())
  studentId String         @map("student_id")
  student   StudentProfile @relation(fields: [studentId], references: [id])
  type      String
  status    String         @default("pending")
  remarks   String?
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")

  @@map("document_requests")
}

// ============================================================
// EVENTS
// ============================================================

model Event {
  id          String   @id @default(uuid())
  title       String
  description String?
  startDate   DateTime @map("start_date")
  endDate     DateTime @map("end_date")
  status      String   @default("Upcoming")
  category    String?
  venue       String?
  createdBy   String   @map("created_by") @db.Uuid
  creator     User     @relation(fields: [createdBy], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("events")
}

// ============================================================
// NOTIFICATIONS
// ============================================================

model Notification {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  title     String
  message   String
  isRead    Boolean  @default(false) @map("is_read")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("notifications")
}

// ============================================================
// CHAT SYSTEM (scaffold — fully built in Phase 3)
// ============================================================

model ChatLog {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  user       User     @relation(fields: [userId], references: [id])
  message    String
  response   String
  intent     String?
  confidence Float?
  createdAt  DateTime @default(now()) @map("created_at")

  escalation EscalationQueue?

  @@map("chat_logs")
}

model EscalationQueue {
  id         String   @id @default(uuid())
  chatId     String   @unique @map("chat_id")
  chat       ChatLog  @relation(fields: [chatId], references: [id])
  status     String   @default("pending")
  assignedTo String?  @map("assigned_to")
  assignee   User?    @relation(fields: [assignedTo], references: [id])
  resolution String?
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("escalation_queue")
}
```


### File: `sisp-backend/src/app.controller.ts`

```ts
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      service: 'sisp-backend',
      database: this.prisma.isOffline ? 'offline-mock' : 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
```


### File: `sisp-backend/src/app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { StudentsModule } from './modules/students/students.module';
import { GradesModule } from './modules/grades/grades.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { ChatbotModule } from './modules/chat/chatbot.module';
import { EventsModule } from './modules/events/events.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    StudentsModule,
    GradesModule,
    EnrollmentModule,
    DocumentsModule,
    NotificationsModule,
    AuditModule,
    ChatbotModule,
    EventsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
```


### File: `sisp-backend/src/app.service.ts`

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): object {
    return {
      status: 'ok',
      service: 'sisp-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
```


### File: `sisp-backend/src/common/decorators/current-user.decorator.ts`

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);
```


### File: `sisp-backend/src/common/decorators/public.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```


### File: `sisp-backend/src/common/decorators/roles.decorator.ts`

```ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```


### File: `sisp-backend/src/common/guards/jwt-auth.guard.ts`

```ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```


### File: `sisp-backend/src/common/guards/roles.guard.ts`

```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```


### File: `sisp-backend/src/common/interceptors/audit-log.interceptor.ts`

```ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

// Routes to exclude from audit logging (auth endpoints)
const EXCLUDED_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      user?: JwtPayload;
      ip?: string;
      headers?: Record<string, string>;
    }>();

    const { method, url, user } = request;

    // Only log mutating methods
    if (!MUTATING_METHODS.includes(method)) {
      return next.handle();
    }

    // Skip excluded routes
    const cleanUrl = url.split('?')[0];
    if (EXCLUDED_ROUTES.some((route) => cleanUrl.endsWith(route))) {
      return next.handle();
    }

    // Skip if no authenticated user
    if (!user?.sub) {
      return next.handle();
    }

    const ipAddress =
      (request.headers?.['x-forwarded-for'] as string) ??
      request.ip ??
      'unknown';

    // Extract resource name from URL path
    // e.g. /api/grades/123 → resource = 'grades', resourceId = '123'
    const resource = this.extractResource(cleanUrl);
    const resourceId = this.extractResourceId(cleanUrl);

    return next.handle().pipe(
      tap({
        next: () => {
          // Write audit log after successful response
          void this.writeAuditLog(
            user.sub,
            `${method} ${cleanUrl}`,
            resource,
            resourceId,
            ipAddress,
          );
        },
        error: () => {
          // Do not log failed requests
        },
      }),
    );
  }

  private extractResource(url: string): string {
    // Remove /api/ prefix and split by /
    const parts = url.replace(/^\/api\//, '').split('/');
    return parts[0] ?? 'unknown';
  }

  private extractResourceId(url: string): string | null {
    const parts = url.replace(/^\/api\//, '').split('/');
    // Look for UUID-like segments (last path param)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const idParts = parts.filter((p) => uuidRegex.test(p));
    return idParts.length > 0 ? idParts[idParts.length - 1] : null;
  }

  private async writeAuditLog(
    userId: string,
    action: string,
    resource: string,
    resourceId: string | null,
    ipAddress: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          ipAddress,
        },
      });
    } catch {
      // Never let audit logging crash the application
      console.error('[AuditLog] Failed to write audit log');
    }
  }
}
```


### File: `sisp-backend/src/common/utils/require-student-profile.ts`

```ts
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export async function requireStudentProfile(prisma: PrismaService, userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new NotFoundException('Student profile not found. Please contact admin.');
  }
  return profile;
}

```


### File: `sisp-backend/src/common/utils/state-machine.ts`

```ts
import { BadRequestException } from '@nestjs/common';

export function assertTransition(
  current: string,
  next: string,
  transitions: Record<string, string[]>,
): void {
  const allowedNext = transitions[current] ?? [];
  if (!allowedNext.includes(next)) {
    throw new BadRequestException(
      `Cannot transition from '${current}' to '${next}'. ` +
        `Allowed next statuses: ${allowedNext.length > 0 ? allowedNext.join(', ') : 'none (terminal status)'}`,
    );
  }
}

```


### File: `sisp-backend/src/main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend dev server and production
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://sisp-theta.vercel.app',
    ],
    credentials: true,
  });

  // Global validation pipe — enforces class-validator decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Cookie parser middleware
  app.use(cookieParser());

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(`🚀 SISP Backend running on http://localhost:${port}/api`);
}

bootstrap();
```


### File: `sisp-backend/src/modules/admin/admin.controller.ts`

```ts
// Admin controller mapping secure administrative routes
import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  Delete,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('admin')
@Roles('admin_staff', 'dean', 'faculty')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  // ── Dashboard stats ──────────────────────────────────────
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── User management (FIX #2 — routes under /admin prefix) ──
  @Get('users')
  @Roles('admin_staff')
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.adminService.listUsers(pageNum, limitNum);
  }

  @Get('users/:id')
  @Roles('admin_staff')
  async getUser(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('users/:id')
  @Roles('admin_staff')
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateById(id, dto);
  }

  @Patch('users/:id/role')
  @Roles('admin_staff')
  async updateUserRole(
    @Param('id') id: string,
    @Body('roleName') roleName: string,
  ) {
    return this.adminService.updateUserRole(id, roleName);
  }

  @Patch('users/:id/deactivate')
  @Roles('admin_staff')
  async deactivateUser(@Param('id') id: string) {
    return this.adminService.deactivateUser(id);
  }

  @Post('users/create')
  @Roles('admin_staff')
  async createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Delete('users/:id')
  @Roles('admin_staff')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ── Dean exception approval (FIX #9) ─────────────────────
  @Post('dean/approve-exception')
  @Roles('dean', 'admin_staff')
  async approveException(
    @Body()
    body: {
      exceptionId: string;
      decision: 'approved' | 'rejected';
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.approveException(
      body.exceptionId,
      body.decision,
      user.sub,
    );
  }
}
```


### File: `sisp-backend/src/modules/admin/admin.module.ts`

```ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```


### File: `sisp-backend/src/modules/admin/admin.service.ts`

```ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, totalStudents, totalFaculty, totalRequests] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: { role: { name: 'student' } },
        }),
        this.prisma.user.count({
          where: { role: { name: 'faculty' } },
        }),
        this.prisma.documentRequest.count(),
      ]);

    return {
      totalUsers,
      totalStudents,
      totalFaculty,
      totalRequests,
    };
  }

  async approveException(
    exceptionId: string,
    decision: 'approved' | 'rejected',
    adminId: string,
  ) {
    // Find the document request (exceptions are tracked as document requests)
    const request = await this.prisma.documentRequest.findUnique({
      where: { id: exceptionId },
    });

    if (!request) {
      return { message: 'Exception request not found' };
    }

    const updated = await this.prisma.documentRequest.update({
      where: { id: exceptionId },
      data: {
        status: decision,
      },
    });

    return {
      message: `Exception ${decision} successfully`,
      data: updated,
    };
  }

  async listUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        include: {
          role: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count(),
    ]);

    return { data, total };
  }

  async updateUserRole(userId: string, roleName: string) {
    // Look up the role by name to get the actual UUID
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${roleName}' not found`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { roleId: role.id },
      include: { role: true },
    });
  }

  async deactivateUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: { role: true },
    });
  }

  async createUser(dto: CreateUserDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    // Find the role by name
    const role = await this.prisma.role.findUnique({
      where: { name: dto.roleName },
    });

    if (!role) {
      throw new NotFoundException(`Role '${dto.roleName}' not found`);
    }

    let temporaryPassword = '';
    let passwordHash = '';

    if (dto.roleName === 'student') {
      if (!dto.studentNumber) {
        throw new BadRequestException('Student ID number is required');
      }
      // Surname then last 4 digits of student number
      const surnameClean = dto.lastName.trim().replace(/\s+/g, '');
      const studentNumClean = dto.studentNumber.trim();
      const last4 = studentNumClean.substring(studentNumClean.length - 4);
      temporaryPassword = `${surnameClean}${last4}`;
    } else {
      if (!dto.temporaryPassword) {
        throw new BadRequestException('Temporary password is required for staff accounts');
      }
      temporaryPassword = dto.temporaryPassword;
    }

    passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: role.id,
        isActive: true,
        mustChangePassword: true,
      },
      include: {
        role: true,
      },
    });

    // Create student profile if student
    if (dto.roleName === 'student') {
      const programId = dto.programId || (await this.prisma.program.findFirst())?.id;
      if (!programId) {
        throw new BadRequestException('No program ID found in database to associate student with');
      }
      await this.prisma.studentProfile.create({
        data: {
          userId: user.id,
          studentNumber: dto.studentNumber!,
          programId,
          yearLevel: 1,
          accountBalance: {
            create: {
              balance: 0,
              status: 'good_standing',
            },
          },
        },
      });
    }

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
      temporaryPassword,
    };
  }

  async deleteUser(userId: string) {
    // 1. Programmatic cascade delete
    // Find if the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: {
          include: {
            accountBalance: true,
            enrollments: {
              include: {
                grade: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Programmatically delete all child dependencies of studentProfile first to avoid FK constraint errors!
    if (user.studentProfile) {
      const studentId = user.studentProfile.id;

      // Delete grades of student enrollments
      for (const enrollment of user.studentProfile.enrollments) {
        if (enrollment.grade) {
          await this.prisma.grade.deleteMany({
            where: { enrollmentId: enrollment.id },
          });
        }
      }

      // Delete enrollments
      await this.prisma.enrollment.deleteMany({
        where: { studentId },
      });

      // Delete document requests
      await this.prisma.documentRequest.deleteMany({
        where: { studentId },
      });

      // Delete account balance
      if (user.studentProfile.accountBalance) {
        await this.prisma.accountBalance.deleteMany({
          where: { studentId },
        });
      }

      // Delete student profile
      await this.prisma.studentProfile.delete({
        where: { id: studentId },
      });
    }

    // Delete chat logs and escalations
    const chatLogs = await this.prisma.chatLog.findMany({
      where: { userId },
    });
    const chatLogIds = chatLogs.map((c) => c.id);

    if (chatLogIds.length > 0) {
      await this.prisma.escalationQueue.deleteMany({
        where: { chatId: { in: chatLogIds } },
      });
    }

    await this.prisma.chatLog.deleteMany({
      where: { userId },
    });

    // Delete notifications
    await this.prisma.notification.deleteMany({
      where: { userId },
    });

    // Delete audit logs
    await this.prisma.auditLog.deleteMany({
      where: { userId },
    });

    // Finally, hard delete the user
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User account hard-deleted successfully' };
  }
}
```


### File: `sisp-backend/src/modules/admin/dto/create-user.dto.ts`

```ts
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsIn(['student', 'faculty', 'dean', 'admin_staff'], {
    message: 'roleName must be one of: student, faculty, dean, admin_staff',
  })
  @IsNotEmpty()
  roleName: string;

  // Student specific inputs
  @IsString()
  @IsOptional()
  studentNumber?: string;

  @IsString()
  @IsOptional()
  programId?: string;

  // Staff specific input
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Temporary password must be at least 8 characters' })
  @MaxLength(64)
  temporaryPassword?: string;
}

```


### File: `sisp-backend/src/modules/analytics/analytics.controller.ts`

```ts
import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('enrollment')
  @Roles('admin_staff', 'dean')
  async getEnrollmentStats() {
    return this.analyticsService.getEnrollmentStats();
  }

  @Get('grades')
  @Roles('admin_staff', 'dean', 'faculty')
  async getGpaDistribution() {
    const distribution = await this.analyticsService.getGpaDistribution();
    const passFailRates = await this.analyticsService.getPassFailRates();
    return {
      distribution,
      passFailRates,
    };
  }

  @Get('requests')
  @Roles('admin_staff')
  async getRequestVolume() {
    return this.analyticsService.getRequestVolume();
  }

  @Get('chatbot')
  @Roles('admin_staff')
  async getChatbotAnalytics() {
    return this.analyticsService.getChatbotAnalytics();
  }

  @Get('export/enrollment')
  @Roles('admin_staff')
  async exportEnrollmentExcel(@Res() res: Response) {
    const buffer = await this.analyticsService.exportEnrollmentExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=enrollment.xlsx',
    );
    res.send(buffer);
  }

  @Get('export/grades/:studentId')
  @Roles('admin_staff', 'dean')
  async exportGradesPdf(
    @Param('studentId') studentId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.analyticsService.exportGradesPdf(studentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=grades-${studentId}.pdf`,
    );
    res.send(buffer);
  }
}

```


### File: `sisp-backend/src/modules/analytics/analytics.module.ts`

```ts
import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

```


### File: `sisp-backend/src/modules/analytics/analytics.service.ts`

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class AnalyticsService {
  private static readonly PASSING_THRESHOLD = 75;

  constructor(private readonly prisma: PrismaService) {}

  async getEnrollmentStats() {
    const programStats = await this.prisma.studentProfile.groupBy({
      by: ['programId'],
      _count: { id: true },
    });

    const programs = await this.prisma.program.findMany();
    const programMap = new Map(programs.map((p) => [p.id, p.name]));
    
    const data = programStats.map((stat) => ({
      programId: stat.programId,
      programName: programMap.get(stat.programId) || 'Unknown',
      count: stat._count.id,
    }));

    const totalEnrolled = await this.prisma.studentProfile.count();

    return {
      data,
      totalEnrolled,
    };
  }

  async getGpaDistribution() {
    const grades = await this.prisma.grade.findMany({
      where: { isVisible: true },
      select: { finalGrade: true },
    });

    const brackets = {
      '90 - 100': 0,
      '80 - 89.99': 0,
      '75 - 79.99': 0,
      '60 - 74.99': 0,
      'Below 60': 0,
    };

    grades.forEach((g) => {
      if (g.finalGrade === null || g.finalGrade === undefined) return;
      const fg = g.finalGrade;
      if (fg >= 90) brackets['90 - 100']++;
      else if (fg >= 80) brackets['80 - 89.99']++;
      else if (fg >= 75) brackets['75 - 79.99']++;
      else if (fg >= 60) brackets['60 - 74.99']++;
      else brackets['Below 60']++;
    });

    return brackets;
  }

  async getPassFailRates() {
    const courseGrades = await this.prisma.grade.findMany({
      select: {
        finalGrade: true,
        enrollment: {
          select: {
            course: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const courseStatsMap = new Map<
      string,
      { code: string; title: string; pass: number; fail: number }
    >();

    courseGrades.forEach((g) => {
      const course = g.enrollment?.course;
      if (!course) return;
      if (!courseStatsMap.has(course.id)) {
        courseStatsMap.set(course.id, {
          code: course.code,
          title: course.title,
          pass: 0,
          fail: 0,
        });
      }
      const stat = courseStatsMap.get(course.id)!;
      if (g.finalGrade === null || g.finalGrade === undefined) return;
      if (g.finalGrade >= AnalyticsService.PASSING_THRESHOLD) {
        stat.pass++;
      } else {
        stat.fail++;
      }
    });

    return Array.from(courseStatsMap.values());
  }

  async getRequestVolume() {
    const requestStats = await this.prisma.documentRequest.groupBy({
      by: ['type', 'status'],
      _count: { id: true },
    });

    return requestStats.map((stat) => ({
      type: stat.type,
      status: stat.status,
      count: stat._count.id,
    }));
  }

  async getChatbotAnalytics() {
    const totalLogs = await this.prisma.chatLog.count();
    const intentStats = await this.prisma.chatLog.groupBy({
      by: ['intent'],
      _count: { id: true },
      _avg: { confidence: true },
    });

    const escalatedCount = await this.prisma.escalationQueue.count();
    const escalationRate = totalLogs > 0 ? escalatedCount / totalLogs : 0.0;

    return {
      totalLogs,
      escalatedCount,
      escalationRate,
      intentDistribution: intentStats.map((stat) => ({
        intent: stat.intent || 'unknown',
        count: stat._count.id,
        avgConfidence: stat._avg.confidence || 0.0,
      })),
    };
  }

  async exportEnrollmentExcel(): Promise<Buffer> {
    const students = await this.prisma.studentProfile.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        program: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Enrollment Report');

    worksheet.columns = [
      { header: 'Student Number', key: 'studentNumber', width: 20 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Program Code', key: 'programCode', width: 15 },
      { header: 'Program Name', key: 'programName', width: 35 },
      { header: 'Year Level', key: 'yearLevel', width: 12 },
    ];

    students.forEach((student) => {
      worksheet.addRow({
        studentNumber: student.studentNumber,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        programCode: student.program.code,
        programName: student.program.name,
        yearLevel: student.yearLevel,
      });
    });

    // Make header bold
    worksheet.getRow(1).font = { bold: true };

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    return buffer;
  }

  async exportGradesPdf(studentId: string): Promise<Buffer> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        program: {
          select: {
            name: true,
            code: true,
          },
        },
        enrollments: {
          include: {
            course: true,
            grade: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student profile with ID ${studentId} not found`);
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // PDF Branding Header
      doc.fontSize(20).fillColor('#1E1B4B').text('REGIS MARIE COLLEGE', { align: 'center' });
      doc.fontSize(10).fillColor('#64748B').text('OFFICIAL GRADE EVALUATION REPORT', { align: 'center' });
      doc.moveDown(2);

      // Student Info Block
      doc.fillColor('#000000').fontSize(11).text(`Student Name: `, { continued: true }).font('Helvetica-Bold').text(`${student.user.firstName} ${student.user.lastName}`).font('Helvetica');
      doc.text(`Student Number: `, { continued: true }).font('Helvetica-Bold').text(`${student.studentNumber}`).font('Helvetica');
      doc.text(`Program: `, { continued: true }).font('Helvetica-Bold').text(`${student.program.name} (${student.program.code})`).font('Helvetica');
      doc.text(`Year Level: `, { continued: true }).font('Helvetica-Bold').text(`${student.yearLevel}`).font('Helvetica');
      doc.text(`Email: `, { continued: true }).font('Helvetica-Bold').text(`${student.user.email}`).font('Helvetica');
      doc.moveDown(1.5);

      // Grade table Header
      const tableTop = 230;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
      doc.text('Course Code', 50, tableTop);
      doc.text('Course Title', 140, tableTop);
      doc.text('Prelims', 330, tableTop);
      doc.text('Midterms', 380, tableTop);
      doc.text('Finals', 430, tableTop);
      doc.text('Final Grade', 485, tableTop);

      doc.moveTo(50, tableTop + 13).lineTo(550, tableTop + 13).strokeColor('#E2E8F0').stroke();

      let y = tableTop + 23;
      doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a');
      student.enrollments.forEach((enrollment) => {
        const grade = enrollment.grade;
        doc.text(enrollment.course.code, 50, y);
        doc.text(enrollment.course.title.substring(0, 32), 140, y);
        doc.text(grade?.prelim !== null && grade?.prelim !== undefined ? String(grade?.prelim) : 'N/A', 330, y);
        doc.text(grade?.midterm !== null && grade?.midterm !== undefined ? String(grade?.midterm) : 'N/A', 380, y);
        doc.text(grade?.finals !== null && grade?.finals !== undefined ? String(grade?.finals) : 'N/A', 430, y);
        doc.text(grade?.finalGrade !== null && grade?.finalGrade !== undefined ? String(grade?.finalGrade) : 'N/A', 485, y);
        y += 18;
      });

      doc.end();
    });
  }
}

```


### File: `sisp-backend/src/modules/audit/audit.controller.ts`

```ts
import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('audit')
@Roles('admin_staff', 'dean')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('stats')
  async getStats() {
    return this.auditService.getAuditStats();
  }

  @Get('user/:userId')
  async getByUser(@Param('userId') userId: string) {
    return this.auditService.getLogsByUser(userId);
  }

  @Get('resource/:resource')
  async getByResource(@Param('resource') resource: string) {
    return this.auditService.getLogsByResource(resource);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.auditService.getLogById(id);
  }

  @Get()
  async getAllLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('resource') resource?: string,
  ) {
    return this.auditService.getAllLogs(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      userId,
      resource,
    );
  }
}
```


### File: `sisp-backend/src/modules/audit/audit.module.ts`

```ts
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
```


### File: `sisp-backend/src/modules/audit/audit.service.ts`

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllLogs(
    page = 1,
    limit = 50,
    userId?: string,
    resource?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: {
      userId?: string;
      resource?: string;
    } = {};

    if (userId) where.userId = userId;
    if (resource) where.resource = resource;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              role: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLogById(id: string) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return log;
  }

  async getLogsByUser(userId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      data: logs,
      total: logs.length,
    };
  }

  async getLogsByResource(resource: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { resource },
      include: {
        user: {
          select: {
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      data: logs,
      total: logs.length,
    };
  }

  async getAuditStats() {
    const [totalLogs, uniqueUsers, recentLogs] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        _count: true,
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              email: true,
              role: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    return {
      totalLogs,
      uniqueUsers: uniqueUsers.length,
      recentActivity: recentLogs,
    };
  }
}
```


### File: `sisp-backend/src/modules/auth/auth.controller.ts`

```ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto.newPassword);
  }
}
```


### File: `sisp-backend/src/modules/auth/auth.module.ts`

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not set. Refusing to start with an insecure default.');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1d',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
```


### File: `sisp-backend/src/modules/auth/auth.service.ts`

```ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(_dto: RegisterDto): Promise<never> {
    throw new ForbiddenException(
      'Public self-registration is disabled. Please contact your administrator.',
    );
  }

  async login(dto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role.name,
    );

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        mustChangePassword: user.mustChangePassword,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub as string },
        include: { role: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role.name,
      );

      return {
        message: 'Token refreshed successfully',
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private getRequiredSecret(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is not set. Refusing to sign tokens with an insecure default.`);
    }
    return value;
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.getRequiredSecret('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.getRequiredSecret('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async changePassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return { message: 'Password updated successfully' };
  }
}
```


### File: `sisp-backend/src/modules/auth/dto/change-password.dto.ts`

```ts
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  @IsNotEmpty()
  newPassword: string;
}

```


### File: `sisp-backend/src/modules/auth/dto/login.dto.ts`

```ts
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}
```


### File: `sisp-backend/src/modules/auth/dto/refresh.dto.ts`

```ts
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```


### File: `sisp-backend/src/modules/auth/dto/register.dto.ts`

```ts
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(64, { message: 'Password must not exceed 64 characters' })
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  roleName: string;
}
```


### File: `sisp-backend/src/modules/auth/strategies/jwt.strategy.ts`

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not set. Refusing to start with an insecure default.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```


### File: `sisp-backend/src/modules/chat/chatbot.controller.ts`

```ts
import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('chat')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post()
  async sendMessage(
    @CurrentUser() user: JwtPayload,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatbotService.sendMessage(user.sub, sendMessageDto);
  }

  @Get('history')
  async getHistory(@CurrentUser() user: JwtPayload) {
    return this.chatbotService.getHistory(user.sub);
  }
}

@Controller('admin/escalations')
@Roles('admin_staff', 'dean')
export class ChatbotAdminController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Get()
  async getEscalations() {
    return this.chatbotService.getEscalations();
  }

  @Patch(':id')
  async resolveEscalation(
    @Param('id') id: string,
    @Body() body: { resolution: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatbotService.resolveEscalation(id, body.resolution, user.sub);
  }
}

```


### File: `sisp-backend/src/modules/chat/chatbot.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ChatbotController, ChatbotAdminController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

@Module({
  controllers: [ChatbotController, ChatbotAdminController],
  providers: [ChatbotService],
  exports: [ChatbotService],
})
export class ChatbotModule {}

```


### File: `sisp-backend/src/modules/chat/chatbot.service.ts`

```ts
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.mlServiceUrl = this.config.get<string>('ML_SERVICE_URL') || 'http://localhost:8000';
  }

  /**
   * Process a student's chat message through ML RAG, log to database, and escalate if needed.
   */
  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const { message, history } = sendMessageDto;
    
    let mlResponse;
    let fallbackUsed = false;

    const ML_TIMEOUT_MS = 12000;

    // 1. Call FastAPI ML Service
    try {
      this.logger.log(`Forwarding query to ML service: ${this.mlServiceUrl}/chat`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);

      let response;
      try {
        response = await fetch(`${this.mlServiceUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: message,
            history: history || [],
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(`ML Service returned status ${response.status}`);
      }

      mlResponse = await response.json();
    } catch (error: any) {
      const reason = error.name === 'AbortError' ? 'timed out' : error.message;
      this.logger.error(`Failed to connect to ML service: ${reason}. Triggering local fallback...`);
      fallbackUsed = true;
      // Elegant fallback when ML microservice is offline
      mlResponse = {
        response: `### Hello! I am ARIA, your Academic Advisory Assistant.\n\n` +
          `I am currently undergoing scheduled system updates and could not query our policy handbook database.\n\n` +
          `To ensure you get the assistance you need, **I have automatically escalated this chat to a human academic advisor**. ` +
          `A registrar staff member or academic Dean will review your request and message you back directly in this portal shortly!`,
        intent: 'general_inquiry',
        confidence: 0.0,
        escalate: true,
        sources: [],
      };
    }

    // 2. Save ChatLog in DB
    const chatLog = await this.prisma.chatLog.create({
      data: {
        userId,
        message,
        response: mlResponse.response,
        intent: mlResponse.intent,
        confidence: mlResponse.confidence,
      },
    });

    // 3. Create Escalation if flagged
    let escalation = null;
    if (mlResponse.escalate) {
      this.logger.log(`Escalating ChatLog ID: ${chatLog.id} to human advisor queue.`);
      escalation = await this.prisma.escalationQueue.create({
        data: {
          chatId: chatLog.id,
          status: 'pending',
        },
      });
    }

    return {
      chatId: chatLog.id,
      response: mlResponse.response,
      intent: mlResponse.intent,
      confidence: mlResponse.confidence,
      escalated: !!escalation,
      sources: mlResponse.sources,
      createdAt: chatLog.createdAt,
    };
  }

  /**
   * Retrieve chat history for a student.
   */
  async getHistory(userId: string) {
    return this.prisma.chatLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        escalation: true,
      },
    });
  }

  /**
   * Retrieve all unresolved escalations for advisors/admins.
   */
  async getEscalations() {
    return this.prisma.escalationQueue.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        chat: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Resolve an academic inquiry escalation by providing an official resolution response.
   */
  async resolveEscalation(escalationId: string, resolution: string, resolverId: string) {
    const escalation = await this.prisma.escalationQueue.findUnique({
      where: { id: escalationId },
      include: { chat: true },
    });

    if (!escalation) {
      throw new HttpException('Escalation record not found.', HttpStatus.NOT_FOUND);
    }

    // Update escalation record
    const updatedEscalation = await this.prisma.escalationQueue.update({
      where: { id: escalationId },
      data: {
        status: 'resolved',
        resolution,
        assignedTo: resolverId,
      },
    });

    // Option: Insert a follow-up chat log system entry letting the student know the resolution has been provided
    await this.prisma.chatLog.create({
      data: {
        userId: escalation.chat.userId,
        message: `[ADVISOR ANSWER TO ESCALATION ID ${escalationId}]`,
        response: `### 📢 Official Advisor Resolution:\n\n${resolution}\n\n*(This query has been resolved by advisor ${resolverId})*`,
        intent: 'general_inquiry',
        confidence: 1.0,
      },
    });

    return updatedEscalation;
  }
}

```


### File: `sisp-backend/src/modules/chat/dto/send-message.dto.ts`

```ts
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant' | 'system';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  history?: ChatMessageDto[];
}

```


### File: `sisp-backend/src/modules/documents/documents.controller.ts`

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('requests')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Student views their own requests
  @Get('me')
  @Roles('student')
  async getMyRequests(@CurrentUser() user: JwtPayload) {
    return this.documentsService.getMyRequests(user.sub);
  }

  // Admin views request statistics
  @Get('stats')
  @Roles('admin_staff', 'dean')
  async getStats() {
    return this.documentsService.getRequestStats();
  }

  // Admin views all requests with optional filters
  @Get()
  @Roles('admin_staff', 'dean')
  async getAllRequests(
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.documentsService.getAllRequests(status, type);
  }

  // Admin views a single request
  @Get(':id')
  @Roles('admin_staff', 'dean')
  async getRequestById(@Param('id') id: string) {
    return this.documentsService.getRequestById(id);
  }

  // Student submits a new document request
  @Post()
  @Roles('student')
  async createRequest(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRequestDto,
  ) {
    return this.documentsService.createRequest(user.sub, dto);
  }

  // Admin updates request status
  @Patch(':id')
  @Roles('admin_staff', 'dean')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRequestDto,
  ) {
    return this.documentsService.updateRequestStatus(id, dto);
  }
}
```


### File: `sisp-backend/src/modules/documents/documents.module.ts`

```ts
import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
```


### File: `sisp-backend/src/modules/documents/documents.service.ts`

```ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { assertTransition } from '../../common/utils/state-machine';
import { requireStudentProfile } from '../../common/utils/require-student-profile';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['released'],
  released: [],
  rejected: [],
};

const DOCUMENT_LABELS: Record<string, string> = {
  transcript_of_records: 'Transcript of Records',
  certificate_of_enrollment: 'Certificate of Enrollment',
  certificate_of_good_moral: 'Certificate of Good Moral Character',
  diploma: 'Diploma',
  course_description: 'Course Description',
  authentication: 'Document Authentication',
  other: 'Other Document',
};

const STATUS_MESSAGES: Record<string, string> = {
  under_review: 'is now under review',
  approved: 'has been approved',
  released: 'is ready for release/pickup',
  rejected: 'has been rejected',
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRequest(userId: string, dto: CreateRequestDto) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const request = await this.prisma.documentRequest.create({
      data: {
        studentId: profile.id,
        type: dto.type,
        status: 'pending',
        remarks: dto.remarks,
      },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    return {
      message: `Document request for '${DOCUMENT_LABELS[dto.type] ?? dto.type}' submitted successfully`,
      data: {
        ...request,
        typeLabel: DOCUMENT_LABELS[request.type] ?? request.type,
      },
    };
  }

  async getMyRequests(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const requests = await this.prisma.documentRequest.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: requests.map((r) => ({
        ...r,
        typeLabel: DOCUMENT_LABELS[r.type] ?? r.type,
        statusStep: this.getStatusStep(r.status),
      })),
      total: requests.length,
    };
  }

  async getAllRequests(status?: string, type?: string) {
    const where: {
      status?: string;
      type?: string;
    } = {};

    if (status) where.status = status;
    if (type) where.type = type;

    const requests = await this.prisma.documentRequest.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { email: true } },
            program: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: requests.map((r) => ({
        ...r,
        typeLabel: DOCUMENT_LABELS[r.type] ?? r.type,
        statusStep: this.getStatusStep(r.status),
      })),
      total: requests.length,
    };
  }

  async getRequestById(id: string) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
            program: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Document request with ID ${id} not found`,
      );
    }

    return {
      ...request,
      typeLabel: DOCUMENT_LABELS[request.type] ?? request.type,
      statusStep: this.getStatusStep(request.status),
    };
  }

  async updateRequestStatus(id: string, dto: UpdateRequestDto) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(
        `Document request with ID ${id} not found`,
      );
    }

    assertTransition(request.status, dto.status, STATUS_TRANSITIONS);

    const updated = await this.prisma.documentRequest.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    // Send notification to the student
    const statusMessage = STATUS_MESSAGES[dto.status];
    if (statusMessage) {
      const docLabel =
        DOCUMENT_LABELS[request.type] ?? request.type;
      await this.notificationsService.sendToUser(
        request.student.user.id,
        'Document Request Update',
        `Your request for ${docLabel} ${statusMessage}.${dto.remarks ? ` Remarks: ${dto.remarks}` : ''}`,
      );
    }

    return {
      message: `Request status updated to '${dto.status}'`,
      data: {
        ...updated,
        typeLabel: DOCUMENT_LABELS[updated.type] ?? updated.type,
        statusStep: this.getStatusStep(updated.status),
      },
    };
  }

  async getRequestStats() {
    const [pending, under_review, approved, released, rejected] =
      await Promise.all([
        this.prisma.documentRequest.count({
          where: { status: 'pending' },
        }),
        this.prisma.documentRequest.count({
          where: { status: 'under_review' },
        }),
        this.prisma.documentRequest.count({
          where: { status: 'approved' },
        }),
        this.prisma.documentRequest.count({
          where: { status: 'released' },
        }),
        this.prisma.documentRequest.count({
          where: { status: 'rejected' },
        }),
      ]);

    return {
      pending,
      under_review,
      approved,
      released,
      rejected,
      total:
        pending + under_review + approved + released + rejected,
    };
  }

  private getStatusStep(status: string): number {
    const steps: Record<string, number> = {
      pending: 1,
      under_review: 2,
      approved: 3,
      released: 4,
      rejected: 0,
    };
    return steps[status] ?? 0;
  }
}
```


### File: `sisp-backend/src/modules/documents/dto/create-request.dto.ts`

```ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(
    [
      'transcript_of_records',
      'certificate_of_enrollment',
      'certificate_of_good_moral',
      'diploma',
      'course_description',
      'authentication',
      'other',
    ],
    {
      message:
        'Document type must be one of the allowed types',
    },
  )
  type: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
```


### File: `sisp-backend/src/modules/documents/dto/update-request.dto.ts`

```ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class UpdateRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(
    ['pending', 'under_review', 'approved', 'released', 'rejected'],
    {
      message:
        'Status must be one of: pending, under_review, approved, released, rejected',
    },
  )
  status: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
```


### File: `sisp-backend/src/modules/enrollment/dto/create-history.dto.ts`

```ts
import {
  IsString,
  IsNotEmpty,
  IsIn,
} from 'class-validator';

export class CreateHistoryDto {
  @IsString()
  @IsNotEmpty()
  term: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['enrolled', 'completed', 'withdrawn', 'on_leave'], {
    message: 'Status must be one of: enrolled, completed, withdrawn, on_leave',
  })
  status: string;
}
```


### File: `sisp-backend/src/modules/enrollment/dto/enroll.dto.ts`

```ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class EnrollDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsOptional()
  section?: string;
}
```


### File: `sisp-backend/src/modules/enrollment/dto/update-enrollment.dto.ts`

```ts
import {
  IsString,
  IsNotEmpty,
  IsIn,
} from 'class-validator';

export class UpdateEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['enrolled', 'dropped', 'completed', 'failed'], {
    message: 'Status must be one of: enrolled, dropped, completed, failed',
  })
  status: string;
}
```


### File: `sisp-backend/src/modules/enrollment/enrollment.controller.ts`

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollDto } from './dto/enroll.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CreateHistoryDto } from './dto/create-history.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  // Get available courses for enrollment
  @Get('courses')
  @Roles('student', 'admin_staff', 'dean', 'faculty')
  async getAvailableCourses() {
    return this.enrollmentService.getAvailableCourses();
  }

  // Student views their own enrollment history
  @Get('history')
  @Roles('student')
  async getMyHistory(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.getMyHistory(user.sub);
  }

  // Student views their own enrollments
  @Get('me')
  @Roles('student')
  async getMyEnrollments(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.getMyEnrollments(user.sub);
  }

  // Admin views all enrollments
  @Get()
  @Roles('admin_staff', 'dean', 'faculty')
  async getAllEnrollments(
    @Query('studentId') studentId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.enrollmentService.getAllEnrollments(studentId, courseId);
  }

  // Student enrolls in a course
  @Post()
  @Roles('student')
  async enroll(
    @CurrentUser() user: JwtPayload,
    @Body() dto: EnrollDto,
  ) {
    return this.enrollmentService.enroll(user.sub, dto);
  }

  // Student drops a course
  @Patch(':id/drop')
  @Roles('student')
  async dropCourse(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.enrollmentService.dropCourse(id, user.sub);
  }

  // Admin updates enrollment status
  @Patch(':id/status')
  @Roles('admin_staff', 'dean')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.enrollmentService.updateEnrollmentStatus(id, dto);
  }

  // Admin creates enrollment history record
  @Post(':studentId/history')
  @Roles('admin_staff', 'dean')
  async createHistory(
    @Param('studentId') studentId: string,
    @Body() dto: CreateHistoryDto,
  ) {
    return this.enrollmentService.createHistory(studentId, dto);
  }
}
```


### File: `sisp-backend/src/modules/enrollment/enrollment.module.ts`

```ts
import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';

@Module({
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
```


### File: `sisp-backend/src/modules/enrollment/enrollment.service.ts`

```ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EnrollDto } from './dto/enroll.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { CreateHistoryDto } from './dto/create-history.dto';
import { requireStudentProfile } from '../../common/utils/require-student-profile';

@Injectable()
export class EnrollmentService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(userId: string, dto: EnrollDto) {
    // Get student profile from userId
    const profile = await requireStudentProfile(this.prisma, userId);

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });

    if (!course) {
      throw new NotFoundException(
        `Course with ID ${dto.courseId} not found`,
      );
    }

    // Check if already enrolled in this course
    const existing = await this.prisma.enrollment.findFirst({
      where: {
        studentId: profile.id,
        courseId: dto.courseId,
        status: 'enrolled',
      },
    });

    if (existing) {
      throw new ConflictException(
        `You are already enrolled in ${course.code} - ${course.title}`,
      );
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        studentId: profile.id,
        courseId: dto.courseId,
        section: dto.section,
        status: 'enrolled',
      },
      include: {
        course: {
          select: {
            code: true,
            title: true,
            units: true,
          },
        },
        student: {
          select: {
            studentNumber: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    // Auto-create a default Grade record for this enrollment so the student immediately appears in the grade evaluation matrix
    try {
      await this.prisma.grade.create({
        data: {
          enrollmentId: enrollment.id,
          prelim: null,
          midterm: null,
          finals: null,
          finalGrade: null,
          isVisible: false,
        },
      });
    } catch (gradeErr) {
      console.error('Failed to auto-create grade record on enrollment:', gradeErr);
      // Non-blocking catch to ensure enrollment success still completes
    }

    return {
      message: `Successfully enrolled in ${course.code} - ${course.title}`,
      data: enrollment,
    };
  }

  async getMyEnrollments(userId: string) {
    const profile = await requireStudentProfile(this.prisma, userId);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: profile.id },
      include: {
        course: {
          select: {
            code: true,
            title: true,
            units: true,
          },
        },
        grade: {
          select: {
            prelim: true,
            midterm: true,
            finals: true,
            finalGrade: true,
            isVisible: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalUnits = enrollments
      .filter((e) => e.status === 'enrolled')
      .reduce((sum, e) => sum + e.course.units, 0);

    return {
      data: enrollments,
      total: enrollments.length,
      totalUnits,
    };
  }

  async getAllEnrollments(studentId?: string, courseId?: string) {
    const where: {
      studentId?: string;
      courseId?: string;
    } = {};

    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
        course: {
          select: {
            code: true,
            title: true,
            units: true,
          },
        },
        student: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        grade: {
          select: {
            finalGrade: true,
            isVisible: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: enrollments,
      total: enrollments.length,
    };
  }

  async updateEnrollmentStatus(id: string, dto: UpdateEnrollmentDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: { select: { code: true, title: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    // Prevent re-enrolling a dropped course directly
    if (enrollment.status === 'dropped' && dto.status === 'enrolled') {
      throw new BadRequestException(
        'Cannot re-enroll a dropped course. Submit a new enrollment instead.',
      );
    }

    const updated = await this.prisma.enrollment.update({
      where: { id },
      data: { status: dto.status },
      include: {
        course: {
          select: { code: true, title: true, units: true },
        },
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    return {
      message: `Enrollment status updated to '${dto.status}'`,
      data: updated,
    };
  }

  async dropCourse(enrollmentId: string, userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: { select: { code: true, title: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(
        `Enrollment with ID ${enrollmentId} not found`,
      );
    }

    // Verify the enrollment belongs to this student
    if (enrollment.studentId !== profile.id) {
      throw new BadRequestException(
        'You can only drop your own enrollments',
      );
    }

    if (enrollment.status === 'dropped') {
      throw new ConflictException('This course is already dropped');
    }

    const updated = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'dropped' },
      include: {
        course: { select: { code: true, title: true } },
      },
    });

    return {
      message: `Successfully dropped ${enrollment.course.code} - ${enrollment.course.title}`,
      data: updated,
    };
  }

  async getMyHistory(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Student profile not found');
    }

    const history = await this.prisma.enrollmentHistory.findMany({
      where: { studentId: profile.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: history,
      total: history.length,
    };
  }

  async createHistory(
    studentProfileId: string,
    dto: CreateHistoryDto,
  ) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Student profile with ID ${studentProfileId} not found`,
      );
    }

    const history = await this.prisma.enrollmentHistory.create({
      data: {
        studentId: studentProfileId,
        term: dto.term,
        status: dto.status,
      },
    });

    return {
      message: 'Enrollment history record created',
      data: history,
    };
  }

  async getAvailableCourses() {
    const courses = await this.prisma.course.findMany({
      orderBy: { code: 'asc' },
    });

    return {
      data: courses,
      total: courses.length,
    };
  }
}
```


### File: `sisp-backend/src/modules/events/dto/update-event-status.dto.ts`

```ts
import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

const VALID_STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] as const;

export class UpdateEventStatusDto {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    return value;
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_STATUSES, {
    message: `"status" must be one of [${VALID_STATUSES.join(', ')}]`,
  })
  status: string;
}

```


### File: `sisp-backend/src/modules/events/events.controller.ts`

```ts
import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Roles('admin_staff', 'dean', 'faculty', 'student')
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.eventsService.findAll(Number(page) || 1, Number(limit) || 15);
  }

  @Get('categories')
  @Roles('admin_staff', 'dean', 'faculty', 'student')
  async getCategories() {
    return this.eventsService.getCategories();
  }

  @Get(':id')
  @Roles('admin_staff', 'dean', 'faculty', 'student')
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('admin_staff', 'dean')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(id, dto);
  }
}

```


### File: `sisp-backend/src/modules/events/events.module.ts`

```ts
import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

@Module({
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

```


### File: `sisp-backend/src/modules/events/events.service.ts`

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import { assertTransition } from '../../common/utils/state-machine';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  Upcoming: ['Ongoing', 'Cancelled'],
  Ongoing: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      this.prisma.event.count(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return { data: event };
  }

  async getCategories() {
    const result = await this.prisma.event.findMany({
      select: { category: true },
      distinct: ['category'],
      where: { category: { not: null } },
    });

    const categories = result
      .map((r) => r.category)
      .filter((c): c is string => c !== null);

    return { data: categories };
  }

  async updateStatus(id: string, dto: UpdateEventStatusDto) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    assertTransition(event.status, dto.status, STATUS_TRANSITIONS);

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: dto.status },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return {
      message: `Event status updated to '${dto.status}'`,
      data: updated,
    };
  }
}

```


### File: `sisp-backend/src/modules/grades/dto/bulk-grade.dto.ts`

```ts
import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkGradeItemDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  prelim?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  midterm?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  finals?: number;
}

export class BulkGradeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkGradeItemDto)
  grades: BulkGradeItemDto[];
}
```


### File: `sisp-backend/src/modules/grades/dto/create-grade.dto.ts`

```ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  prelim?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  midterm?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  finals?: number;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;
}
```


### File: `sisp-backend/src/modules/grades/dto/update-grade.dto.ts`

```ts
import {
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class UpdateGradeDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  prelim?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  midterm?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  finals?: number;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;
}
```


### File: `sisp-backend/src/modules/grades/grades.controller.ts`

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  // Student views their own visible grades
  @Get('me')
  @Roles('student')
  async getMyGrades(@CurrentUser() user: JwtPayload) {
    return this.gradesService.getMyGrades(user.sub);
  }

  // Faculty/Admin views all grades
  @Get()
  @Roles('faculty', 'admin_staff', 'dean')
  async getAllGrades(
    @Query('studentId') studentId?: string,
    @Query('enrollmentId') enrollmentId?: string,
  ) {
    if (enrollmentId) {
      return this.gradesService.getGradesByEnrollment(enrollmentId);
    }
    if (studentId) {
      return this.gradesService.getGradesByStudent(studentId);
    }
    return this.gradesService.getAllGrades();
  }

  // Faculty encodes a grade for an enrollment
  @Post()
  @Roles('faculty', 'admin_staff', 'dean')
  async createGrade(@Body() dto: CreateGradeDto) {
    return this.gradesService.createGrade(dto);
  }

  // Faculty bulk encodes grades
  @Post('bulk')
  @Roles('faculty', 'admin_staff', 'dean')
  async bulkCreateGrades(@Body() dto: BulkGradeDto) {
    return this.gradesService.bulkCreateGrades(dto);
  }

  // Faculty updates grade components
  @Patch(':id')
  @Roles('faculty', 'admin_staff', 'dean')
  async updateGrade(
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.gradesService.updateGrade(id, dto);
  }

  // Faculty toggles grade visibility for students
  @Patch(':id/visibility')
  @Roles('faculty', 'admin_staff', 'dean')
  async toggleVisibility(
    @Param('id') id: string,
    @Body() body: { isVisible: boolean },
  ) {
    return this.gradesService.toggleVisibility(id, body.isVisible);
  }
}
```


### File: `sisp-backend/src/modules/grades/grades.module.ts`

```ts
import { Module } from '@nestjs/common';
import { GradesService } from './grades.service';
import { GradesController } from './grades.controller';

@Module({
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}
```


### File: `sisp-backend/src/modules/grades/grades.service.ts`

```ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { requireStudentProfile } from '../../common/utils/require-student-profile';

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  // Compute final grade from components
  private computeFinalGrade(
    prelim?: number | null,
    midterm?: number | null,
    finals?: number | null,
  ): number | null {
    if (
      prelim === null || prelim === undefined ||
      midterm === null || midterm === undefined ||
      finals === null || finals === undefined
    ) {
      return null;
    }
    // Standard formula: Prelim 30% + Midterm 30% + Finals 40%
    return parseFloat(
      (prelim * 0.3 + midterm * 0.3 + finals * 0.4).toFixed(2),
    );
  }

  async createGrade(dto: CreateGradeDto) {
    // Verify enrollment exists
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.enrollmentId },
      include: {
        student: {
          include: {
            user: { select: { email: true } },
          },
        },
        course: { select: { code: true, title: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(
        `Enrollment with ID ${dto.enrollmentId} not found`,
      );
    }

    // Check if grade already exists for this enrollment
    const existing = await this.prisma.grade.findUnique({
      where: { enrollmentId: dto.enrollmentId },
    });

    if (existing) {
      throw new ConflictException(
        'A grade record already exists for this enrollment. Use PATCH to update.',
      );
    }

    const finalGrade = this.computeFinalGrade(
      dto.prelim,
      dto.midterm,
      dto.finals,
    );

    const grade = await this.prisma.grade.create({
      data: {
        enrollmentId: dto.enrollmentId,
        prelim: dto.prelim,
        midterm: dto.midterm,
        finals: dto.finals,
        finalGrade,
        isVisible: dto.isVisible ?? false,
      },
      include: {
        enrollment: {
          include: {
            student: {
              include: {
                user: { select: { email: true } },
              },
            },
            course: { select: { code: true, title: true } },
          },
        },
      },
    });

    return {
      message: 'Grade created successfully',
      data: grade,
    };
  }

  async updateGrade(id: string, dto: UpdateGradeDto) {
    const existing = await this.prisma.grade.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    // Compute new final grade using updated or existing values
    const prelim = dto.prelim ?? existing.prelim;
    const midterm = dto.midterm ?? existing.midterm;
    const finals = dto.finals ?? existing.finals;
    const finalGrade = this.computeFinalGrade(prelim, midterm, finals);

    const updated = await this.prisma.grade.update({
      where: { id },
      data: {
        ...(dto.prelim !== undefined && { prelim: dto.prelim }),
        ...(dto.midterm !== undefined && { midterm: dto.midterm }),
        ...(dto.finals !== undefined && { finals: dto.finals }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        finalGrade,
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true } },
            student: {
              include: {
                user: { select: { email: true } },
              },
            },
          },
        },
      },
    });

    return {
      message: 'Grade updated successfully',
      data: updated,
    };
  }

  async toggleVisibility(id: string, isVisible: boolean) {
    const existing = await this.prisma.grade.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    const updated = await this.prisma.grade.update({
      where: { id },
      data: { isVisible },
    });

    return {
      message: `Grade ${isVisible ? 'published' : 'hidden'} successfully`,
      data: updated,
    };
  }

  async getGradesByEnrollment(enrollmentId: string) {
    const grade = await this.prisma.grade.findUnique({
      where: { enrollmentId },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true, units: true } },
          },
        },
      },
    });

    if (!grade) {
      throw new NotFoundException(
        `No grade found for enrollment ${enrollmentId}`,
      );
    }

    return grade;
  }

  async getMyGrades(userId: string) {
    // Get student profile from userId
    const profile = await requireStudentProfile(this.prisma, userId);

    const grades = await this.prisma.grade.findMany({
      where: {
        enrollment: {
          studentId: profile.id,
        },
        isVisible: true,
      },
      include: {
        enrollment: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
                units: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: grades,
      total: grades.length,
    };
  }

  async getAllGrades() {
    const grades = await this.prisma.grade.findMany({
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true, units: true } },
            student: {
              include: {
                user: { select: { email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: grades,
      total: grades.length,
    };
  }

  async getGradesByStudent(studentProfileId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });

    if (!profile) {
      throw new NotFoundException(
        `Student profile with ID ${studentProfileId} not found`,
      );
    }

    const grades = await this.prisma.grade.findMany({
      where: {
        enrollment: {
          studentId: studentProfileId,
        },
      },
      include: {
        enrollment: {
          include: {
            course: { select: { code: true, title: true, units: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: grades,
      total: grades.length,
    };
  }

  async bulkCreateGrades(dto: BulkGradeDto) {
    const results = [];
    const errors = [];

    for (const item of dto.grades) {
      try {
        const result = await this.createGrade(item);
        results.push(result.data);
      } catch (error: unknown) {
        const err = error as { message: string };
        errors.push({
          enrollmentId: item.enrollmentId,
          error: err.message,
        });
      }
    }

    return {
      message: `Bulk grade encoding complete. ${results.length} succeeded, ${errors.length} failed.`,
      data: results,
      errors,
    };
  }
}
```


### File: `sisp-backend/src/modules/notifications/dto/send-notification.dto.ts`

```ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsIn,
  IsUUID,
} from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['student', 'faculty', 'admin_staff', 'dean', 'all'])
  targetRole?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];
}
```


### File: `sisp-backend/src/modules/notifications/notifications.controller.ts`

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  // Get unread notification count (for NotificationBell)
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  // Admin views all notifications
  @Get('admin/all')
  @Roles('admin_staff', 'dean')
  async getAllAdmin() {
    return this.notificationsService.getAllNotificationsAdmin();
  }

  // Get own notifications
  @Get()
  async getMyNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      user.sub,
      unreadOnly === 'true',
    );
  }

  // Mark all as read
  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  // Mark one as read
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  // Delete a notification
  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationsService.deleteNotification(id, user.sub);
  }

  // Admin sends a notification
  @Post('send')
  @Roles('admin_staff', 'dean')
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }
}
```


### File: `sisp-backend/src/modules/notifications/notifications.module.ts`

```ts
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```


### File: `sisp-backend/src/modules/notifications/notifications.service.ts`

```ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyNotifications(userId: string, unreadOnly = false) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return {
      data: notifications,
      total: notifications.length,
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${id} not found`,
      );
    }

    if (notification.userId !== userId) {
      throw new BadRequestException(
        'You can only mark your own notifications as read',
      );
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return {
      message: 'Notification marked as read',
      data: updated,
    };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return {
      message: `${result.count} notification(s) marked as read`,
      count: result.count,
    };
  }

  async deleteNotification(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${id} not found`,
      );
    }

    if (notification.userId !== userId) {
      throw new BadRequestException(
        'You can only delete your own notifications',
      );
    }

    await this.prisma.notification.delete({ where: { id } });

    return { message: 'Notification deleted successfully' };
  }

  async sendNotification(dto: SendNotificationDto) {
    // Must have at least one target
    if (!dto.userId && !dto.targetRole && !dto.userIds?.length) {
      throw new BadRequestException(
        'Must provide userId, targetRole, or userIds',
      );
    }

    const notificationsToCreate: {
      userId: string;
      title: string;
      message: string;
    }[] = [];

    // Send to a specific single user
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException(
          `User with ID ${dto.userId} not found`,
        );
      }

      notificationsToCreate.push({
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
      });
    }

    // Send to multiple specific users
    if (dto.userIds?.length) {
      for (const uid of dto.userIds) {
        notificationsToCreate.push({
          userId: uid,
          title: dto.title,
          message: dto.message,
        });
      }
    }

    // Broadcast to all users of a role
    if (dto.targetRole) {
      const whereClause =
        dto.targetRole === 'all'
          ? {}
          : { role: { name: dto.targetRole } };

      const users = await this.prisma.user.findMany({
        where: {
          ...whereClause,
          isActive: true,
        },
        select: { id: true },
      });

      for (const user of users) {
        notificationsToCreate.push({
          userId: user.id,
          title: dto.title,
          message: dto.message,
        });
      }
    }

// Deduplicate by userId
    type NotifItem = { userId: string; title: string; message: string };
    const uniqueMap = new Map<string, NotifItem>();
    for (const n of notificationsToCreate) {
      uniqueMap.set(n.userId, n);
    }
    const unique = Array.from(uniqueMap.values());

    if (unique.length === 0) {
      return {
        message: 'No users found for the given target',
        count: 0,
      };
    }

    await this.prisma.notification.createMany({
      data: unique,
    });

    return {
      message: `Notification sent to ${unique.length} user(s)`,
      count: unique.length,
    };
  }

  // Internal helper — called by other services to send notifications
  async sendToUser(
    userId: string,
    title: string,
    message: string,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: { userId, title, message },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async getAllNotificationsAdmin() {
    const notifications = await this.prisma.notification.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      data: notifications,
      total: notifications.length,
    };
  }
}
```


### File: `sisp-backend/src/modules/students/dto/admin-create-student-profile.dto.ts`

```ts
import { IsUUID } from 'class-validator';
import { CreateStudentProfileDto } from './create-student-profile.dto';

export class AdminCreateStudentProfileDto extends CreateStudentProfileDto {
  @IsUUID()
  userId: string;
}

```


### File: `sisp-backend/src/modules/students/dto/create-student-profile.dto.ts`

```ts
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateStudentProfileDto {
  @IsString()
  @IsNotEmpty()
  studentNumber: string;

  @IsString()
  @IsNotEmpty()
  programCode: string;

  @IsInt()
  @Min(1)
  @Max(5)
  yearLevel: number;
}
```


### File: `sisp-backend/src/modules/students/dto/update-student.dto.ts`

```ts
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  programCode?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  yearLevel?: number;
}
```


### File: `sisp-backend/src/modules/students/students.controller.ts`

```ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { AdminCreateStudentProfileDto } from './dto/admin-create-student-profile.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // Student views their own profile
  @Get('me')
  @Roles('student')
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.studentsService.getMyProfile(user.sub);
  }

  // Admin creates a student profile for a user
  @Post('profile')
  @Roles('admin_staff', 'dean')
  async createProfile(
    @Body() dto: AdminCreateStudentProfileDto,
  ) {
    return this.studentsService.createProfile(dto.userId, dto);
  }

  // Admin lists all student profiles
  @Get()
  @Roles('admin_staff', 'dean', 'faculty')
  async listAll() {
    return this.studentsService.listAll();
  }

  // Admin views any student profile by profile ID
  @Get(':id')
  @Roles('admin_staff', 'dean', 'faculty')
  async getProfileById(@Param('id') id: string) {
    return this.studentsService.getProfileById(id);
  }

  // Admin updates a student profile
  @Patch(':id')
  @Roles('admin_staff', 'dean')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.updateProfile(id, dto);
  }
}
```


### File: `sisp-backend/src/modules/students/students.module.ts`

```ts
import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
```


### File: `sisp-backend/src/modules/students/students.service.ts`

```ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            role: {
              select: { name: true },
            },
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        enrollments: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
                units: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        accountBalance: {
          select: {
            balance: true,
            status: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Student profile not found. Please contact admin to set up your profile.',
      );
    }

    return profile;
  }

  async getProfileById(id: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            role: {
              select: { name: true },
            },
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        enrollments: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
                units: true,
              },
            },
            grade: {
              select: {
                finalGrade: true,
                isVisible: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        enrollmentHistory: {
          orderBy: { createdAt: 'desc' },
        },
        accountBalance: true,
        documentRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Student profile with ID ${id} not found`);
    }

    return profile;
  }

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        `Student profile for user ${userId} not found`,
      );
    }

    return profile;
  }

  async createProfile(userId: string, dto: CreateStudentProfileDto) {
    // Check if profile already exists
    const existing = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException(
        'Student profile already exists for this user',
      );
    }

    // Check if student number is already taken
    const existingNumber = await this.prisma.studentProfile.findUnique({
      where: { studentNumber: dto.studentNumber },
    });

    if (existingNumber) {
      throw new ConflictException(
        `Student number '${dto.studentNumber}' is already in use`,
      );
    }

    // Find the program by code
    const program = await this.prisma.program.findUnique({
      where: { code: dto.programCode },
    });

    if (!program) {
      throw new BadRequestException(
        `Program with code '${dto.programCode}' not found`,
      );
    }

    // Verify user exists and is a student
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role.name !== 'student') {
      throw new BadRequestException(
        'Student profiles can only be created for users with the student role',
      );
    }

    const profile = await this.prisma.studentProfile.create({
      data: {
        userId,
        studentNumber: dto.studentNumber,
        programId: program.id,
        yearLevel: dto.yearLevel,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return {
      message: 'Student profile created successfully',
      data: profile,
    };
  }

  async updateProfile(id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.studentProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Student profile with ID ${id} not found`);
    }

    const updateData: {
      programId?: string;
      yearLevel?: number;
    } = {};

    if (dto.programCode !== undefined) {
      const program = await this.prisma.program.findUnique({
        where: { code: dto.programCode },
      });

      if (!program) {
        throw new BadRequestException(
          `Program with code '${dto.programCode}' not found`,
        );
      }

      updateData.programId = program.id;
    }

    if (dto.yearLevel !== undefined) {
      updateData.yearLevel = dto.yearLevel;
    }

    const updated = await this.prisma.studentProfile.update({
      where: { id },
      data: updateData,
      include: {
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return {
      message: 'Student profile updated successfully',
      data: updated,
    };
  }

  async listAll() {
    const profiles = await this.prisma.studentProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: profiles,
      total: profiles.length,
    };
  }
}
```


### File: `sisp-backend/src/modules/users/dto/update-user.dto.ts`

```ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @IsIn(['student', 'faculty', 'admin_staff', 'dean'], {
    message: 'roleName must be one of: student, faculty, admin_staff, dean',
  })
  roleName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
```


### File: `sisp-backend/src/modules/users/users.controller.ts`

```ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
@Roles('admin_staff', 'dean')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listAll() {
    return this.usersService.listAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  async updateById(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateById(id, dto);
  }
}
```


### File: `sisp-backend/src/modules/users/users.module.ts`

```ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```


### File: `sisp-backend/src/modules/users/users.service.ts`

```ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: users,
      total: users.length,
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateById(id: string, dto: UpdateUserDto) {
    // Verify user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Build update data object
    const updateData: {
      roleId?: string;
      isActive?: boolean;
    } = {};

    // If roleName is provided, look up the role ID
    if (dto.roleName !== undefined) {
      const role = await this.prisma.role.findUnique({
        where: { name: dto.roleName },
      });

      if (!role) {
        throw new BadRequestException(
          `Role '${dto.roleName}' does not exist`,
        );
      }

      updateData.roleId = role.id;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      message: 'User updated successfully',
      data: updated,
    };
  }
}
```


### File: `sisp-backend/src/prisma/prisma.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```


### File: `sisp-backend/src/prisma/prisma.service.ts`

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  public isOffline = false;
  private mockDb: any = {};

  constructor() {
    super();
    this.initMockDb();

    // Proxy the entire service. If offline, return mock model handlers.
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (target.isOffline && typeof prop === 'string') {
          if (prop in target.mockDb) {
            return target.mockDb[prop];
          }
          // Handle special transactions or utilities
          if (prop === '$transaction') {
            return (arg: any) => {
              if (Array.isArray(arg)) {
                return Promise.all(arg);
              }
              return arg(receiver);
            };
          }
          if (
            prop === '$executeRaw' ||
            prop === '$executeRawUnsafe' ||
            prop === '$queryRaw' ||
            prop === '$queryRawUnsafe'
          ) {
            return () => Promise.resolve([]);
          }
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      console.log('[Prisma] Database connected successfully.');
    } catch (error) {
      const allowOffline = process.env.NODE_ENV !== 'production';
      if (!allowOffline) {
        console.error('[Prisma] FATAL: Could not connect to the database in production.', error);
        throw error;
      }
      this.isOffline = true;
      console.warn(
        '[Prisma] Warning: Could not connect to the database. Running in offline/detached mode (non-production only).',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.isOffline) {
      await this.$disconnect();
    }
  }

  private initMockDb() {
    const mockPasswordHash = bcrypt.hashSync('password123', 10);

    // Seed mock data stores
    const roles = [
      { id: 'role-id-admin_staff', name: 'admin_staff', createdAt: new Date() },
      { id: 'role-id-dean', name: 'dean', createdAt: new Date() },
      { id: 'role-id-faculty', name: 'faculty', createdAt: new Date() },
      { id: 'role-id-student', name: 'student', createdAt: new Date() },
    ];

    const users = [
      {
        id: 'mock-admin-id',
        email: 'admin@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Regis',
        lastName: 'Admin',
        roleId: 'role-id-admin_staff',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[0],
      },
      {
        id: 'mock-dean-id',
        email: 'dean@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Regis',
        lastName: 'Dean',
        roleId: 'role-id-dean',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[1],
      },
      {
        id: 'mock-faculty-id',
        email: 'faculty@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'Regis',
        lastName: 'Faculty',
        roleId: 'role-id-faculty',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[2],
      },
      {
        id: 'mock-student-id',
        email: 'student@rmc.edu.ph',
        passwordHash: mockPasswordHash,
        firstName: 'John',
        lastName: 'Doe',
        roleId: 'role-id-student',
        isActive: true,
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: roles[3],
      },
    ];

    const programs = [
      {
        id: 'mock-program-id',
        name: 'Bachelor of Science in Computer Science',
        code: 'BSCS',
        createdAt: new Date(),
      },
      {
        id: 'mock-program-id-it',
        name: 'Bachelor of Science in Information Technology',
        code: 'BSIT',
        createdAt: new Date(),
      },
    ];

    const courses = [
      {
        id: 'mock-course-cs301',
        code: 'CS 301',
        title: 'Human-Computer Interaction',
        units: 3,
        createdAt: new Date(),
      },
      {
        id: 'mock-course-cs302',
        code: 'CS 302',
        title: 'Data Science & Machine Learning',
        units: 3,
        createdAt: new Date(),
      },
      {
        id: 'mock-course-cs303',
        code: 'CS 303',
        title: 'Advanced Software Engineering',
        units: 4,
        createdAt: new Date(),
      },
      {
        id: 'mock-course-it201',
        code: 'IT 201',
        title: 'Database Systems',
        units: 3,
        createdAt: new Date(),
      },
    ];

    const studentProfiles = [
      {
        id: 'mock-student-profile-id',
        userId: 'mock-student-id',
        studentNumber: 'RMC-2026-0001',
        programId: 'mock-program-id',
        yearLevel: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: users[3],
        program: programs[0],
        accountBalance: {
          id: 'mock-balance-id',
          studentId: 'mock-student-profile-id',
          balance: 12500.5,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];

    const enrollments = [
      {
        id: 'mock-enrollment-cs301',
        studentId: 'mock-student-profile-id',
        courseId: 'mock-course-cs301',
        section: 'A',
        status: 'enrolled',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[0],
        student: studentProfiles[0],
      },
      {
        id: 'mock-enrollment-cs302',
        studentId: 'mock-student-profile-id',
        courseId: 'mock-course-cs302',
        section: 'A',
        status: 'enrolled',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[1],
        student: studentProfiles[0],
      },
      {
        id: 'mock-enrollment-cs303',
        studentId: 'mock-student-profile-id',
        courseId: 'mock-course-cs303',
        section: 'B',
        status: 'enrolled',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: courses[2],
        student: studentProfiles[0],
      },
    ];

    const grades = [
      {
        id: 'mock-grade-cs301',
        enrollmentId: 'mock-enrollment-cs301',
        prelim: 91.5,
        midterm: 93.0,
        finals: 94.0,
        finalGrade: 92.95,
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        enrollment: enrollments[0],
      },
      {
        id: 'mock-grade-cs302',
        enrollmentId: 'mock-enrollment-cs302',
        prelim: 88.0,
        midterm: 90.0,
        finals: 91.0,
        finalGrade: 89.8,
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        enrollment: enrollments[1],
      },
      {
        id: 'mock-grade-cs303',
        enrollmentId: 'mock-enrollment-cs303',
        prelim: 95.0,
        midterm: 96.0,
        finals: 97.0,
        finalGrade: 96.1,
        isVisible: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        enrollment: enrollments[2],
      },
    ];

    const documentRequests = [
      {
        id: 'mock-request-1',
        studentId: 'mock-student-profile-id',
        type: 'Certificate of Enrollment',
        status: 'Approved',
        remarks: 'Cleared by accounting',
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentProfiles[0],
      },
      {
        id: 'mock-request-2',
        studentId: 'mock-student-profile-id',
        type: 'Transcript of Records',
        status: 'Pending',
        remarks: 'Awaiting Dean approval',
        createdAt: new Date(),
        updatedAt: new Date(),
        student: studentProfiles[0],
      },
    ];

    const notifications = [
      {
        id: 'mock-notif-1',
        userId: 'mock-student-id',
        title: 'Welcome to SISP',
        message: 'Explore your premium academic glassmorphic portals!',
        isRead: false,
        createdAt: new Date(),
      },
      {
        id: 'mock-notif-2',
        userId: 'mock-student-id',
        title: 'Clearance Update',
        message: 'Second Semester 2025-2026 clearances are now active.',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000),
      },
    ];

    const chatLogs = [
      {
        id: 'mock-chat-1',
        userId: 'mock-student-id',
        message: 'What is my current balance?',
        response: 'Your outstanding balance is ₱12,500.50.',
        intent: 'financial',
        confidence: 0.98,
        createdAt: new Date(),
      },
    ];

    const escalations = [
      {
        id: 'mock-escalation-1',
        chatId: 'mock-chat-1',
        status: 'pending',
        assignedTo: null,
        resolution: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        chat: chatLogs[0],
      },
    ];

    const auditLogs = [
      {
        id: 'mock-audit-1',
        userId: 'mock-student-id',
        action: 'LOGIN',
        resource: 'auth',
        resourceId: 'mock-student-id',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        user: users[3],
      },
    ];

    const store: Record<string, any[]> = {
      role: roles,
      user: users,
      program: programs,
      course: courses,
      studentProfile: studentProfiles,
      enrollment: enrollments,
      grade: grades,
      documentRequest: documentRequests,
      notification: notifications,
      chatLog: chatLogs,
      escalationQueue: escalations,
      auditLog: auditLogs,
    };

    const dbFilePath = path.join(process.cwd(), 'mock-db.json');

    // Load existing mock DB from disk if it exists
    if (fs.existsSync(dbFilePath)) {
      try {
        const fileData = fs.readFileSync(dbFilePath, 'utf8');
        const parsed = JSON.parse(fileData);
        for (const key of Object.keys(store)) {
          if (parsed[key] && Array.isArray(parsed[key])) {
            store[key] = parsed[key];
          }
        }
        console.log('[Prisma Mock] Loaded database state from mock-db.json');
      } catch (err) {
        console.error('[Prisma Mock] Failed to read mock-db.json:', err);
      }
    }

    const saveDb = () => {
      try {
        fs.writeFileSync(dbFilePath, JSON.stringify(store, null, 2), 'utf8');
      } catch (err) {
        console.error('[Prisma Mock] Failed to write mock-db.json:', err);
      }
    };

    // Recursive mock relation populate helper
    const resolveIncludes = (item: any, include: any, modelKey: string): any => {
      if (!item || !include) return item;
      const cloned = { ...item };
      for (const [key, val] of Object.entries(include)) {
        if (!val) continue;
        const subInclude = typeof val === 'object' && val !== null ? (val as any).include : undefined;

        if (modelKey === 'escalationQueue') {
          if (key === 'chat') {
            const chatItem = store.chatLog.find((c) => c.id === cloned.chatId);
            if (chatItem) {
              cloned.chat = resolveIncludes(chatItem, subInclude || { user: true }, 'chatLog');
            }
          }
          if (key === 'assignee') {
            const userItem = store.user.find((u) => u.id === cloned.assignedTo);
            if (userItem) {
              cloned.assignee = resolveIncludes(userItem, subInclude, 'user');
            }
          }
        }
        if (modelKey === 'chatLog') {
          if (key === 'user') {
            const userItem = store.user.find((u) => u.id === cloned.userId);
            if (userItem) {
              cloned.user = resolveIncludes(userItem, subInclude, 'user');
            }
          }
          if (key === 'escalation') {
            const escItem = store.escalationQueue.find((e) => e.chatId === cloned.id);
            if (escItem) {
              cloned.escalation = resolveIncludes(escItem, subInclude, 'escalationQueue');
            }
          }
        }
        if (modelKey === 'user') {
          if (key === 'role') {
            const roleItem = store.role.find((r) => r.id === cloned.roleId);
            if (roleItem) {
              cloned.role = resolveIncludes(roleItem, subInclude, 'role');
            }
          }
        }
        if (modelKey === 'studentProfile') {
          if (key === 'user') {
            const userItem = store.user.find((u) => u.id === cloned.userId);
            if (userItem) {
              cloned.user = resolveIncludes(userItem, subInclude || { role: true }, 'user');
            }
          }
          if (key === 'program') {
            const progItem = store.program.find((p) => p.id === cloned.programId);
            if (progItem) {
              cloned.program = resolveIncludes(progItem, subInclude, 'program');
            }
          }
          if (key === 'accountBalance') {
            const balItem = cloned.accountBalance || store.studentProfile.find((sp) => sp.id === cloned.id)?.accountBalance;
            if (balItem) {
              cloned.accountBalance = resolveIncludes(balItem, subInclude, 'accountBalance');
            }
          }
        }
      }
      return cloned;
    };

    // Build mock model actions
    for (const modelKey of Object.keys(store)) {
      this.mockDb[modelKey] = {
        findUnique: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const found = list.find((item) => {
            return Object.entries(where).every(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                // Nested match
                return true;
              }
              return item[k] === v;
            });
          }) || null;
          return found ? resolveIncludes(found, args?.include, modelKey) : null;
        },
        findUniqueOrThrow: async (args: any) => {
          const res = await this.mockDb[modelKey].findUnique(args);
          if (!res) throw new Error(`${modelKey} not found`);
          return res;
        },
        findFirst: async (args: any) => {
          return this.mockDb[modelKey].findUnique(args);
        },
        findMany: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const filtered = list.filter((item) => {
            return Object.entries(where).every(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                // Nested where (e.g. { enrollment: { studentId: '...' } })
                const itemRelation = item[k];
                if (itemRelation) {
                  return Object.entries(v).every(
                    ([rk, rv]) => itemRelation[rk] === rv,
                  );
                }
                return true;
              }
              return item[k] === v;
            });
          });
          return filtered.map((item) => resolveIncludes(item, args?.include, modelKey));
        },
        create: async (args: any) => {
          const list = store[modelKey];
          const newId = `mock-${modelKey}-${Math.random().toString(36).substr(2, 9)}`;
          const newItem = {
            id: newId,
            ...(modelKey === 'user' ? { isActive: true, mustChangePassword: true } : {}),
            ...args.data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Attach relations if needed
          if (modelKey === 'user' && args.data.roleId) {
            newItem.role = roles.find((r) => r.id === args.data.roleId);
          }
          if (modelKey === 'studentProfile') {
            newItem.user = users.find((u) => u.id === args.data.userId);
            newItem.program =
              programs.find((p) => p.id === args.data.programId) || programs[0];
            newItem.accountBalance = {
              id: `mock-balance-${newItem.id}`,
              studentId: newItem.id,
              balance: 10000.0,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          if (modelKey === 'enrollment') {
            newItem.course =
              courses.find((c) => c.id === args.data.courseId) || courses[0];
            newItem.student =
              studentProfiles.find((sp) => sp.id === args.data.studentId) ||
              studentProfiles[0];
          }

          list.push(newItem);
          saveDb();
          return resolveIncludes(newItem, args?.include, modelKey);
        },
        update: async (args: any) => {
          const item = await this.mockDb[modelKey].findUnique({
            where: args.where,
          });
          if (!item) throw new Error(`${modelKey} not found to update`);
          Object.assign(item, args.data);
          item.updatedAt = new Date();
          saveDb();
          return resolveIncludes(item, args?.include, modelKey);
        },
        updateMany: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          const data = args?.data || {};
          let count = 0;
          for (const item of list) {
            const matches = Object.entries(where).every(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                return true;
              }
              return item[k] === v;
            });
            if (matches) {
              Object.assign(item, data);
              item.updatedAt = new Date();
              count++;
            }
          }
          saveDb();
          return { count };
        },
        createMany: async (args: any) => {
          const list = store[modelKey];
          const itemsData = args?.data || [];
          let count = 0;
          for (const dataItem of itemsData) {
            const newId = `mock-${modelKey}-${Math.random().toString(36).substr(2, 9)}`;
            const newItem = {
              id: newId,
              ...dataItem,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            list.push(newItem);
            count++;
          }
          saveDb();
          return { count };
        },
        delete: async (args: any) => {
          const idx = store[modelKey].findIndex((item) => {
            return Object.entries(args.where).every(([k, v]) => item[k] === v);
          });
          if (idx === -1) throw new Error(`${modelKey} not found to delete`);
          const [removed] = store[modelKey].splice(idx, 1);
          saveDb();
          return removed;
        },
        deleteMany: async (args: any) => {
          const list = store[modelKey];
          const where = args?.where || {};
          let count = 0;
          for (let i = list.length - 1; i >= 0; i--) {
            const item = list[i];
            const matches = Object.entries(where).every(([k, v]) => {
              if (typeof v === 'object' && v !== null) {
                if ('in' in v && Array.isArray((v as any).in)) {
                  return (v as any).in.includes(item[k]);
                }
                return true;
              }
              return item[k] === v;
            });
            if (matches) {
              list.splice(i, 1);
              count++;
            }
          }
          saveDb();
          return { count };
        },
        count: async (args: any) => {
          const list = await this.mockDb[modelKey].findMany(args);
          return list.length;
        },
        aggregate: async () => {
          return { _sum: { units: 10 }, _avg: { finalGrade: 92.5 } };
        },
        groupBy: async () => {
          return [];
        },
      };
    }
  }
}
```


### File: `sisp-ml/app/__init__.py`

```py

```


### File: `sisp-ml/app/config.py`

```py
from pydantic_settings import BaseSettings
from functools import lru_cache


import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(base_dir, ".env")

class Settings(BaseSettings):
    # Application
    app_name: str = "SISP ML Service — ARIA"
    app_version: str = "1.0.0"
    port: int = 8000
    debug: bool = False

    # Database
    database_url: str = ""

    # Groq API
    groq_api_key: str = ""

    # ML Config
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dimension: int = 384
    confidence_threshold: float = 0.7

    # ML Admin Secret
    ml_secret_token: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""

    class Config:
        env_file = env_path
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
```


### File: `sisp-ml/app/database.py`

```py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Check if database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
```


### File: `sisp-ml/app/main.py`

```py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.database import check_db_connection
from app.routers import chat, classify, retrieve, feedback, admin

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"[STARTING] {settings.app_name} v{settings.app_version} starting...")
    print(f"   Embedding model: {settings.embedding_model}")
    print(f"   Confidence threshold: {settings.confidence_threshold}")

    db_ok = check_db_connection()
    if db_ok:
        print("   [OK] Database connection: OK")
    else:
        print("   [WARNING] Database connection: FAILED (will retry on requests)")

    yield

    # Shutdown
    print("[SHUTDOWN] ARIA ML Service shutting down...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Hybrid NLP and Semantic-Based Academic Advisory Chat System",
    lifespan=lifespan,
)

# CORS — allow NestJS backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3001",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(chat.router)
app.include_router(classify.router)
app.include_router(retrieve.router)
app.include_router(feedback.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.get("/health")
async def health():
    db_ok = check_db_connection()
    return {
        "status": "ok",
        "service": "sisp-ml",
        "version": settings.app_version,
        "database": "connected" if db_ok else "disconnected",
        "embedding_model": settings.embedding_model,
        "embedding_dimension": settings.embedding_dimension,
    }
```


### File: `sisp-ml/app/ml/__init__.py`

```py

```


### File: `sisp-ml/app/ml/embed_documents.py`

```py
import sys
import os
import uuid
import joblib
from sqlalchemy import text

# Add parent directory to path so app module can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sentence_transformers import SentenceTransformer
from app.config import get_settings
from app.database import engine, check_db_connection

settings = get_settings()

def chunk_text(file_path: str) -> list:
    """Read a file and chunk it by double newlines (paragraphs)."""
    if not os.path.exists(file_path):
        print(f"[WARNING] File not found: {file_path}")
        return []
    
    with open(file_path, "r", encoding="utf-8") as f:
        text_content = f.read()
    
    # Split by double newline to get logical paragraphs/sections
    raw_paragraphs = text_content.split("\n\n")
    chunks = []
    
    # Clean and filter paragraphs
    title = ""
    for idx, para in enumerate(raw_paragraphs):
        para = para.strip()
        if not para:
            continue
        
        # Track first line as header if it looks like one
        if idx == 0 and ("REGIS MARIE" in para or "POLICY" in para):
            title = para
            continue
        
        # Prepend the title for richer chunk context if helpful
        content = f"{title}\n{para}" if title else para
        chunks.append(content)
        
    return chunks

def embed_and_index():
    print("[INDEXING] Starting institutional knowledge base embedding process...")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kb_dir = os.path.join(base_dir, "data", "knowledge_base")
    
    policy_files = {
        "document_requests.txt": "document_request",
        "enrollment_policy.txt": "enrollment_policy",
        "grading_policy.txt": "grading_policy"
    }
    
    all_chunks = []
    for file_name, category in policy_files.items():
        file_path = os.path.join(kb_dir, file_name)
        chunks = chunk_text(file_path)
        print(f"  Parsed {len(chunks)} chunks from {file_name}")
        for chunk in chunks:
            all_chunks.append({
                "content": chunk,
                "source": file_name,
                "category": category
            })
            
    if not all_chunks:
        print("[ERROR] No chunks found. Indexing aborted.")
        return
    
    # Initialize SentenceTransformer model
    print(f"[MODEL] Loading embedding model: {settings.embedding_model}...")
    model = SentenceTransformer(settings.embedding_model)
    
    # Compute embeddings
    print(f"[MODEL] Generating embeddings for {len(all_chunks)} chunks...")
    contents = [c["content"] for c in all_chunks]
    embeddings = model.encode(contents, show_progress_bar=False)
    
    # Attach embeddings to chunks
    for i, chunk in enumerate(all_chunks):
        chunk["embedding"] = embeddings[i]
        
    # Attempt DB Insert
    db_connected = check_db_connection()
    db_success = False
    
    if db_connected:
        print("[DATABASE] DB Connection verified. Inserting embeddings...")
        try:
            # We will use raw connection/SQL execution to insert the pgvector records
            with engine.connect() as conn:
                # Clear existing embeddings to prevent duplicates
                conn.execute(text('TRUNCATE TABLE "VectorEmbeddings";'))
                
                # Insert chunks one by one
                insert_query = text("""
                INSERT INTO "VectorEmbeddings" (id, content, embedding, source, category)
                VALUES (:id, :content, :embedding, :source, :category);
                """)
                
                for chunk in all_chunks:
                    # Convert numpy array to list for pgvector compatibility
                    emb_list = chunk["embedding"].tolist()
                    conn.execute(insert_query, {
                        "id": str(uuid.uuid4()),
                        "content": chunk["content"],
                        "embedding": emb_list,
                        "source": chunk["source"],
                        "category": chunk["category"]
                    })
                
                conn.commit()
                print("[DATABASE] Successfully inserted all embeddings to PostgreSQL VectorEmbeddings table!")
                db_success = True
        except Exception as e:
            print(f"[DATABASE] [WARNING] Failed to insert into DB table: {e}")
            print("[DATABASE] Will rely on local vector index file backup.")
    else:
        print("[DATABASE] [WARNING] DB connection failed or paused. Skipping PostgreSQL insert.")
        
    # Serialize to local file index as backup/local-simulation mode source
    local_index_path = os.path.join(base_dir, "data", "local_vector_index.pkl")
    print(f"[LOCAL] Saving index to local file: {local_index_path}...")
    try:
        # Create data structure without numpy object arrays if we want it super clean,
        # but joblib handles numpy arrays perfectly.
        local_data = []
        for c in all_chunks:
            local_data.append({
                "content": c["content"],
                "source": c["source"],
                "category": c["category"],
                "embedding": c["embedding"]  # numpy float32 array
            })
            
        joblib.dump(local_data, local_index_path)
        print("[LOCAL] Successfully created local vector index file!")
    except Exception as e:
        print(f"[LOCAL] [ERROR] Failed to save local vector index file: {e}")
        
    print(f"[SUMMARY] Indexing completed. DB Online: {db_success}, Local Index Saved: True")

if __name__ == "__main__":
    embed_and_index()

```


### File: `sisp-ml/app/ml/init_db.py`

```py
import sys
import os

# Add parent directory to path so app module can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy import text
from app.database import engine

def init_vector_db():
    print("Connecting to database to initialize pgvector and VectorEmbeddings table...")
    try:
        with engine.connect() as conn:
            # Enable pgvector extension
            print("Enabling pgvector extension if not exists...")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            
            # Create VectorEmbeddings table
            print("Creating VectorEmbeddings table if not exists...")
            create_table_query = """
            CREATE TABLE IF NOT EXISTS "VectorEmbeddings" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                content TEXT NOT NULL,
                embedding vector(384) NOT NULL,
                source VARCHAR(255),
                category VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            """
            conn.execute(text(create_table_query))
            conn.commit()
            print("Database successfully initialized!")
            return True
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        return False

if __name__ == "__main__":
    init_vector_db()

```


### File: `sisp-ml/app/ml/models/__init__.py`

```py

```


### File: `sisp-ml/app/ml/retrain.py`

```py
import os
import json
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from datetime import datetime

def retrain_model() -> str:
    """
    Retrains the intent classifier model.
    It reads the base training data, trains a new classifier pipeline, 
    and saves it to the next logical version (e.g. intent_classifier_v2.pkl).
    """
    print("Initiating classifier model retraining...")
    
    # Paths setup
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "data", "training_data.json")
    models_dir = os.path.join(base_dir, "ml", "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # 1. Determine the next version suffix
    pkl_files = [f for f in os.listdir(models_dir) if f.endswith(".pkl")]
    next_ver = 2
    if pkl_files:
        pkl_files.sort()
        latest_file = pkl_files[-1]
        try:
            # Parse 'intent_classifier_v1.pkl' -> version number
            version_part = latest_file.split("_v")[-1].split(".pkl")[0]
            next_ver = int(version_part) + 1
        except Exception:
            next_ver = len(pkl_files) + 1
            
    version_str = f"v{next_ver}"
    model_filename = f"intent_classifier_{version_str}.pkl"
    model_path = os.path.join(models_dir, model_filename)

    # 2. Load training inputs
    if not os.path.exists(data_path):
        print(f"Error: Training source not found at: {data_path}")
        raise FileNotFoundError(f"Training data not found at {data_path}")

    with open(data_path, "r", encoding="utf-8") as f:
        training_samples = json.load(f)
        
    texts = [item["text"] for item in training_samples]
    labels = [item["intent"] for item in training_samples]
    
    print(f"Loaded {len(texts)} training samples for retraining model version {version_str}.")

    # 3. Train Pipeline (LogisticRegression matching train_classifier.py setup)
    pipeline = Pipeline([
        ('vectorizer', TfidfVectorizer(ngram_range=(1, 2), stop_words='english', min_df=1)),
        ('classifier', LogisticRegression(C=10.0, class_weight='balanced', max_iter=1000))
    ])
    
    pipeline.fit(texts, labels)
    
    # Evaluate self-accuracy
    train_accuracy = pipeline.score(texts, labels)
    print(f"Retrained version {version_str} successfully. Self-accuracy: {train_accuracy * 100:.2f}%")

    # 4. Serialize model and metadata block
    metadata = {
        "model": pipeline,
        "version": version_str,
        "accuracy": train_accuracy,
        "trained_at": datetime.utcnow().isoformat()
    }
    
    joblib.dump(metadata, model_path)
    print(f"Retrained model pickled successfully: {model_path}")
    
    return version_str

if __name__ == "__main__":
    retrain_model()

```


### File: `sisp-ml/app/ml/train_classifier.py`

```py
import os
import json
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from datetime import datetime

def train_classifier():
    print("Starting intent classifier training...")
    
    # Define file paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_path = os.path.join(base_dir, "data", "training_data.json")
    model_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "intent_classifier_v1.pkl")

    # 1. Load training data
    if not os.path.exists(data_path):
        print(f"Error: Training data file not found at {data_path}")
        return False
        
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    texts = [item["text"] for item in data]
    labels = [item["intent"] for item in data]
    
    print(f"Loaded {len(texts)} training samples.")
    
    # 2. Build Pipeline
    pipeline = Pipeline([
        ('vectorizer', TfidfVectorizer(ngram_range=(1, 2), stop_words='english', min_df=1)),
        ('classifier', LogisticRegression(C=10.0, class_weight='balanced', max_iter=1000))
    ])
    
    # 3. Fit Pipeline
    pipeline.fit(texts, labels)
    
    # Evaluate self-accuracy
    train_accuracy = pipeline.score(texts, labels)
    print(f"Model training complete. Training Accuracy: {train_accuracy * 100:.2f}%")
    
    # 4. Save model + metadata
    metadata = {
        "model": pipeline,
        "version": "v1",
        "accuracy": train_accuracy,
        "trained_at": datetime.utcnow().isoformat()
    }
    
    joblib.dump(metadata, model_path)
    print(f"Serialized model saved successfully to: {model_path}")
    return True

if __name__ == "__main__":
    train_classifier()

```


### File: `sisp-ml/app/models/__init__.py`

```py

```


### File: `sisp-ml/app/routers/__init__.py`

```py

```


### File: `sisp-ml/app/routers/admin.py`

```py
from fastapi import APIRouter, Header, HTTPException, BackgroundTasks, status
from app.ml.retrain import retrain_model
from app.services.classifier_service import classifier_service
from app.config import get_settings

router = APIRouter(prefix="/admin", tags=["admin"])

settings = get_settings()

def run_retraining_task():
    try:
        print("[BG_TASK] Starting background retraining loop...")
        new_version = retrain_model()
        print(f"[BG_TASK] Model retrained to version: {new_version}")
        
        # Hot-reload the classifier service dynamically!
        reloaded = classifier_service.load_model()
        if reloaded:
            print(f"[BG_TASK] Successfully hot-swapped classifier to version: {new_version}")
        else:
            print("[BG_TASK] Failed to reload classifier after retraining.")
    except Exception as e:
        print(f"[BG_TASK] Retraining task failed: {e}")

@router.get("/health")
async def admin_health():
    return {
        "status": "ok",
        "router": "admin",
        "classifier_loaded": classifier_service.is_ready(),
        "classifier_version": classifier_service.metadata.get("version", "unknown") if classifier_service.is_ready() else "N/A"
    }

@router.post("/retrain", status_code=status.HTTP_202_ACCEPTED)
async def trigger_retrain(background_tasks: BackgroundTasks, x_ml_secret: str = Header(None)):
    """
    Triggers asynchronous retraining of the intent classifier model.
    Must be authenticated with 'X-ML-Secret' header matching ML_SECRET_TOKEN.
    """
    if x_ml_secret != settings.ml_secret_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ML Secret Header token."
        )
    
    background_tasks.add_task(run_retraining_task)
    return {
        "status": "accepted",
        "message": "Retraining task scheduled successfully in background."
    }
```


### File: `sisp-ml/app/routers/chat.py`

```py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.chat_service import chat_service

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str

class ChatRequest(BaseModel):
    query: str
    history: Optional[List[ChatMessage]] = None

class SourceCitation(BaseModel):
    source: str
    category: str
    similarity: float
    content_snippet: str

class ChatResponse(BaseModel):
    response: str
    intent: str
    confidence: float
    escalate: bool
    sources: List[SourceCitation]

@router.get("/health")
async def chat_health():
    return {"status": "ok", "router": "chat"}

@router.post("", response_model=ChatResponse)
async def chat_query(payload: ChatRequest):
    try:
        # Convert Pydantic ChatMessage list to dictionaries
        history_dicts = []
        if payload.history:
            for msg in payload.history:
                history_dicts.append({
                    "role": msg.role,
                    "content": msg.content
                })
                
        result = chat_service.process_query(
            query=payload.query,
            conversation_history=history_dicts
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```


### File: `sisp-ml/app/routers/classify.py`

```py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.classifier_service import classifier_service

router = APIRouter(prefix="/classify", tags=["classify"])

class ClassifyRequest(BaseModel):
    query: str

class ClassifyResponse(BaseModel):
    intent: str
    confidence: float
    escalate: bool

@router.get("/health")
async def classify_health():
    return {"status": "ok", "router": "classify", "model_ready": classifier_service.is_ready()}

@router.post("", response_model=ClassifyResponse)
async def classify_query(payload: ClassifyRequest):
    if not classifier_service.is_ready():
        # Try reloading the model
        success = classifier_service.load_model()
        if not success:
            raise HTTPException(status_code=503, detail="Intent classifier model is not ready.")
            
    try:
        result = classifier_service.classify(payload.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```


### File: `sisp-ml/app/routers/feedback.py`

```py
from fastapi import APIRouter

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("/health")
async def feedback_health():
    return {"status": "ok", "router": "feedback"}
```


### File: `sisp-ml/app/routers/retrieve.py`

```py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.retrieval_service import retrieval_service

router = APIRouter(prefix="/retrieve", tags=["retrieve"])

class RetrieveRequest(BaseModel):
    query: str
    limit: Optional[int] = 3
    category: Optional[str] = None

class ChunkResponse(BaseModel):
    content: str
    source: str
    category: str
    similarity: float

@router.get("/health")
async def retrieve_health():
    return {"status": "ok", "router": "retrieve", "model_ready": retrieval_service.is_ready()}

@router.post("", response_model=List[ChunkResponse])
async def retrieve_chunks(payload: RetrieveRequest):
    if not retrieval_service.is_ready():
        raise HTTPException(status_code=503, detail="Retrieval service (embedding model) is not ready.")
        
    try:
        results = retrieval_service.retrieve(
            query=payload.query,
            limit=payload.limit or 3,
            category=payload.category
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```


### File: `sisp-ml/app/services/__init__.py`

```py

```


### File: `sisp-ml/app/services/cache_service.py`

```py
import hashlib
import os
from typing import Optional

class CacheService:
    def __init__(self):
        self.redis_client = None
        self.local_cache = {}
        self.is_redis_active = False

        # Attempt to dynamically import and connect to Upstash Redis
        try:
            import redis
            # Check for REDIS_URL in environment variables
            redis_url = os.getenv("REDIS_URL") or os.getenv("UPSTASH_REDIS_URL")
            if redis_url:
                print(f"[CACHE] Attempting connection to Redis URL...")
                self.redis_client = redis.Redis.from_url(redis_url, socket_timeout=2.0)
                # Test connection (ping)
                self.redis_client.ping()
                self.is_redis_active = True
                print("[CACHE] [OK] Redis prompt caching service active.")
            else:
                print("[CACHE] No Redis URL configured. Falling back to local in-memory dict cache.")
        except ImportError:
            print("[CACHE] redis module not installed. Falling back to local in-memory dict cache.")
        except Exception as e:
            print(f"[CACHE] Redis connection failed: {e}. Gracefully falling back to local in-memory dict cache.")
            self.is_redis_active = False

    def get(self, key: str) -> Optional[str]:
        """Fetch prompt response from Redis or local in-memory cache."""
        if self.is_redis_active and self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val:
                    return val.decode("utf-8")
            except Exception as e:
                print(f"[CACHE] Redis read error: {e}")
        
        # Local fallback
        return self.local_cache.get(key)

    def set(self, key: str, value: str, ttl_seconds: int = 3600) -> None:
        """Cache prompt response in Redis with TTL or in local dict cache."""
        if self.is_redis_active and self.redis_client:
            try:
                self.redis_client.setex(key, ttl_seconds, value)
                return
            except Exception as e:
                print(f"[CACHE] Redis write error: {e}")
        
        # Local fallback
        self.local_cache[key] = value

    def make_key(self, text: str) -> str:
        """Hash combined prompt sequences using MD5."""
        return hashlib.md5(text.encode("utf-8")).hexdigest()

cache_service = CacheService()
```


### File: `sisp-ml/app/services/chat_service.py`

```py
import os
from app.services.classifier_service import classifier_service
from app.services.retrieval_service import retrieval_service
from app.services.groq_service import groq_service

class ChatService:
    def __init__(self):
        pass

    def process_query(self, query: str, conversation_history: list = None) -> dict:
        """Orchestrate the hybrid RAG chat pipeline: Classify -> Retrieve -> Generate."""
        print(f"[CHAT] Processing incoming student query: '{query[:50]}...'")
        
        # 1. Classify Query Intent
        intent_res = classifier_service.classify(query)
        intent = intent_res.get("intent", "general_inquiry")
        confidence = intent_res.get("confidence", 0.0)
        escalate = intent_res.get("escalate", False)
        
        print(f"[CHAT] Intent: {intent} (confidence: {confidence:.2f}, escalate: {escalate})")

        # 2. Retrieve Relevant Context
        # Search first using the matched category, then fallback to general search if no matches
        context_chunks = []
        if not escalate:
            context_chunks = retrieval_service.retrieve(query, limit=3, category=intent)
            
        # Fallback to unrestricted semantic search if category-specific returned nothing or query is general
        if not context_chunks:
            context_chunks = retrieval_service.retrieve(query, limit=3)
            
        print(f"[CHAT] Retrieved {len(context_chunks)} matching knowledge base chunks.")

        # 3. Generate grounded RAG response
        system_message = (
            "You are ARIA (Academic Resource & Information Assistant), a helpful, supportive, "
            "and professional academic advisor at Regis Marie College.\n"
            "Your goal is to answer student questions clearly, concisely, and accurately based ONLY "
            "on the verified institutional policies provided in the context.\n"
            "If the information is not present in the context, politely explain that you don't know "
            "and offer to escalate the inquiry to a human advisor.\n"
            "Format your responses using Markdown headers, lists, and bold text for maximum readability."
        )
        
        response_text = groq_service.generate_completion(
            prompt=query,
            system_message=system_message,
            context_chunks=context_chunks,
            conversation_history=conversation_history
        )

        # 4. Formulate visual sources list for UI citations
        sources = []
        for chunk in context_chunks:
            sources.append({
                "source": chunk.get("source"),
                "category": chunk.get("category"),
                "similarity": chunk.get("similarity"),
                "content_snippet": chunk.get("content")[:100] + "..." if len(chunk.get("content", "")) > 100 else chunk.get("content")
            })

        # Final assembled result
        result = {
            "response": response_text,
            "intent": intent,
            "confidence": confidence,
            "escalate": escalate,
            "sources": sources
        }
        
        print("[CHAT] Query processed successfully!")
        return result

chat_service = ChatService()
```


### File: `sisp-ml/app/services/classifier_service.py`

```py
import os
import joblib
from app.config import get_settings

settings = get_settings()

class ClassifierService:
    def __init__(self):
        self.model = None
        self.metadata = None
        self.is_loaded = False
        self.load_model()

    def load_model(self) -> bool:
        """Find and load the latest serialized intent classifier pipeline."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            models_dir = os.path.join(base_dir, "ml", "models")
            
            if not os.path.exists(models_dir):
                print(f"Models directory not found at: {models_dir}")
                return False

            # List and sort all pkl files to auto-select the latest version
            pkl_files = [f for f in os.listdir(models_dir) if f.endswith(".pkl")]
            if not pkl_files:
                print("No classifier model (.pkl) files found.")
                return False

            # Sort files (e.g. intent_classifier_v1.pkl) to get the latest one
            pkl_files.sort()
            latest_model_name = pkl_files[-1]
            model_path = os.path.join(models_dir, latest_model_name)

            print(f"Loading intent classifier: {model_path}")
            metadata = joblib.load(model_path)
            
            # The pickled object is a dict with keys: 'model', 'version', 'accuracy', etc.
            self.model = metadata["model"]
            self.metadata = metadata
            self.is_loaded = True
            print(f"Successfully loaded model version: {metadata.get('version', 'unknown')}")
            return True
        except Exception as e:
            print(f"Error loading classifier model: {e}")
            self.model = None
            self.is_loaded = False
            return False

    def is_ready(self) -> bool:
        return self.is_loaded

    def classify(self, text: str) -> dict:
        """Classify user query intent and determine if it should be escalated."""
        if not self.is_loaded:
            print("Classifier not loaded. Attempting to reload...")
            loaded = self.load_model()
            if not loaded:
                return {
                    "intent": "general_inquiry",
                    "confidence": 0.0,
                    "escalate": True
                }

        try:
            # Get class probabilities
            probs = self.model.predict_proba([text])[0]
            classes = self.model.classes_
            
            # Find index of max probability
            max_idx = probs.argmax()
            predicted_intent = classes[max_idx]
            confidence = float(probs[max_idx])
            
            # We escalate if the confidence falls below the configured threshold
            escalate = confidence < settings.confidence_threshold
            
            return {
                "intent": predicted_intent,
                "confidence": confidence,
                "escalate": escalate
            }
        except Exception as e:
            print(f"Error during intent classification: {e}")
            return {
                "intent": "general_inquiry",
                "confidence": 0.0,
                "escalate": True
            }

classifier_service = ClassifierService()
```


### File: `sisp-ml/app/services/groq_service.py`

```py
import os
from app.config import get_settings
from app.services.cache_service import cache_service
import json

settings = get_settings()

class GroqService:
    def __init__(self):
        self.client = None
        self.is_configured = False
        self.init_client()

    def init_client(self):
        """Initialize the Groq client if a valid API key is present."""
        api_key = settings.groq_api_key
        
        # Check if the key is empty, default placeholder, or not set
        if not api_key or api_key == "replace-this-in-section-3.9" or "replace" in api_key.lower():
            print("[GROQ] No valid GROQ_API_KEY detected. Activating Simulation/Local Mock Mode.")
            self.client = None
            self.is_configured = False
        else:
            try:
                from groq import Groq
                print("[GROQ] Valid API key detected. Initializing Groq client...")
                self.client = Groq(api_key=api_key)
                self.is_configured = True
                print("[GROQ] Groq client successfully initialized!")
            except Exception as e:
                print(f"[GROQ] [ERROR] Failed to initialize Groq client: {e}. Falling back to Simulation Mode.")
                self.client = None
                self.is_configured = False

    def is_ready(self) -> bool:
        return self.is_configured

    def generate_completion(
        self,
        prompt: str,
        system_message: str = None,
        context_chunks: list = None,
        conversation_history: list = None
    ) -> str:
        """Generate response via Groq API or fallback Simulation Mode based on RAG context."""
        
        # Build prompt cache key
        cache_key_data = {
            "prompt": prompt,
            "system_message": system_message,
            "chunks": [c["content"] for c in context_chunks] if context_chunks else [],
            "history": conversation_history
        }
        cache_key_str = json.dumps(cache_key_data, sort_keys=True)
        cache_key = cache_service.make_key(cache_key_str)

        # Check Cache
        cached_response = cache_service.get(cache_key)
        if cached_response:
            print(f"[GROQ] [CACHE_HIT] Retained response for cache key: {cache_key}")
            return cached_response

        # Cache Miss - Generate Completion
        response_text = self._generate_completion_raw(prompt, system_message, context_chunks, conversation_history)
        
        # Store in Cache
        try:
            cache_service.set(cache_key, response_text, ttl_seconds=3600)
            print(f"[GROQ] [CACHE_SET] Cached response for key: {cache_key}")
        except Exception as e:
            print(f"[GROQ] Failed to write cache: {e}")

        return response_text

    def _generate_completion_raw(
        self,
        prompt: str,
        system_message: str = None,
        context_chunks: list = None,
        conversation_history: list = None
    ) -> str:
        """Internal raw generation method."""
        # 1. API Mode
        if self.is_configured and self.client is not None:
            try:
                print("[GROQ] Calling Groq API with llama3-8b-8192...")
                messages = []
                
                # Add system prompt
                sys_prompt = system_message or "You are ARIA, the Academic Advisory Assistant for Regis Marie College."
                if context_chunks:
                    context_text = "\n\n".join([f"Source: {c['source']}\n{c['content']}" for c in context_chunks])
                    sys_prompt += f"\n\nUse the following verified institutional knowledge to answer the student's query:\n{context_text}"
                
                messages.append({"role": "system", "content": sys_prompt})
                
                # Add conversation history
                if conversation_history:
                    for msg in conversation_history:
                        messages.append({"role": msg.get("role"), "content": msg.get("content")})
                
                # Add user query
                messages.append({"role": "user", "content": prompt})
                
                completion = self.client.chat.completions.create(
                    model="llama3-8b-8192",
                    messages=messages,
                    temperature=0.2,
                    max_tokens=1024,
                    top_p=0.9,
                )
                return completion.choices[0].message.content
            except Exception as e:
                print(f"[GROQ] [WARNING] API call failed: {e}. Falling back to Simulation Mode.")
                # Fall through to Simulation Mode
        
        # 2. Simulation / Local Mock Mode Fallback
        print("[GROQ] Generating simulated advising response based on retrieved context...")
        
        # If we have retrieved context chunks, let's craft a beautiful answer!
        if context_chunks:
            # We construct a highly polished answer matching the content of the chunks
            response = "### Hello! I am ARIA, your Academic Advisory Assistant. \n\n"
            response += "Based on the official policies of **Regis Marie College**, here is the information regarding your inquiry:\n\n"
            
            for idx, chunk in enumerate(context_chunks):
                content = chunk["content"]
                # Extract text after header if present
                if "\n" in content:
                    lines = content.split("\n")
                    section_title = lines[0]
                    section_body = "\n".join(lines[1:])
                    
                    # Highlight section title
                    response += f"**From {chunk['source']} ({section_title}):**\n"
                    # Add paragraph indentation or bullets
                    for line in section_body.split("\n"):
                        if line.strip().startswith("-") or line.strip().startswith("*") or (line.strip() and line.strip()[0].isdigit()):
                            response += f"{line}\n"
                        elif line.strip():
                            response += f"> {line}\n"
                    response += "\n"
                else:
                    response += f"**Policy Reference ({chunk['source']}):**\n> {content}\n\n"
            
            response += "*(Note: This information is retrieved directly from our verified student handbook policies. If you have further unique constraints or require direct help, you can request to escalate this chat to a human adviser!)*"
            return response
            
        # If no chunks are retrieved, give a generic polite response
        return (
            "### Hello! I am ARIA, your Academic Advisory Assistant.\n\n"
            "I couldn't find a specific student handbook policy matching your exact inquiry in my database.\n\n"
            "To make sure you get the most accurate assistance, I will gladly **escalate this conversation to a human academic advisor**. "
            "A registrar staff member or academic Dean will review your query and respond directly in your SISP portal shortly.\n\n"
            "In the meantime, feel free to ask me other questions about **enrollment, grading, or document requests**, or specify your details!"
        )

groq_service = GroqService()
```


### File: `sisp-ml/app/services/retrieval_service.py`

```py
import os
import joblib
import numpy as np
from sqlalchemy import text
from sentence_transformers import SentenceTransformer
from app.config import get_settings
from app.database import engine, check_db_connection

settings = get_settings()

class RetrievalService:
    def __init__(self):
        self.model = None
        self.local_index = []
        self.is_loaded = False
        self.load_model()
        self.load_local_index()

    def load_model(self):
        """Load the sentence-transformers embedding model."""
        try:
            print(f"[RETRIEVAL] Loading embedding model: {settings.embedding_model}...")
            self.model = SentenceTransformer(settings.embedding_model)
            print("[RETRIEVAL] Embedding model loaded successfully!")
        except Exception as e:
            print(f"[RETRIEVAL] [ERROR] Failed to load embedding model: {e}")

    def load_local_index(self):
        """Load the local vector index pickle file as a fallback."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            index_path = os.path.join(base_dir, "data", "local_vector_index.pkl")
            
            if os.path.exists(index_path):
                print(f"[RETRIEVAL] Loading local vector index from: {index_path}")
                self.local_index = joblib.load(index_path)
                self.is_loaded = True
                print(f"[RETRIEVAL] Loaded {len(self.local_index)} document chunks into local index.")
            else:
                print(f"[RETRIEVAL] [WARNING] Local vector index not found at: {index_path}")
                self.local_index = []
                self.is_loaded = False
        except Exception as e:
            print(f"[RETRIEVAL] [ERROR] Failed to load local vector index: {e}")
            self.local_index = []
            self.is_loaded = False

    def is_ready(self) -> bool:
        return self.model is not None and (self.is_loaded or check_db_connection())

    def retrieve(self, query: str, limit: int = 3, category: str = None) -> list:
        """Retrieve top matching document chunks using pgvector or in-memory fallback."""
        if self.model is None:
            print("[RETRIEVAL] [ERROR] Embedding model is not loaded. Cannot retrieve.")
            return []

        # 1. Compute query embedding
        try:
            query_vector = self.model.encode(query, show_progress_bar=False)
        except Exception as e:
            print(f"[RETRIEVAL] [ERROR] Failed to encode query: {e}")
            return []

        # 2. Attempt PostgreSQL retrieval if database is connected
        db_connected = check_db_connection()
        if db_connected:
            try:
                print(f"[RETRIEVAL] Running pgvector semantic search in PostgreSQL (limit={limit}, category={category})...")
                # Convert numpy array to list
                vector_list = query_vector.tolist()
                
                # Formulate search query with optional category filtering
                query_str = """
                SELECT content, source, category, (1 - (embedding <=> :query_vector::vector)) AS similarity
                FROM "VectorEmbeddings"
                """
                params = {"query_vector": str(vector_list), "limit": limit}
                
                if category:
                    query_str += " WHERE category = :category"
                    params["category"] = category
                    
                query_str += " ORDER BY embedding <=> :query_vector::vector ASC LIMIT :limit;"
                
                results = []
                with engine.connect() as conn:
                    result = conn.execute(text(query_str), params)
                    for row in result:
                        results.append({
                            "content": row[0],
                            "source": row[1],
                            "category": row[2],
                            "similarity": float(row[3])
                        })
                
                if results:
                    print(f"[RETRIEVAL] Database search found {len(results)} matches.")
                    return results
            except Exception as e:
                print(f"[RETRIEVAL] [WARNING] pgvector query failed: {e}. Falling back to local search.")

        # 3. Local in-memory search fallback
        print(f"[RETRIEVAL] Running local in-memory semantic search (limit={limit}, category={category})...")
        if not self.local_index:
            # Try reloading the index in case it was built since startup
            self.load_local_index()
            
        if not self.local_index:
            print("[RETRIEVAL] [WARNING] Local index is empty. No documents to search.")
            return []

        matches = []
        for item in self.local_index:
            # Optional category filter
            if category and item["category"] != category:
                continue
                
            # Cosine similarity is simply the dot product since both vectors are normalized
            # sentence-transformers outputs L2-normalized embeddings (unit length = 1)
            doc_emb = item["embedding"]
            similarity = float(np.dot(query_vector, doc_emb))
            
            matches.append({
                "content": item["content"],
                "source": item["source"],
                "category": item["category"],
                "similarity": similarity
            })

        # Sort matches by similarity descending
        matches.sort(key=lambda x: x["similarity"], reverse=True)
        top_matches = matches[:limit]
        print(f"[RETRIEVAL] Local search returned {len(top_matches)} matches.")
        return top_matches

retrieval_service = RetrievalService()
```


### File: `sisp-ml/requirements.txt`

```text
# Web framework
fastapi==0.115.5
uvicorn[standard]==0.32.1

# Database
psycopg2-binary==2.9.10
pgvector==0.3.6
sqlalchemy==2.0.36

# HTTP & API
httpx==0.28.0
groq==0.13.0

# Environment & Config
python-dotenv==1.0.1
pydantic==2.10.3
pydantic-settings==2.7.0

# Utilities
python-multipart==0.0.20

# ML & NLP (pre-built wheels)
numpy==1.26.4
joblib==1.4.2
scikit-learn==1.5.2
sentence-transformers==3.3.1
```

