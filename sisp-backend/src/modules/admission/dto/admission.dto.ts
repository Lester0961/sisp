import { IsString, IsNotEmpty, IsEmail, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateAdmissionApplicationDto {
  @IsString()
  @IsNotEmpty()
  applicantType!: string; // freshman | transferee | bridging | cross_enrollee

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsOptional()
  suffix?: string;

  @IsString()
  @IsNotEmpty()
  dob!: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  sex?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  mobile!: string;

  @IsString()
  @IsNotEmpty()
  addressLine!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  province!: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsNotEmpty()
  guardianName!: string;

  @IsString()
  @IsNotEmpty()
  guardianRelation!: string;

  @IsString()
  @IsNotEmpty()
  guardianContact!: string;

  @IsString()
  @IsNotEmpty()
  emergencyName!: string;

  @IsString()
  @IsNotEmpty()
  emergencyRelation!: string;

  @IsString()
  @IsNotEmpty()
  emergencyContact!: string;

  @IsString()
  @IsNotEmpty()
  lastSchoolName!: string;

  @IsString()
  @IsOptional()
  lastSchoolType?: string;

  @IsInt()
  @Min(1970)
  @Max(2100)
  @IsOptional()
  yearGraduated?: number;

  @IsString()
  @IsOptional()
  previousProgram?: string;

  @IsString()
  @IsOptional()
  strandTrack?: string;

  @IsString()
  @IsNotEmpty()
  programId!: string;
}

export class ReviewAdmissionApplicationDto {
  @IsString()
  @IsNotEmpty()
  status!: string; // approved | rejected | needs_revision | under_review

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsString()
  @IsOptional()
  curriculumId?: string; // Optional custom curriculum version assignment
}

export class SubmitRequirementDto {
  @IsString()
  @IsNotEmpty()
  definitionId!: string;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsInt()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;
}
