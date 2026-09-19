import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const mockPrisma = {
    studentProfile: {
      findUnique: jest.fn(),
    },
    documentRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };

  const mockNotifications = {
    sendToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitPaymentProof', () => {
    const profile = { id: 'profile-1', userId: 'user-1' };
    const awaiting = {
      id: 'req-1',
      studentId: 'profile-1',
      type: 'certificate_of_enrollment',
      status: 'awaiting_payment',
      items: [],
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
    });

    it('stores channel, reference and timestamp for own awaiting request', async () => {
      mockPrisma.documentRequest.findUnique.mockResolvedValue(awaiting);
      mockPrisma.documentRequest.update.mockImplementation((args: any) =>
        Promise.resolve({ ...awaiting, ...args.data }),
      );

      const res = await service.submitPaymentProof('user-1', 'req-1', {
        channel: 'gcash',
        reference: 'GCASH12345',
      } as any);

      expect(mockPrisma.documentRequest.update).toHaveBeenCalledTimes(1);
      const data = mockPrisma.documentRequest.update.mock.calls[0][0].data;
      expect(data.paymentProofChannel).toBe('gcash');
      expect(data.paymentProofReference).toBe('GCASH12345');
      expect(data.paymentProofSubmittedAt).toBeInstanceOf(Date);
      expect(res.data.paymentProofChannel).toBe('gcash');
    });

    it('rejects requests belonging to another student', async () => {
      mockPrisma.documentRequest.findUnique.mockResolvedValue({
        ...awaiting,
        studentId: 'profile-other',
      });

      await expect(
        service.submitPaymentProof('user-1', 'req-1', {
          channel: 'pnb',
          reference: 'SLIP1',
        } as any),
      ).rejects.toThrow('not found');
      expect(mockPrisma.documentRequest.update).not.toHaveBeenCalled();
    });

    it('rejects proof when not awaiting payment', async () => {
      mockPrisma.documentRequest.findUnique.mockResolvedValue({
        ...awaiting,
        status: 'pending',
      });

      await expect(
        service.submitPaymentProof('user-1', 'req-1', {
          channel: 'gcash',
          reference: 'X',
        } as any),
      ).rejects.toThrow('awaiting payment');
    });
  });

  describe('updateRequestStatus (P7-02/P7-04)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPrisma.documentRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        studentId: 'profile-1',
        status: 'pending',
        type: 'certificate_of_enrollment',
        items: [],
        student: { user: { id: 'user-1' } },
      });
      mockPrisma.documentRequest.update.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'req-1',
          type: 'certificate_of_enrollment',
          status: args.data.status,
          items: [],
          student: { user: { id: 'user-1' } },
        }),
      );
    });

    it('records actor, old/new status, and request in the audit log', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const res: any = await service.updateRequestStatus('req-1', { status: 'under_review' }, 'registrar-1');

      expect(res.data.status).toBe('under_review');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'registrar-1',
          action: 'SERVICE_REQUEST_STATUS_CHANGE',
          resource: 'requests',
          resourceId: 'req-1',
          oldValue: 'pending',
          newValue: 'under_review',
        }),
      });
      expect(mockNotifications.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'Document Request Update',
        expect.stringContaining('is now under review'),
      );
    });

    it('rejects invalid status transitions', async () => {
      mockPrisma.documentRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        studentId: 'profile-1',
        status: 'released',
        items: [],
        student: { user: { id: 'user-1' } },
      });

      await expect(
        service.updateRequestStatus('req-1', { status: 'pending' }, 'registrar-1'),
      ).rejects.toThrow(/Cannot transition/);
      expect(mockPrisma.documentRequest.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentChannels (P6-04)', () => {
    const saved = {
      gcashNumber: process.env.PAYMENT_CHANNEL_GCASH_NUMBER,
      gcashName: process.env.PAYMENT_CHANNEL_GCASH_NAME,
      pnbAccount: process.env.PAYMENT_CHANNEL_PNB_ACCOUNT,
    };

    afterEach(() => {
      if (saved.gcashNumber === undefined) delete process.env.PAYMENT_CHANNEL_GCASH_NUMBER;
      else process.env.PAYMENT_CHANNEL_GCASH_NUMBER = saved.gcashNumber;
      if (saved.gcashName === undefined) delete process.env.PAYMENT_CHANNEL_GCASH_NAME;
      else process.env.PAYMENT_CHANNEL_GCASH_NAME = saved.gcashName;
      if (saved.pnbAccount === undefined) delete process.env.PAYMENT_CHANNEL_PNB_ACCOUNT;
      else process.env.PAYMENT_CHANNEL_PNB_ACCOUNT = saved.pnbAccount;
    });

    it('reports unconfigured channels instead of hard-coded values', async () => {
      delete process.env.PAYMENT_CHANNEL_GCASH_NUMBER;
      delete process.env.PAYMENT_CHANNEL_PNB_ACCOUNT;

      const channels: any = await service.getPaymentChannels();

      expect(channels.configured).toBe(false);
      expect(channels.gcash).toBeNull();
      expect(channels.pnb).toBeNull();
      expect(channels.instruction).toMatch(/contact the Treasury Office/i);
    });

    it('serves deployment-configured channels', async () => {
      process.env.PAYMENT_CHANNEL_GCASH_NUMBER = '0999 000 0000';
      process.env.PAYMENT_CHANNEL_GCASH_NAME = 'Test Treasury Account';
      process.env.PAYMENT_CHANNEL_PNB_ACCOUNT = '000000000000';

      const channels: any = await service.getPaymentChannels();

      expect(channels.configured).toBe(true);
      expect(channels.gcash.number).toBe('0999 000 0000');
      expect(channels.gcash.accountName).toBe('Test Treasury Account');
      expect(channels.pnb.accountNumber).toBe('000000000000');
    });
  });
});
