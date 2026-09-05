import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatSessionMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
