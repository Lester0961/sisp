import { Test, TestingModule } from '@nestjs/testing';
import { AcademicTermService } from './academic-term.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AcademicTermService', () => {
  let service: AcademicTermService;
  const mockPrisma = {
    academicTerm: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcademicTermService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AcademicTermService>(AcademicTermService);
    jest.clearAllMocks();
  });

  it('returns terms grouped in academic order', async () => {
    mockPrisma.academicTerm.findMany.mockResolvedValue([{ code: '2026-2027-T1', termNumber: 1 }]);
    await expect(service.findAll()).resolves.toEqual({ data: [{ code: '2026-2027-T1', termNumber: 1 }], total: 1 });
  });

  it('clears the previous current flag when creating a new current term', async () => {
    mockPrisma.academicTerm.create.mockResolvedValue({ id: 'term-1', code: '2026-2027-T1' });
    await service.create({
      academicYear: '2026-2027', termNumber: 1, code: '2026-2027-T1', label: 'Term 1', isCurrent: true,
    });
    expect(mockPrisma.academicTerm.updateMany).toHaveBeenCalledWith({ where: { isCurrent: true }, data: { isCurrent: false } });
    expect(mockPrisma.academicTerm.create).toHaveBeenCalled();
  });
});
