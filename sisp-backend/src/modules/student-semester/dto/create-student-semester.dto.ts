import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateStudentSemesterDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  semester: string;

  @IsString()
  @IsNotEmpty()
  year: string;

  @IsBoolean()
  @IsOptional()
  isFullyPaid?: boolean;
}

export class UpdateStudentSemesterDto {
  @IsBoolean()
  isFullyPaid: boolean;
}
