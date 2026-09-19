import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
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
  @IsIn(
    ['student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin', 'live_agent'],
    {
      message:
        'roleName must be one of: student, faculty, dean, registrar, treasury, sys_admin, live_agent',
    },
  )
  roleName: string;

  // Student specific inputs
  @IsString()
  @IsOptional()
  studentNumber?: string;

  @IsString()
  @IsOptional()
  programId?: string;

}
