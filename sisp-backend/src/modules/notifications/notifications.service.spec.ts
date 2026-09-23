import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma: any = {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new NotificationsService(prisma);
  });

  it('sends an internal event through the shared single-recipient creation path', async () => {
    await service.sendToUser('user-1', 'Enrollment Recorded', 'Your course enrollment has been recorded.');
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        title: 'Enrollment Recorded',
        message: 'Your course enrollment has been recorded.',
      },
    });
  });

  it('uses a unique event key for repeatable escalation notices', async () => {
    await service.sendToUser('student-1', 'Reply available', 'A response is available.', {
      caseId: 'case-1', eventKey: 'case-1:reply-1',
    });
    expect(prisma.notification.upsert).toHaveBeenCalledWith({
      where: { eventKey: 'case-1:reply-1' }, update: {},
      create: { userId: 'student-1', title: 'Reply available', message: 'A response is available.', caseId: 'case-1', eventKey: 'case-1:reply-1' },
    });
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('deduplicates broadcast recipients and persists through shared creation', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    await service.sendNotification({
      userId: 'user-1', targetRole: 'student', title: 'Notice', message: 'General notice',
    } as any);
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', title: 'Notice', message: 'General notice' },
        { userId: 'user-2', title: 'Notice', message: 'General notice' },
      ],
    });
  });

  it('uses a single-recipient insert for one-user notifications', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    await service.sendNotification({
      userId: 'user-1', title: 'Notice', message: 'General notice',
    } as any);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', title: 'Notice', message: 'General notice' },
    });
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('requires a target for administrative notification delivery', async () => {
    await expect(service.sendNotification({ title: 'x', message: 'y' } as any))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects combining the all-users target with named recipients', async () => {
    await expect(service.sendNotification({
      targetRole: 'all', userId: 'user-1', title: 'x', message: 'y',
    } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate named recipients instead of replacing their content', async () => {
    await expect(service.sendNotification({
      userIds: ['user-1', 'user-1'], title: 'x', message: 'y',
    } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a user repeated across the single and list recipient fields', async () => {
    await expect(service.sendNotification({
      userId: 'user-1', userIds: ['user-1'], title: 'x', message: 'y',
    } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('guards the shared recipient insert against duplicate ids from any producer', async () => {
    await expect((service as any).createForUsers([
      { userId: 'user-1', title: 'first', message: 'first' },
      { userId: 'user-1', title: 'second', message: 'second' },
    ])).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

});
