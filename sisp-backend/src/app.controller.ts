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
