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

  describe('getPaymentChannels', () => {
    it('serves the announced Treasury channels', async () => {
      const channels: any = await service.getPaymentChannels();
      expect(channels.gcash.number).toBe('0919 911 8050');
      expect(channels.pnb.accountNumber).toBe('149110075280');
      expect(channels.proofRecipient.name).toMatch(/Arlyne Punzalan/);
    });
  });
});
