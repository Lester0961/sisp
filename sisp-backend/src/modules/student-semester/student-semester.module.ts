import { Module } from '@nestjs/common';
import { StudentSemesterService } from './student-semester.service';
import { StudentSemesterController } from './student-semester.controller';
import { AcademicTermController } from './academic-term.controller';
import { AcademicTermService } from './academic-term.service';
import { StudentTermController } from './student-term.controller';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [FinanceModule],
  controllers: [StudentSemesterController, StudentTermController, AcademicTermController],
  providers: [StudentSemesterService, AcademicTermService],
  exports: [StudentSemesterService, AcademicTermService],
})
export class StudentSemesterModule {}
