import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class EnrollDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsBoolean()
  @IsOptional()
  riskAcknowledged?: boolean;

  @IsBoolean()
  @IsOptional()
  isTransferee?: boolean;
}
