import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateHistoryDto {
  @IsString()
  @IsNotEmpty()
  term: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['enrolled', 'completed', 'failed', 'dropped'], {
    message: 'Status must be one of: enrolled, completed, failed, dropped',
  })
  status: string;
}
