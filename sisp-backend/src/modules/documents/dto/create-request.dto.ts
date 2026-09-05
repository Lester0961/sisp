import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DOCUMENT_TYPE_CODES } from '../../../common/constants/document-catalog';

export class CreateRequestItemDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(DOCUMENT_TYPE_CODES, {
    message: 'Document type must be one of the active catalog types',
  })
  type: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;

  @IsString()
  @MaxLength(300)
  @IsOptional()
  remarks?: string;
}

export class CreateRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  items: CreateRequestItemDto[];

  @IsString()
  @MaxLength(500)
  @IsOptional()
  remarks?: string;
}
