import { IsString, IsNotEmpty, IsOptional, IsArray, IsIn, IsUUID, MaxLength } from 'class-validator';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['student', 'faculty', 'dean', 'registrar', 'treasury', 'live_agent', 'all'])
  targetRole?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  userIds?: string[];
}
