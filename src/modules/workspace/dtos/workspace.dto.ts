import { IsString, IsEnum, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';
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
}

export class UpdateUserWorkspaceDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateWorkspaceFileDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  content?: string;
}

export class UpdateWorkspaceFileDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}
