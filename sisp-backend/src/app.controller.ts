import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
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
    // Never report a healthy service while running on ephemeral mock storage.
    // Development mock mode therefore surfaces as HTTP 503 / status degraded.
    if (this.prisma.isOffline) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'sisp-backend',
        database: 'offline-mock',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      service: 'sisp-backend',
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
