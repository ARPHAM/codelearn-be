import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CodeFileDto {
  @ApiProperty({ example: 'main.py' })
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  content: string;
}

export class CreateSubmissionDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  problemVersionId: string;

  @ApiProperty({
    enum: [
      'python',
      'cpp',
      'java',
      'javascript',
      'typescript',
      'csharp',
      'go',
      'rust',
      'php',
      'ruby',
      'sql'
    ]
  })
  @IsString()
  language: string;

  @ApiProperty({ example: 'main.py' })
  @IsString()
  mainFile: string;

  @ApiProperty({ type: [CodeFileDto] })
  @IsArray()
  files: CodeFileDto[];
}

export class UpdateScoreDto {
  @ApiProperty({ example: 85 }) @IsNumber() score: number;
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}

export class ListSubmissionsDto {
  @ApiPropertyOptional({ enum: ['all', 'pass', 'fail'] }) @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() page?: number;
}
