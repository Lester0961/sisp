import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

const VALID_STATUSES = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] as const;

export class UpdateEventStatusDto {
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    return value;
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(VALID_STATUSES, {
    message: `"status" must be one of [${VALID_STATUSES.join(', ')}]`,
  })
  status: string;
}
