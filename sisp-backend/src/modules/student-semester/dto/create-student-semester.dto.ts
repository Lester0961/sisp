import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsIn, IsNumber, Min } from 'class-validator';

export class CreateStudentSemesterDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsOptional()
  semester: string;

  @IsString()
  @IsOptional()
  year: string;

  @IsBoolean()
  @IsOptional()
  isFullyPaid?: boolean;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsIn(['unpaid', 'partial', 'paid', 'waived'])
  @IsOptional()
  paymentStatus?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountDue?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @IsString()
  @IsOptional()
  paymentReference?: string;
}

export class UpdateStudentSemesterDto {
  @IsBoolean()
  isFullyPaid: boolean;

  @IsIn(['unpaid', 'partial', 'paid', 'waived'])
  @IsOptional()
  paymentStatus?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountDue?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @IsString()
  @IsOptional()
  paymentReference?: string;
}
