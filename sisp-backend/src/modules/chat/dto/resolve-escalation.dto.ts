import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolveEscalationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  resolution: string;
}
