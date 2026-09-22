import { IsNotEmpty, IsString } from 'class-validator';

export class MfaResendDto {
  @IsString()
  @IsNotEmpty()
  challengeId: string;
}
