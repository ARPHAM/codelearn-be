import { IsString, IsOptional, IsInt, IsNotEmpty, MaxLength, IsEnum, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { RoomType } from '../entities/room.entity';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({ enum: RoomType, required: false })
  @IsEnum(RoomType)
  @IsOptional()
  type?: RoomType;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  problemId?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  maxParticipants?: number;
}

export class JoinRoomDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  role?: string;
}
