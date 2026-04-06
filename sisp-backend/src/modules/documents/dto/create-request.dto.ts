import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(
    [
      'transcript_of_records',
      'certificate_of_enrollment',
      'certificate_of_good_moral',
      'diploma',
      'course_description',
      'authentication',
      'other',
    ],
    {
      message:
        'Document type must be one of the allowed types',
    },
  )
  type: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}