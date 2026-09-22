import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAdviserAssignmentDto {
  @IsUUID()
  adviserId: string;

  @IsUUID()
  studentId: string;

  @IsOptional()
  @IsUUID()
  academicTermId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  academicYear?: string;
}

export class UpdateAdviserAssignmentDto {
  @IsIn(['active', 'inactive'], {
    message: 'Status must be one of: active, inactive',
  })
  status: 'active' | 'inactive';
}
