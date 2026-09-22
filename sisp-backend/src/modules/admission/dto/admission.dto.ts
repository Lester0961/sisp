import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsInt,
  IsIn,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateAdmissionApplicationDto {
  @IsString()
  @IsIn(['freshman', 'transferee', 'bridging', 'cross_enrollee'], {
    message: 'applicantType must be freshman, transferee, bridging, or cross_enrollee',
  })
  applicantType!: string;

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

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dob must use the YYYY-MM-DD format' })
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
  @IsIn(['under_review', 'needs_revision', 'approved', 'rejected'], {
    message: 'status must be under_review, needs_revision, approved, or rejected',
  })
  status!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reviewNotes?: string;

  @IsString()
  @IsOptional()
  curriculumId?: string; // Optional custom curriculum version assignment
}

export class SubmitRequirementDto {
  @IsEmail({}, { message: 'Please provide a valid application email address' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  definitionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName!: string;

  @IsIn(['application/pdf', 'image/jpeg', 'image/png'], {
    message: 'Only PDF, JPEG, or PNG requirement documents are accepted',
  })
  mimeType!: string;

  @IsString()
  @IsNotEmpty()
  contentBase64!: string;
}

export class ReviewAdmissionRequirementDto {
  @IsIn(['verified', 'rejected', 'resubmission_required'], {
    message: 'status must be verified, rejected, or resubmission_required',
  })
  status!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reviewNotes?: string;
}
