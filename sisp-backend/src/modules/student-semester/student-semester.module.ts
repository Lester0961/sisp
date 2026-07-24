import { Module } from '@nestjs/common';
import { StudentSemesterService } from './student-semester.service';
import { StudentSemesterController } from './student-semester.controller';

@Module({
  controllers: [StudentSemesterController],
  providers: [StudentSemesterService],
  exports: [StudentSemesterService],
})
export class StudentSemesterModule {}
