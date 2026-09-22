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

  async getPublishedGradeCount() {
    const grades = await this.prisma.grade.findMany({
      where: { isVisible: true },
      select: { finalGrade: true },
    });

    return {
      publishedGradeCount: grades.filter((grade) => grade.finalGrade !== null && grade.finalGrade !== undefined).length,
    };
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
    const escalationsResolved = await this.prisma.escalationQueue.count({
      where: { status: 'resolved' },
    });
    const escalationRate =
      totalLogs > 0 ? Number((escalatedCount / totalLogs).toFixed(4)) : null;
    const escalationResolutionRate =
      escalatedCount > 0 ? Number((escalationsResolved / escalatedCount).toFixed(4)) : null;

    return {
      totalLogs,
      escalatedCount,
      escalationsResolved,
      escalationRate,
      escalationResolutionRate,
      intentDistribution: intentStats.map((stat) => ({
        intent: stat.intent || 'unknown',
        count: stat._count.id,
        avgConfidence: stat._avg.confidence === null
          ? null
          : Number(stat._avg.confidence.toFixed(2)),
      })),
    };
  }

  /**
   * Tuition/finance totals for authorized report readers. All values come
   * straight from the ledger tables; nothing is estimated.
   */
  async getFinanceSummary() {
    const [assessed, collected, outstanding, awaitingVerification, documentFeesCollected] =
      await Promise.all([
        this.prisma.studentSemester.aggregate({ _sum: { amountDue: true } }),
        this.prisma.paymentTransaction.aggregate({
          where: { status: 'verified' },
          _sum: { amount: true },
        }),
        this.prisma.accountBalance.aggregate({ _sum: { balance: true } }),
        this.prisma.paymentTransaction.count({ where: { status: 'pending' } }),
        this.prisma.documentRequest.aggregate({
          where: { paymentStatus: 'paid' },
          _sum: { fee: true },
        }),
      ]);

    const toNumber = (value: unknown): number => {
      if (value === null || value === undefined) return 0;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
    };

    return {
      totalAssessed: toNumber(assessed._sum.amountDue),
      totalCollected: toNumber(collected._sum.amount),
      outstandingBalance: toNumber(outstanding._sum.balance),
      paymentsAwaitingVerification: awaitingVerification,
      documentFeesCollected: toNumber(documentFeesCollected._sum.fee),
    };
  }

  async getMonthlyExecutiveReport() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const period = { gte: periodStart, lt: periodEnd };
    const totalInquiries = await this.prisma.chatLog.count({ where: { createdAt: period } });
    const intentStats = await this.prisma.chatLog.groupBy({
      by: ['intent'],
      _count: { id: true },
      _avg: { confidence: true },
      where: { createdAt: period },
    });
    const [escalatedCount, escalationsResolved, pendingEscalations, documentRequestsCount] = await Promise.all([
      this.prisma.escalationQueue.count({ where: { createdAt: period } }),
      this.prisma.escalationQueue.count({ where: { createdAt: period, status: { not: 'pending' } } }),
      this.prisma.escalationQueue.count({ where: { createdAt: period, status: 'pending' } }),
      this.prisma.documentRequest.count({ where: { createdAt: period } }),
    ]);
    const totalEnrolled = await this.prisma.studentProfile.count();

    const topInquiries = intentStats
      .map((stat) => ({
        topic: stat.intent || 'General Institutional Query',
        inquiryCount: stat._count.id,
        confidence: stat._avg.confidence === null ? null : Number(stat._avg.confidence.toFixed(2)),
      }))
      .sort((a, b) => b.inquiryCount - a.inquiryCount);

    return {
      reportPeriod: { start: periodStart.toISOString(), endExclusive: periodEnd.toISOString() },
      generatedAt: now.toISOString(),
      summary: {
        totalStudentInquiries: totalInquiries,
        totalStudentProfiles: totalEnrolled,
        totalDocumentRequests: documentRequestsCount,
        escalationsCreated: escalatedCount,
        escalationsResolved,
        pendingEscalations,
        escalationResolutionRate: escalatedCount > 0
          ? Number(((escalationsResolved / escalatedCount) * 100).toFixed(1))
          : null,
      },
      topStudentConcerns: topInquiries.slice(0, 5),
    };
  }


  async exportEnrollmentExcel(): Promise<Buffer> {
    const [summary, students] = await Promise.all([
      this.getEnrollmentStats(),
      this.prisma.studentProfile.findMany({
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
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet('Program Summary');
    summarySheet.columns = [
      { header: 'Program', key: 'programName', width: 36 },
      { header: 'Student Profiles', key: 'count', width: 20 },
    ];
    summary.data.forEach((program) => {
      summarySheet.addRow({ programName: program.programName, count: program.count });
    });
    summarySheet.addRow({ programName: 'Total Student Profiles', count: summary.totalEnrolled });
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(summarySheet.rowCount).font = { bold: true };

    const worksheet = workbook.addWorksheet('Student Details');

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
    const student = await this.getGradeReportStudent(studentId);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // PDF Branding Header
      doc.fontSize(20).fillColor('#1E1B4B').text('REGIS MARIE COLLEGE', { align: 'center' });
      doc
        .fontSize(10)
        .fillColor('#64748B')
        .text('OFFICIAL GRADE EVALUATION REPORT', { align: 'center' });
      doc.moveDown(2);

      // Student Info Block
      doc
        .fillColor('#000000')
        .fontSize(11)
        .text(`Student Name: `, { continued: true })
        .font('Helvetica-Bold')
        .text(`${student.user.firstName} ${student.user.lastName}`)
        .font('Helvetica');
      doc
        .text(`Student Number: `, { continued: true })
        .font('Helvetica-Bold')
        .text(`${student.studentNumber}`)
        .font('Helvetica');
      doc
        .text(`Program: `, { continued: true })
        .font('Helvetica-Bold')
        .text(`${student.program.name} (${student.program.code})`)
        .font('Helvetica');
      doc
        .text(`Year Level: `, { continued: true })
        .font('Helvetica-Bold')
        .text(`${student.yearLevel}`)
        .font('Helvetica');
      doc
        .text(`Email: `, { continued: true })
        .font('Helvetica-Bold')
        .text(`${student.user.email}`)
        .font('Helvetica');
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

      doc
        .moveTo(50, tableTop + 13)
        .lineTo(550, tableTop + 13)
        .strokeColor('#E2E8F0')
        .stroke();

      let y = tableTop + 23;
      doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a');
      student.enrollments.forEach((enrollment) => {
        const grade = enrollment.grade;
        doc.text(enrollment.course.code, 50, y);
        doc.text(enrollment.course.title.substring(0, 32), 140, y);
        doc.text(grade?.prelim !== null && grade?.prelim !== undefined ? String(grade.prelim) : 'N/A', 330, y);
        doc.text(grade?.midterm !== null && grade?.midterm !== undefined ? String(grade.midterm) : 'N/A', 380, y);
        doc.text(grade?.finals !== null && grade?.finals !== undefined ? String(grade.finals) : 'N/A', 430, y);
        doc.text(grade?.finalGrade !== null && grade?.finalGrade !== undefined ? String(grade.finalGrade) : 'N/A', 485, y);
        y += 18;
      });

      doc.end();
    });
  }

  async getGradeReportStudent(studentId: string) {
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
    return {
      ...student,
      enrollments: student.enrollments.map((enrollment) => ({
        ...enrollment,
        // The dashboard aggregates only published grades. Hide unpublished
        // values in the export while retaining an N/A row for the enrollment.
        grade: enrollment.grade?.isVisible ? enrollment.grade : null,
      })),
    };
  }
}
