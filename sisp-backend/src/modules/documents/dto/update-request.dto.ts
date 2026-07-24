import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UpdateRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['awaiting_payment', 'pending', 'under_review', 'approved', 'released', 'rejected'], {
    message: 'Status must be one of: awaiting_payment, pending, under_review, approved, released, rejected',
  })
  status: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
