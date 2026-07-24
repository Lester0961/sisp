import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsIn(['student', 'faculty', 'dean', 'admin_staff', 'live_agent'], {
    message: 'roleName must be one of: student, faculty, dean, admin_staff, live_agent',
  })
  @IsNotEmpty()
  roleName: string;

  // Student specific inputs
  @IsString()
  @IsOptional()
  studentNumber?: string;

  @IsString()
  @IsOptional()
  programId?: string;

  // Staff specific input
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Temporary password must be at least 8 characters' })
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Temporary password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  temporaryPassword?: string;
}
