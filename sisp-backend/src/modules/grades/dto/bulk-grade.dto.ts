import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  ArrayMaxSize,
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
  @ArrayMaxSize(500, { message: 'Bulk grade payload must not exceed 500 entries' })
  @ValidateNested({ each: true })
  @Type(() => BulkGradeItemDto)
  grades: BulkGradeItemDto[];
}
