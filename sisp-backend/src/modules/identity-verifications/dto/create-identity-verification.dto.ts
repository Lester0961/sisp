import { IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateIdentityVerificationDto {
  @IsIn(['returning', 'alumni'])
  verificationType: 'returning' | 'alumni';

  @IsEmail({}, { message: 'Please provide a valid email address' })
  applicantEmail: string;

  @IsString()
  @IsOptional()
  @MaxLength(32)
  claimedStudentNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  claimedFirstName: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  claimedMiddleName?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  claimedLastName: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  previousName?: string;

  @IsDateString({}, { message: 'dateOfBirth must be a valid ISO date' })
  @IsOptional()
  dateOfBirth?: string;
}
