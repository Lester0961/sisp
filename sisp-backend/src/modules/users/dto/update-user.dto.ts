import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @IsIn(
    ['student', 'faculty', 'dean', 'registrar', 'treasury', 'sys_admin'],
    {
      message:
        'roleName must be one of: student, faculty, dean, registrar, treasury, sys_admin',
    },
  )
  roleName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
