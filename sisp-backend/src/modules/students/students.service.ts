import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            role: {
              select: { name: true },
            },
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        enrollments: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
                units: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        accountBalance: {
          select: {
            balance: true,
            status: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        'Student profile not found. Please contact admin to set up your profile.',
      );
    }

    return profile;
  }

  async getProfileById(id: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            role: {
              select: { name: true },
            },
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        enrollments: {
          include: {
            course: {
              select: {
                code: true,
                title: true,
                units: true,
              },
            },
            grade: {
              select: {
                finalGrade: true,
                isVisible: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        enrollmentHistory: {
          orderBy: { createdAt: 'desc' },
        },
        accountBalance: true,
        documentRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Student profile with ID ${id} not found`);
    }

    return profile;
  }

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Student profile for user ${userId} not found`);
    }

    return profile;
  }

  async createProfile(userId: string, dto: CreateStudentProfileDto) {
    // Check if profile already exists
    const existing = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Student profile already exists for this user');
    }

    // Check if student number is already taken
    const existingNumber = await this.prisma.studentProfile.findUnique({
      where: { studentNumber: dto.studentNumber },
    });

    if (existingNumber) {
      throw new ConflictException(`Student number '${dto.studentNumber}' is already in use`);
    }

    // Find the program by code
    const program = await this.prisma.program.findUnique({
      where: { code: dto.programCode },
    });

    if (!program) {
      throw new BadRequestException(`Program with code '${dto.programCode}' not found`);
    }

    // Verify user exists and is a student
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (user.role.name !== 'student') {
      throw new BadRequestException(
        'Student profiles can only be created for users with the student role',
      );
    }

    const profile = await this.prisma.studentProfile.create({
      data: {
        userId,
        studentNumber: dto.studentNumber,
        programId: program.id,
        yearLevel: dto.yearLevel,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return {
      message: 'Student profile created successfully',
      data: profile,
    };
  }

  async updateProfile(id: string, dto: UpdateStudentDto) {
    const existing = await this.prisma.studentProfile.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Student profile with ID ${id} not found`);
    }

    const updateData: {
      programId?: string;
      yearLevel?: number;
    } = {};

    if (dto.programCode !== undefined) {
      const program = await this.prisma.program.findUnique({
        where: { code: dto.programCode },
      });

      if (!program) {
        throw new BadRequestException(`Program with code '${dto.programCode}' not found`);
      }

      updateData.programId = program.id;
    }

    if (dto.yearLevel !== undefined) {
      updateData.yearLevel = dto.yearLevel;
    }

    const updated = await this.prisma.studentProfile.update({
      where: { id },
      data: updateData,
      include: {
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return {
      message: 'Student profile updated successfully',
      data: updated,
    };
  }

  async listAll() {
    const profiles = await this.prisma.studentProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
        program: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: profiles,
      total: profiles.length,
    };
  }
}
