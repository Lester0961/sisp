import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  prelim?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  midterm?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  finals?: number;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;
}