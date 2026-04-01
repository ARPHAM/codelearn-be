import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { UserWorkspace } from './entities/user-workspace.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { CreateUserWorkspaceDto, UpdateUserWorkspaceDto, CreateWorkspaceFileDto, UpdateWorkspaceFileDto } from './dtos/workspace.dto';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(UserWorkspace)
    private readonly workspaceRepo: Repository<UserWorkspace>,
    @InjectRepository(WorkspaceFile)
    private readonly fileRepo: Repository<WorkspaceFile>,
  ) {}

  // Workspace Operations
  async createWorkspace(userId: string, dto: CreateUserWorkspaceDto, manager?: EntityManager): Promise<UserWorkspace> {
    const repo = manager ? manager.getRepository(UserWorkspace) : this.workspaceRepo;
    const workspace = repo.create({
      ...dto,
      userId,
    });
    return repo.save(workspace);
  }

  async findAllWorkspaces(userId: string): Promise<UserWorkspace[]> {
    return this.workspaceRepo.find({ where: { userId } });
  }

  async findWorkspaceById(id: string, userId: string): Promise<UserWorkspace> {
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    if (workspace.userId !== userId) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return workspace;
  }

  async updateWorkspace(id: string, userId: string, dto: UpdateUserWorkspaceDto): Promise<UserWorkspace> {
    const workspace = await this.findWorkspaceById(id, userId);
    Object.assign(workspace, dto);
    return this.workspaceRepo.save(workspace);
  }

  async deleteWorkspace(id: string, userId: string): Promise<void> {
    const workspace = await this.findWorkspaceById(id, userId);
    await this.workspaceRepo.remove(workspace);
  }

  // File Operations
  async createFile(userId: string, dto: CreateWorkspaceFileDto): Promise<WorkspaceFile> {
    // Validate workspace ownership
    await this.findWorkspaceById(dto.workspaceId, userId);

    // Check if file already exists
    const existing = await this.fileRepo.findOne({
      where: { workspaceId: dto.workspaceId, path: dto.path },
    });
    if (existing) {
      throw new ConflictException('File already exists at this path');
    }

    const file = this.fileRepo.create({
      ...dto,
      createdBy: userId,
      content: dto.content || '',
    });
    return this.fileRepo.save(file);
  }

  async findFilesByWorkspace(workspaceId: string, userId: string): Promise<WorkspaceFile[]> {
    // Validate workspace ownership
    await this.findWorkspaceById(workspaceId, userId);
    return this.fileRepo.find({ where: { workspaceId } });
  }

  async findFileById(id: string, userId: string): Promise<WorkspaceFile> {
    const file = await this.fileRepo.findOne({
      where: { id },
      relations: ['workspace'],
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.workspace.userId !== userId) {
      throw new ForbiddenException('You do not have access to this file');
    }

    return file;
  }

  async updateFile(id: string, userId: string, dto: UpdateWorkspaceFileDto): Promise<WorkspaceFile> {
    const file = await this.findFileById(id, userId);
    file.content = dto.content;
    return this.fileRepo.save(file);
  }

  async deleteFile(id: string, userId: string): Promise<void> {
    const file = await this.findFileById(id, userId);
    await this.fileRepo.remove(file);
  }
}
