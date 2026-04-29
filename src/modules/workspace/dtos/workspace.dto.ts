import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WorkspaceSource } from '../entities/user-workspace.entity';

export class CreateUserWorkspaceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: WorkspaceSource })
  @IsEnum(WorkspaceSource)
  @IsOptional()
  source?: WorkspaceSource;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  roomId?: string;
}

export class UpdateUserWorkspaceDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateWorkspaceFileDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  content?: string;
}

export class UpdateWorkspaceFileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  filePath?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  content?: string;
}
