import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ProblemFilterType {
  ALL = 'ALL',
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  ME = 'ME',
}

export class FilterProblemDto {
  @ApiPropertyOptional({
    enum: ProblemFilterType,
    default: ProblemFilterType.ALL,
  })
  @IsEnum(ProblemFilterType)
  @IsOptional()
  filter?: ProblemFilterType = ProblemFilterType.ALL;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  difficulty?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  courseId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  authorId?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
