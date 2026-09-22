import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { RequirePermissions } from '../../common/authz/require-permissions.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('enrollment')
  @RequirePermissions('report.read')
  async getEnrollmentStats() {
    return this.analyticsService.getEnrollmentStats();
  }

  @Get('grades')
  @RequirePermissions('report.read')
  async getPublishedGradeCount() {
    return this.analyticsService.getPublishedGradeCount();
  }

  @Get('requests')
  @RequirePermissions('report.read')
  async getRequestVolume() {
    return this.analyticsService.getRequestVolume();
  }

  @Get('finance-summary')
  @RequirePermissions('report.read')
  async getFinanceSummary() {
    return this.analyticsService.getFinanceSummary();
  }

  @Get('chatbot')
  @RequirePermissions('aria_trends.read')
  async getChatbotAnalytics() {
    return this.analyticsService.getChatbotAnalytics();
  }

  @Get('monthly-report')
  @RequirePermissions('report.read')
  async getMonthlyExecutiveReport() {
    return this.analyticsService.getMonthlyExecutiveReport();
  }


  @Get('export/enrollment')
  @RequirePermissions('report.read')
  async exportEnrollmentExcel(@Res() res: Response) {
    const buffer = await this.analyticsService.exportEnrollmentExcel();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=enrollment.xlsx');
    res.send(buffer);
  }

  @Get('export/grades/:studentId')
  @RequirePermissions('report.read')
  async exportGradesPdf(@Param('studentId') studentId: string, @Res() res: Response) {
    const buffer = await this.analyticsService.exportGradesPdf(studentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=grades-${studentId}.pdf`);
    res.send(buffer);
  }
}
