import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateStudentProfileDto {
  @IsString()
  @IsNotEmpty()
  studentNumber: string;

  @IsString()
  @IsNotEmpty()
  programCode: string;

  @IsInt()
  @Min(1)
  @Max(5)
  yearLevel: number;
}