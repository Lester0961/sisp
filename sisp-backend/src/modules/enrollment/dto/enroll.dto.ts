import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class EnrollDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsOptional()
  section?: string;

  // Optional scheduled section (P5-07); validated server-side against the
  // course and term before use.
  @IsString()
  @IsOptional()
  classSectionId?: string;

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
