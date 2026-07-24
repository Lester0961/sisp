import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class EnrollDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsOptional()
  section?: string;
}
