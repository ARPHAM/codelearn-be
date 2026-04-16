import {
  IsString,
  IsEnum,
  IsArray,
  IsNumber,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Difficulty } from '../../../common/enums/difficulty.enum';

export class TestCaseDto {
  @ApiProperty() @IsString() input: string;
  @ApiProperty() @IsString() output: string;
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  hidden?: boolean;
}

export class CreateExerciseDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiProperty({ enum: Difficulty }) @IsEnum(Difficulty) difficulty: Difficulty;
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  tags?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  languages?: string[];
  @ApiPropertyOptional() @IsNumber() @IsOptional() score?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() courseId?: string;
  @ApiPropertyOptional({ type: [TestCaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  @IsOptional()
  testCases?: TestCaseDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  hints?: string[];
}

export class UpdateExerciseDto {
  @ApiPropertyOptional() @IsString() @IsOptional() title?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional({ type: [TestCaseDto] })
  @IsArray()
  @IsOptional()
  testCases?: TestCaseDto[];
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  hints?: string[];
}

export class ListExercisesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => String)
  @IsString()
  courseId?: string;
  @ApiPropertyOptional({ enum: Difficulty })
  @IsEnum(Difficulty)
  @IsOptional()
  difficulty?: Difficulty;
  @ApiPropertyOptional() @IsString() @IsOptional() tag?: string;
}
