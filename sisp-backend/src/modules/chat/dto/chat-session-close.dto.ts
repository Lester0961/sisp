import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatSessionCloseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  resolution: string;
}
