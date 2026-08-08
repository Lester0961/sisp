import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { StudentSemesterModule } from './modules/student-semester/student-semester.module';

import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CurriculumModule } from './modules/curriculum/curriculum.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { getRateLimitConfig } from './common/config/rate-limit.config';

const rateLimitConfig = getRateLimitConfig();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Global rate limiter. Stricter limits are applied per-route via @Throttle.
    ThrottlerModule.forRoot([
      {
        ttl: rateLimitConfig.globalTtlMs,
        limit: rateLimitConfig.globalLimit,
      },
    ]),
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
    StudentSemesterModule,

    AnalyticsModule,
    CurriculumModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
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
