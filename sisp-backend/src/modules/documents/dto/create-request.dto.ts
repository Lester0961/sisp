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
  type: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  pageCount?: number;

  @IsString()
  @MaxLength(300)
  @IsOptional()
  remarks?: string;
}

export class CreateRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => CreateRequestItemDto)
  items: CreateRequestItemDto[];

  @IsString()
  @MaxLength(500)
  @IsOptional()
  remarks?: string;

  @IsOptional()
  isThirdParty?: boolean;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  authorizationNotes?: string;
}

