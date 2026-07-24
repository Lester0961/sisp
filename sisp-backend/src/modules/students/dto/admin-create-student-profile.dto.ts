import { IsUUID } from 'class-validator';
import { CreateStudentProfileDto } from './create-student-profile.dto';

export class AdminCreateStudentProfileDto extends CreateStudentProfileDto {
  @IsUUID()
  userId: string;
}
