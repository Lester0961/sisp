import { IsNotEmpty, IsString } from 'class-validator';

export class AssignInstructorDto {
  @IsString()
  @IsNotEmpty()
  instructorId: string;
}
