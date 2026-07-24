import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['enrolled', 'dropped', 'completed', 'failed'], {
    message: 'Status must be one of: enrolled, dropped, completed, failed',
  })
  status: string;
}
