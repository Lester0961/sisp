import { Module } from '@nestjs/common';
import { DeanService } from './dean.service';
import { DeanController } from './dean.controller';
import { CurriculumModule } from '../curriculum/curriculum.module';

@Module({
  imports: [CurriculumModule],
  controllers: [DeanController],
  providers: [DeanService],
})
export class DeanModule {}