import { IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CheckPlagiarismDto {
  @ApiPropertyOptional({ default: 40 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  threshold?: number;
}

export class FlagPairDto {
  @ApiProperty() @IsNumber() submissionAId: number;
  @ApiProperty() @IsNumber() submissionBId: number;
  @ApiProperty({ enum: ['warn', 'deduct', 'zero'] })
  @IsEnum(['warn', 'deduct', 'zero'])
  action: string;
  @ApiProperty() @IsString() reason: string;
}
