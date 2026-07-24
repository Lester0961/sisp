import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../modules/auth/strategies/jwt.strategy';

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

// Routes to exclude from audit logging (auth endpoints)
const EXCLUDED_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
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

    const ipAddress = (request.headers?.['x-forwarded-for'] as string) ?? request.ip ?? 'unknown';

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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
