import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAdmissionApplicationDto,
  ReviewAdmissionApplicationDto,
  SubmitRequirementDto,
} from './dto/admission.dto';

@Injectable()
export class AdmissionService {
  constructor(private readonly prisma: PrismaService) {}

  async getRequirementDefinitions(applicantType?: string) {
    const definitions = await this.prisma.admissionRequirementDefinition.findMany({
      where: {
        isActive: true,
        ...(applicantType
          ? {
              OR: [{ applicantType: null }, { applicantType }],
            }
          : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
    return definitions;
  }

  async createApplication(dto: CreateAdmissionApplicationDto) {
    // Check program exists
    const program = await this.prisma.program.findUnique({
      where: { id: dto.programId },
    });
    if (!program) {
      throw new NotFoundException(`Program with ID ${dto.programId} not found.`);
    }

    // Generate Application Number: APP-2026-XXXX
    const count = await this.prisma.admissionApplication.count();
    const applicationNo = `APP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const application = await this.prisma.admissionApplication.create({
      data: {
        applicationNo,
        applicantType: dto.applicantType,
        status: 'submitted',
        firstName: dto.firstName,
        middleName: dto.middleName,
        lastName: dto.lastName,
        suffix: dto.suffix,
        dob: new Date(dto.dob),
        sex: dto.sex,
        nationality: dto.nationality || 'Filipino',
        email: dto.email,
        mobile: dto.mobile,
        addressLine: dto.addressLine,
        city: dto.city,
        province: dto.province,
        postalCode: dto.postalCode,
        guardianName: dto.guardianName,
        guardianRelation: dto.guardianRelation,
        guardianContact: dto.guardianContact,
        emergencyName: dto.emergencyName,
        emergencyRelation: dto.emergencyRelation,
        emergencyContact: dto.emergencyContact,
        lastSchoolName: dto.lastSchoolName,
        lastSchoolType: dto.lastSchoolType,
        yearGraduated: dto.yearGraduated,
        previousProgram: dto.previousProgram,
        strandTrack: dto.strandTrack,
        programId: dto.programId,
      },
      include: {
        program: true,
        requirements: {
          include: { definition: true },
        },
      },
    });

    return application;
  }

  async getApplicationByNo(applicationNo: string) {
    const application = await this.prisma.admissionApplication.findUnique({
      where: { applicationNo },
      include: {
        program: {
          include: { curricula: true },
        },
        requirements: {
          include: { definition: true },
        },
        createdStudent: {
          include: { user: true },
        },
      },
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationNo} not found.`);
    }
    return application;
  }

  async submitRequirement(applicationNo: string, dto: SubmitRequirementDto) {
    const application = await this.getApplicationByNo(applicationNo);

    const definition = await this.prisma.admissionRequirementDefinition.findUnique({
      where: { id: dto.definitionId },
    });
    if (!definition) {
      throw new NotFoundException(`Requirement definition ${dto.definitionId} not found.`);
    }

    const submission = await this.prisma.admissionRequirementSubmission.upsert({
      where: {
        applicationId_definitionId: {
          applicationId: application.id,
          definitionId: dto.definitionId,
        },
      },
      update: {
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        status: 'submitted',
      },
      create: {
        applicationId: application.id,
        definitionId: dto.definitionId,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        status: 'submitted',
      },
    });

    return submission;
  }

  async listApplications(status?: string, programId?: string, applicantType?: string) {
    return this.prisma.admissionApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(programId ? { programId } : {}),
        ...(applicantType ? { applicantType } : {}),
      },
      include: {
        program: true,
        requirements: {
          include: { definition: true },
        },
        createdStudent: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewApplication(
    applicationNo: string,
    reviewerId: string,
    dto: ReviewAdmissionApplicationDto,
  ) {
    const application = await this.getApplicationByNo(applicationNo);

    if (application.status === 'approved') {
      throw new ConflictException(`Application ${applicationNo} is already approved.`);
    }

    // If approved, perform atomic conversion into User + StudentProfile + Curriculum assignment
    if (dto.status === 'approved') {
      return this.approveApplicationAndCreateStudent(application, reviewerId, dto.curriculumId);
    }

    // Otherwise, update status and review notes
    return this.prisma.admissionApplication.update({
      where: { id: application.id },
      data: {
        status: dto.status,
        reviewNotes: dto.reviewNotes,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        program: true,
        requirements: { include: { definition: true } },
      },
    });
  }

  private async approveApplicationAndCreateStudent(
    application: any,
    reviewerId: string,
    customCurriculumId?: string,
  ) {
    // 1. Resolve student role
    const studentRole = await this.prisma.role.findUnique({
      where: { name: 'student' },
    });
    const roleId = studentRole?.id ?? 'role-id-student';

    // 2. Resolve Curriculum version for the program
    let curriculumId = customCurriculumId;
    if (!curriculumId) {
      const defaultCurriculum = await this.prisma.curriculum.findFirst({
        where: { programId: application.programId },
        orderBy: { effectiveYear: 'desc' },
      });
      curriculumId = defaultCurriculum?.id;
    }

    // 3. Generate Student Number: YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const studentCount = await this.prisma.studentProfile.count();
    const studentNumber = `${currentYear}-${String(studentCount + 1001).padStart(4, '0')}`;

    // Default student initial password
    const defaultPassword = process.env.LOCAL_DEMO_PASSWORD || 'RmcStudent2026!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // Create User & StudentProfile in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create User account if email doesn't already exist
      let user = await tx.user.findUnique({ where: { email: application.email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email: application.email,
            passwordHash,
            firstName: application.firstName,
            lastName: application.lastName,
            roleId,
            mustChangePassword: true,
          },
        });
      }

      // Create StudentProfile
      const studentProfile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          studentNumber,
          programId: application.programId,
          curriculumId,
          yearLevel: 1,
        },
        include: {
          user: true,
          program: true,
          curriculum: true,
        },
      });

      // Initialize AccountBalance = 0.00
      await tx.accountBalance.create({
        data: {
          studentId: studentProfile.id,
          balance: 0.0,
          status: 'active',
        },
      });

      // Update AdmissionApplication status
      const updatedApp = await tx.admissionApplication.update({
        where: { id: application.id },
        data: {
          status: 'approved',
          createdStudentId: studentProfile.id,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: {
          program: true,
          createdStudent: {
            include: { user: true, curriculum: true },
          },
        },
      });

      return updatedApp;
    });

    return result;
  }
}
