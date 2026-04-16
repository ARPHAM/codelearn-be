import { IsNumber, IsString, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BroadcastDto {
  @ApiProperty() @IsString() courseId: string;
  @ApiProperty({ enum: ['all', 'stuck'] })
  @IsEnum(['all', 'stuck'])
  target: string;
  @ApiProperty() @IsString() message: string;
  @ApiProperty({ type: [String] }) @IsArray() channels: string[];
}
