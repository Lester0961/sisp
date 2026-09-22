import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewIdentityVerificationDto {
  @IsIn(['under_review', 'approved', 'rejected', 'needs_info'])
  decision: 'under_review' | 'approved' | 'rejected' | 'needs_info';

  @IsString()
  @IsOptional()
  @MaxLength(500)
  remarks?: string;

  @IsString()
  @IsOptional()
  matchedStudentProfileId?: string | null;
}
