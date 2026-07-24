import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateHistoryDto {
  @IsString()
  @IsNotEmpty()
  term: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['enrolled', 'completed', 'withdrawn', 'on_leave'], {
    message: 'Status must be one of: enrolled, completed, withdrawn, on_leave',
  })
  status: string;
}
