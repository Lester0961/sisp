import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('enrollment')
  @Roles('admin_staff', 'dean')
  async getEnrollmentStats() {
    return this.analyticsService.getEnrollmentStats();
  }

  @Get('grades')
  @Roles('admin_staff', 'dean', 'faculty')
  async getGpaDistribution() {
    const distribution = await this.analyticsService.getGpaDistribution();
    const passFailRates = await this.analyticsService.getPassFailRates();
    return {
      distribution,
      passFailRates,
    };
  }

  @Get('requests')
  @Roles('admin_staff', 'sys_admin')
  async getRequestVolume() {
    return this.analyticsService.getRequestVolume();
  }

  @Get('chatbot')
  @Roles('admin_staff', 'dean', 'sys_admin')
  async getChatbotAnalytics() {
    return this.analyticsService.getChatbotAnalytics();
  }

  @Get('export/enrollment')
  @Roles('admin_staff')
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
  @Roles('admin_staff', 'dean')
  async exportGradesPdf(@Param('studentId') studentId: string, @Res() res: Response) {
    const buffer = await this.analyticsService.exportGradesPdf(studentId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=grades-${studentId}.pdf`);
    res.send(buffer);
  }
}
