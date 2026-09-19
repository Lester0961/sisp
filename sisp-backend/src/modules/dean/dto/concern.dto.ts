import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConcernDto {
  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'Category must not exceed 100 characters' })
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000, { message: 'Summary must not exceed 2000 characters' })
  summary: string;
}

export class UpdateConcernDto {
  @IsString()
  @IsOptional()
  @IsIn(['open', 'in_review', 'resolved'], {
    message: 'Status must be one of: open, in_review, resolved',
  })
  status?: 'open' | 'in_review' | 'resolved';

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  resolution?: string;
}