import { Module } from '@nestjs/common';
import { DeanService } from './dean.service';
import { DeanController } from './dean.controller';
import { AdviserAssignmentsController } from './adviser-assignments.controller';
import { CurriculumModule } from '../curriculum/curriculum.module';

@Module({
  imports: [CurriculumModule],
  controllers: [DeanController, AdviserAssignmentsController],
  providers: [DeanService],
})
export class DeanModule {}