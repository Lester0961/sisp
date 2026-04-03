import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      service: 'sisp-backend',
      timestamp: new Date().toISOString(),
    };
  }
}