import { IsString, IsOptional, IsInt, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string;

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
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  role?: string;
}
