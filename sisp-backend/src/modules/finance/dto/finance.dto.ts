import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RecordTransactionDto {
  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Amount must be greater than zero' })
  amount: number;

  @IsString()
  @IsOptional()
  academicTermId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  referenceNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  proofUrl?: string;

  @IsISO8601()
  @IsOptional()
  paidAt?: string;
}

export class VerifyTransactionDto {
  @IsString()
  @IsIn(['verified', 'rejected'], { message: 'Decision must be verified or rejected' })
  decision: 'verified' | 'rejected';
}
