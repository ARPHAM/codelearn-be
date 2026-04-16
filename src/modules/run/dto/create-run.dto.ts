import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RunFileDto {
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateRunDto {
  @IsUUID()
  @IsOptional()
  problemVersionId?: string;

  @IsNumber()
  @IsNotEmpty()
  languageId: number;

  @IsString()
  @IsOptional()
  code?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RunFileDto)
  @IsOptional()
  files?: RunFileDto[];

  @IsString()
  @IsOptional()
  entryFile?: string;

  @IsString()
  @IsOptional()
  input?: string;
}
