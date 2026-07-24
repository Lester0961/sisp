import { IsNumber, IsOptional, IsBoolean, Min, Max } from 'class-validator';

export class UpdateGradeDto {
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
