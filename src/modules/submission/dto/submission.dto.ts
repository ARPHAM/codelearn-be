import { IsString, IsNumber, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CodeFileDto {
  @ApiProperty({ example: 'main.py' })
  @IsString()
  filePath: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;
}

export class CreateSubmissionDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  problemVersionId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  languageId: number;

  @ApiProperty({ example: 'main.py' })
  @IsString()
  entryFile: string;

  @ApiProperty({ type: [CodeFileDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodeFileDto)
  files: CodeFileDto[];

  @ApiPropertyOptional({ example: 'uuid-battle-here' })
  @IsString()
  @IsOptional()
  battleId?: string;

  @ApiPropertyOptional({ example: 'uuid-exam-here' })
  @IsString()
  @IsOptional()
  examId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  answers?: Record<string, string[]>;
}

export class UpdateScoreDto {
  @ApiProperty({ example: 85 }) @IsNumber() score: number;
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}

export class ListSubmissionsDto {
  @ApiPropertyOptional({ enum: ['all', 'pass', 'fail'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
