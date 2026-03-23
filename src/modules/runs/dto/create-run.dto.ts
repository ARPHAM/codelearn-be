import { IsString, IsOptional, IsUUID, IsNumber, IsNotEmpty } from 'class-validator';

export class CreateRunDto {
  @IsUUID()
  @IsNotEmpty()
  problemVersionId: string;

  @IsNumber()
  @IsNotEmpty()
  languageId: number;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  input?: string;
}
