import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  programCode?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5)
  yearLevel?: number;
}
