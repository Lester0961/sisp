import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export async function requireStudentProfile(prisma: PrismaService, userId: string) {
  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new NotFoundException('Student profile not found. Please contact admin.');
  }
  return profile;
}
