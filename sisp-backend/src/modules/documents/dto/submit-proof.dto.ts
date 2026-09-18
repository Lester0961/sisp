import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubmitProofDto {
  @IsString()
  @IsIn(['gcash', 'pnb'])
  channel!: 'gcash' | 'pnb';

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  reference!: string;
}
