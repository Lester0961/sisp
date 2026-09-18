import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  MinLength,
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
  @IsIn(['student', 'faculty', 'dean', 'admin_staff', 'live_agent', 'sys_admin'], {
    message: 'roleName must be one of: student, faculty, dean, admin_staff, live_agent, sys_admin',
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
  @MinLength(6, { message: 'Temporary password must be at least 6 characters' })
  temporaryPassword?: string;
}
