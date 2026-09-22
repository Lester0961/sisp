import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReassignChatSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assigneeId: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
