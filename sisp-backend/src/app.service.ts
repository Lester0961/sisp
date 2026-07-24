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
