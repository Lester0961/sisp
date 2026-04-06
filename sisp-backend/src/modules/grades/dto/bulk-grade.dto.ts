import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkGradeItemDto {
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
}

export class BulkGradeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkGradeItemDto)
  grades: BulkGradeItemDto[];
}