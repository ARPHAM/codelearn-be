import { IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListCoursesDto {
  @ApiPropertyOptional({ example: 'HK2-2025' })
  @IsOptional()
  @IsString()
  semester?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class EnrollDto {
  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  courseId: number;
}
