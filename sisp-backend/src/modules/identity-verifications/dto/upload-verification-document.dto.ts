import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UploadVerificationDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  documentType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName: string;

  @IsIn(['application/pdf', 'image/jpeg', 'image/png'])
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  contentBase64: string;
}
