import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import {
  CreateUserWorkspaceDto,
  UpdateUserWorkspaceDto,
  CreateWorkspaceFileDto,
  UpdateWorkspaceFileDto,
} from './dtos/workspace.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // Workspace Endpoints
  @Post('workspaces')
  @ApiOperation({ summary: 'Create a new user workspace' })
  createWorkspace(
    @CurrentUser() user: User,
    @Body() dto: CreateUserWorkspaceDto,
  ) {
    return this.workspaceService.createWorkspace(user.id, dto);
  }

  @Get('workspaces')
  @ApiOperation({ summary: 'List all workspaces of the user' })
  findAllWorkspaces(@CurrentUser() user: User) {
    return this.workspaceService.findAllWorkspaces(user.id);
  }

  @Get('workspaces/:id')
  @ApiOperation({ summary: 'Get workspace details' })
  findWorkspaceById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.workspaceService.findWorkspaceById(id, user.id);
  }

  @Patch('workspaces/:id')
  @ApiOperation({ summary: 'Update workspace' })
  updateWorkspace(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateUserWorkspaceDto,
  ) {
    return this.workspaceService.updateWorkspace(id, user.id, dto);
  }

  @Delete('workspaces/:id')
  @ApiOperation({ summary: 'Delete workspace' })
  deleteWorkspace(@Param('id') id: string, @CurrentUser() user: User) {
    return this.workspaceService.deleteWorkspace(id, user.id);
  }

  // File Endpoints
  @Get('workspaces/:id/files')
  @ApiOperation({ summary: 'Get file list for a workspace' })
  findFilesByWorkspace(
    @Param('id') workspaceId: string,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.findFilesByWorkspace(workspaceId, user.id);
  }

  @Get('files/:id')
  @ApiOperation({ summary: 'Get specific file details' })
  findFileById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.workspaceService.findFileById(id, user.id, true);
  }

  @Post('workspaces/:workspaceId/files')
  @ApiOperation({ summary: 'Create a new file in a workspace' })
  createFileInWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateWorkspaceFileDto,
  ) {
    // Override workspaceId from body if provided in param
    dto.workspaceId = workspaceId;
    return this.workspaceService.createFile(user.id, dto);
  }

  @Post('files')
  @ApiOperation({ summary: 'Create a new file in a workspace (Legacy)' })
  createFile(@CurrentUser() user: User, @Body() dto: CreateWorkspaceFileDto) {
    return this.workspaceService.createFile(user.id, dto);
  }

  @Patch('files/:id')
  @ApiOperation({ summary: 'Save file content (Manual save)' })
  updateFile(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateWorkspaceFileDto,
  ) {
    return this.workspaceService.updateFile(id, user.id, dto);
  }

  @Delete('workspaces/:workspaceId/files/*path')
  @ApiOperation({ summary: 'Delete a file by path' })
  deleteFileByPath(
    @Param('workspaceId') workspaceId: string,
    @Param('path') filePath: string,
    @CurrentUser() user: User,
  ) {
    return this.workspaceService.deleteFileByPath(
      user.id,
      workspaceId,
      filePath,
    );
  }

  @Delete('files/:id')
  @ApiOperation({ summary: 'Delete file by ID (Legacy)' })
  deleteFile(@Param('id') id: string, @CurrentUser() user: User) {
    return this.workspaceService.deleteFile(id, user.id);
  }
}
