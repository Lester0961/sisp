import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @IsIn(['student', 'faculty', 'admin_staff', 'dean', 'live_agent'], {
    message: 'roleName must be one of: student, faculty, admin_staff, dean, live_agent',
  })
  roleName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
