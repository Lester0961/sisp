import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class UpdateRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(
    ['pending', 'under_review', 'approved', 'released', 'rejected'],
    {
      message:
        'Status must be one of: pending, under_review, approved, released, rejected',
    },
  )
  status: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}