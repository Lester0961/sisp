import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const mockPrisma = {
    isOffline: false,
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return health status object when database is connected', () => {
      const result = appController.getHealth() as Record<string, unknown>;
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', 'sisp-backend');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('database', 'connected');
    });

    it('should fail closed with degraded status when running on mock storage', () => {
      mockPrisma.isOffline = true;
      expect(() => appController.getHealth()).toThrow(ServiceUnavailableException);
      mockPrisma.isOffline = false;
    });
  });
});
