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
  @IsIn(['faculty', 'dean', 'registrar', 'treasury', 'sys_admin'], {
    message:
      'roleName must be one of: faculty, dean, registrar, treasury, sys_admin (student accounts are created through admission and activation)',
  })
  roleName: string;

  // Student specific inputs (accepted for compatibility; staff creation only)
  @IsString()
  @IsOptional()
  studentNumber?: string;

  @IsString()
  @IsOptional()
  programId?: string;

}
