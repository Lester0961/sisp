import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MinLength,
  MaxLength,
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
  @IsIn(['student', 'faculty', 'dean', 'admin_staff'], {
    message: 'roleName must be one of: student, faculty, dean, admin_staff',
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
  temporaryPassword?: string;
}
