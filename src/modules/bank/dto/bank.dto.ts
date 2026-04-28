import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBankDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddBankItemDto {
  @ApiProperty()
  @IsNotEmpty()
  problemId: number;

  @ApiProperty({ example: 'EASY' })
  @IsString()
  @IsOptional()
  difficulty?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  score?: number;
}
