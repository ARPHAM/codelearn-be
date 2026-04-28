import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  ValidateNested,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TestCaseDto {
  @ApiProperty()
  @IsString()
  input: string;

  @ApiProperty()
  @IsString()
  expectedOutput: string;

  @ApiProperty()
  @IsNumber()
  score: number;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isHidden?: boolean;

  @ApiProperty()
  @IsNumber()
  order: number;
}

export class ProblemFileDto {
  @ApiProperty()
  @IsString()
  path: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  languageId?: number;

  @ApiProperty({ example: 'NEUTRAL' })
  @IsString()
  @IsOptional()
  type?: string; // TEMPLATE | SOLUTION | NEUTRAL | HIDDEN

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isReadonly?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isEntryFile?: boolean;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isFillInTheBlank?: boolean;
}

export class CreateProblemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiProperty()
  @IsString()
  difficulty: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  visibility: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  source?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty()
  @IsNotEmpty()
  description: any;

  @ApiProperty()
  @IsOptional()
  workspaceConfig?: any;

  @ApiProperty()
  @IsString()
  @IsOptional()
  entryFile?: string;

  @ApiProperty({ default: 5000 })
  @IsNumber()
  @IsOptional()
  timeLimit?: number;

  @ApiProperty({ default: 256 })
  @IsNumber()
  @IsOptional()
  memoryLimit?: number;

  @ApiProperty({ type: [TestCaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testcases: TestCaseDto[];

  @ApiProperty({ type: [ProblemFileDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProblemFileDto)
  problemFiles?: ProblemFileDto[];
}
