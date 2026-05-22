import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEnrollmentStats() {
    const programStats = await this.prisma.studentProfile.groupBy({
      by: ['programId'],
      _count: { id: true },
    });

    const programs = await this.prisma.program.findMany();
    const programMap = new Map(programs.map((p) => [p.id, p.name]));
    
    const data = programStats.map((stat) => ({
      programId: stat.programId,
      programName: programMap.get(stat.programId) || 'Unknown',
      count: stat._count.id,
    }));

    const totalEnrolled = await this.prisma.studentProfile.count();

    return {
      data,
      totalEnrolled,
    };
  }

  async getGpaDistribution() {
    const grades = await this.prisma.grade.findMany({
      where: { isVisible: true },
      select: { finalGrade: true },
    });

    const brackets = {
      '1.0 - 1.5': 0,
      '1.51 - 2.0': 0,
      '2.01 - 2.5': 0,
      '2.51 - 3.0': 0,
      '3.01+': 0,
    };

    grades.forEach((g) => {
      if (g.finalGrade === null || g.finalGrade === undefined) return;
      const fg = g.finalGrade;
      if (fg >= 1.0 && fg <= 1.5) brackets['1.0 - 1.5']++;
      else if (fg > 1.5 && fg <= 2.0) brackets['1.51 - 2.0']++;
      else if (fg > 2.0 && fg <= 2.5) brackets['2.01 - 2.5']++;
      else if (fg > 2.5 && fg <= 3.0) brackets['2.51 - 3.0']++;
      else if (fg > 3.0) brackets['3.01+']++;
    });

    return brackets;
  }

  async getPassFailRates() {
    const courseGrades = await this.prisma.grade.findMany({
      select: {
        finalGrade: true,
        enrollment: {
          select: {
            course: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
    });

    const courseStatsMap = new Map<
      string,
      { code: string; title: string; pass: number; fail: number }
    >();

    courseGrades.forEach((g) => {
      const course = g.enrollment?.course;
      if (!course) return;
      if (!courseStatsMap.has(course.id)) {
        courseStatsMap.set(course.id, {
          code: course.code,
          title: course.title,
          pass: 0,
          fail: 0,
        });
      }
      const stat = courseStatsMap.get(course.id)!;
      if (g.finalGrade !== null && g.finalGrade <= 3.0) {
        stat.pass++;
      } else if (g.finalGrade !== null && g.finalGrade > 3.0) {
        stat.fail++;
      }
    });

    return Array.from(courseStatsMap.values());
  }

  async getRequestVolume() {
    const requestStats = await this.prisma.documentRequest.groupBy({
      by: ['type', 'status'],
      _count: { id: true },
    });

    return requestStats.map((stat) => ({
      type: stat.type,
      status: stat.status,
      count: stat._count.id,
    }));
  }

  async getChatbotAnalytics() {
    const totalLogs = await this.prisma.chatLog.count();
    const intentStats = await this.prisma.chatLog.groupBy({
      by: ['intent'],
      _count: { id: true },
      _avg: { confidence: true },
    });

    const escalatedCount = await this.prisma.escalationQueue.count();
    const escalationRate = totalLogs > 0 ? escalatedCount / totalLogs : 0.0;

    return {
      totalLogs,
      escalatedCount,
      escalationRate,
      intentDistribution: intentStats.map((stat) => ({
        intent: stat.intent || 'unknown',
        count: stat._count.id,
        avgConfidence: stat._avg.confidence || 0.0,
      })),
    };
  }

  async exportEnrollmentExcel(): Promise<Buffer> {
    const students = await this.prisma.studentProfile.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        program: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Enrollment Report');

    worksheet.columns = [
      { header: 'Student Number', key: 'studentNumber', width: 20 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Program Code', key: 'programCode', width: 15 },
      { header: 'Program Name', key: 'programName', width: 35 },
      { header: 'Year Level', key: 'yearLevel', width: 12 },
    ];

    students.forEach((student) => {
      worksheet.addRow({
        studentNumber: student.studentNumber,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        programCode: student.program.code,
        programName: student.program.name,
        yearLevel: student.yearLevel,
      });
    });

    // Make header bold
    worksheet.getRow(1).font = { bold: true };

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
    return buffer;
  }

  async exportGradesPdf(studentId: string): Promise<Buffer> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        program: {
          select: {
            name: true,
            code: true,
          },
        },
        enrollments: {
          include: {
            course: true,
            grade: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student profile with ID ${studentId} not found`);
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // PDF Branding Header
      doc.fontSize(20).fillColor('#1E1B4B').text('REGIS MARIE COLLEGE', { align: 'center' });
      doc.fontSize(10).fillColor('#64748B').text('OFFICIAL GRADE EVALUATION REPORT', { align: 'center' });
      doc.moveDown(2);

      // Student Info Block
      doc.fillColor('#000000').fontSize(11).text(`Student Name: `, { continued: true }).font('Helvetica-Bold').text(`${student.user.firstName} ${student.user.lastName}`).font('Helvetica');
      doc.text(`Student Number: `, { continued: true }).font('Helvetica-Bold').text(`${student.studentNumber}`).font('Helvetica');
      doc.text(`Program: `, { continued: true }).font('Helvetica-Bold').text(`${student.program.name} (${student.program.code})`).font('Helvetica');
      doc.text(`Year Level: `, { continued: true }).font('Helvetica-Bold').text(`${student.yearLevel}`).font('Helvetica');
      doc.text(`Email: `, { continued: true }).font('Helvetica-Bold').text(`${student.user.email}`).font('Helvetica');
      doc.moveDown(1.5);

      // Grade table Header
      const tableTop = 230;
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#475569');
      doc.text('Course Code', 50, tableTop);
      doc.text('Course Title', 140, tableTop);
      doc.text('Prelims', 330, tableTop);
      doc.text('Midterms', 380, tableTop);
      doc.text('Finals', 430, tableTop);
      doc.text('Final Grade', 485, tableTop);

      doc.moveTo(50, tableTop + 13).lineTo(550, tableTop + 13).strokeColor('#E2E8F0').stroke();

      let y = tableTop + 23;
      doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a');
      student.enrollments.forEach((enrollment) => {
        const grade = enrollment.grade;
        doc.text(enrollment.course.code, 50, y);
        doc.text(enrollment.course.title.substring(0, 32), 140, y);
        doc.text(grade?.prelim !== null && grade?.prelim !== undefined ? String(grade?.prelim) : 'N/A', 330, y);
        doc.text(grade?.midterm !== null && grade?.midterm !== undefined ? String(grade?.midterm) : 'N/A', 380, y);
        doc.text(grade?.finals !== null && grade?.finals !== undefined ? String(grade?.finals) : 'N/A', 430, y);
        doc.text(grade?.finalGrade !== null && grade?.finalGrade !== undefined ? String(grade?.finalGrade) : 'N/A', 485, y);
        y += 18;
      });

      doc.end();
    });
  }
}
