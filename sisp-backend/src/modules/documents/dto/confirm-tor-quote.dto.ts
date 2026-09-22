import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ConfirmTorQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(19994)
  pageCount!: number;
}
