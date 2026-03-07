import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubmissionDto {
  @ApiProperty({ example: 1 }) @IsNumber() exerciseId: number;
  @ApiProperty({ enum: ['python', 'cpp', 'java', 'js'] }) @IsString() language: string;
  @ApiProperty() @IsString() sourceCode: string;
}

export class UpdateScoreDto {
  @ApiProperty({ example: 85 }) @IsNumber() score: number;
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}

export class ListSubmissionsDto {
  @ApiPropertyOptional({ enum: ['all', 'pass', 'fail'] }) @IsString() @IsOptional() status?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() page?: number;
}
