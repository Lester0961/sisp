import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAcademicTermDto {
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsInt()
  @Min(1)
  @Max(3)
  termNumber: number;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsOptional()
  @IsString()
  startsOn?: string;

  @IsOptional()
  @IsString()
  endsOn?: string;

  @IsOptional()
  @IsIn(['planned', 'active', 'closed'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}

export class UpdateAcademicTermDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  startsOn?: string;

  @IsOptional()
  @IsString()
  endsOn?: string;

  @IsOptional()
  @IsIn(['planned', 'active', 'closed'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
