import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReassignChatSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assigneeId: string;
}
