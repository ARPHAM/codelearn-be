import { IsNumber, IsString, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BroadcastDto {
  @ApiProperty() @IsNumber() courseId: number;
  @ApiProperty({ enum: ['all', 'stuck'] }) @IsEnum(['all', 'stuck']) target: string;
  @ApiProperty() @IsString() message: string;
  @ApiProperty({ type: [String] }) @IsArray() channels: string[];
}
