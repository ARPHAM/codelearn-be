import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Subject } from 'rxjs';
import { UserWorkspace } from './entities/user-workspace.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { RoomParticipant } from '../room/entities/room-participant.entity';
import { CreateUserWorkspaceDto, UpdateUserWorkspaceDto, CreateWorkspaceFileDto, UpdateWorkspaceFileDto } from './dtos/workspace.dto';

export enum WorkspaceEventType {
  FILE_CREATED = 'FILE_CREATED',
  FILE_DELETED = 'FILE_DELETED',
  FILE_UPDATED = 'FILE_UPDATED',
}

export interface WorkspaceEvent {
  type: WorkspaceEventType;
  workspaceId: string;
  userId: string;
  payload: any;
}

@Injectable()
export class WorkspaceService {
  public readonly fileEvents = new Subject<WorkspaceEvent>();

  constructor(
    @InjectRepository(UserWorkspace)
    private readonly workspaceRepo: Repository<UserWorkspace>,
    @InjectRepository(WorkspaceFile)
    private readonly fileRepo: Repository<WorkspaceFile>,
    @InjectRepository(RoomParticipant)
    private readonly participantRepo: Repository<RoomParticipant>,
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

  async findWorkspaceById(id: string, userId: string, allowRoomParticipant = false): Promise<UserWorkspace> {
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    
    // Check ownership
    if (workspace.userId === userId) {
      return workspace;
    }

    // Check room participation (allow viewing if in the same room)
    if (allowRoomParticipant) {
      const roomParticipation = await this.participantRepo.findOne({
        where: { workspaceId: id },
      });
      
      console.log(`[WorkspaceService] Checking room auth for user ${userId} on workspace ${id}`);
      console.log(`[WorkspaceService] Workspace room participant found:`, roomParticipation?.roomId);

      if (roomParticipation) {
        const requesterParticipation = await this.participantRepo.findOne({
          where: { roomId: roomParticipation.roomId, userId },
        });
        
        console.log(`[WorkspaceService] Requester room participant found:`, !!requesterParticipation);

        if (requesterParticipation) {
          return workspace;
        }
      }
    }

    console.log(`[WorkspaceService] Access DENIED for user ${userId} on workspace ${id}`);
    throw new ForbiddenException('You do not have access to this workspace');
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

  async deleteWorkspacesByRoomId(roomId: string): Promise<void> {
    const workspaces = await this.workspaceRepo.find({ where: { roomId } });
    for (const ws of workspaces) {
      await this.workspaceRepo.remove(ws);
    }
  }

  // File Operations
  async createFile(userId: string, dto: CreateWorkspaceFileDto): Promise<WorkspaceFile> {
    if (!dto.workspaceId) {
       throw new ConflictException('Workspace ID is required');
    }
    const workspace = await this.findWorkspaceById(dto.workspaceId, userId);
    
    // Check if file already exists
    const existing = await this.fileRepo.findOne({
      where: { workspaceId: dto.workspaceId, filePath: dto.filePath },
    });
    if (existing) {
      throw new ConflictException('File already exists at this path');
    }

    const file = this.fileRepo.create({
      workspaceId: dto.workspaceId,
      filePath: dto.filePath,
      content: dto.content || '',
      createdBy: userId,
    });
    const savedFile = await this.fileRepo.save(file);

    this.fileEvents.next({
      type: WorkspaceEventType.FILE_CREATED,
      workspaceId: dto.workspaceId,
      userId,
      payload: { filePath: savedFile.filePath, id: savedFile.id },
    });

    return savedFile;
  }

  async findFilesByWorkspace(workspaceId: string, userId: string): Promise<WorkspaceFile[]> {
    // Validate workspace ownership OR room participation for viewing
    await this.findWorkspaceById(workspaceId, userId, true);
    return this.fileRepo.find({ where: { workspaceId } });
  }

  async findFileById(id: string, userId: string, allowRoomParticipant = false): Promise<WorkspaceFile> {
    const file = await this.fileRepo.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const workspace = await this.findWorkspaceById(file.workspaceId, userId, allowRoomParticipant);
    file.workspace = workspace; // Attach for caller
    return file;
  }

  async updateFile(id: string, userId: string, dto: UpdateWorkspaceFileDto): Promise<WorkspaceFile> {
    const file = await this.findFileById(id, userId);
    file.content = dto.content;
    return this.fileRepo.save(file);
  }

  async deleteFile(id: string, userId: string): Promise<void> {
    const file = await this.findFileById(id, userId);
    const workspaceId = file.workspaceId;
    const filePath = file.filePath;
    
    await this.fileRepo.remove(file);

    this.fileEvents.next({
      type: WorkspaceEventType.FILE_DELETED,
      workspaceId,
      userId,
      payload: { filePath, id },
    });
  }

  async deleteFileByPath(userId: string, workspaceId: string, filePath: string): Promise<void> {
    // Validate workspace ownership
    await this.findWorkspaceById(workspaceId, userId);

    const file = await this.fileRepo.findOne({
      where: { workspaceId, filePath },
    });

    if (!file) {
      throw new NotFoundException(`File not found at path: ${filePath}`);
    }

    await this.fileRepo.remove(file);

    this.fileEvents.next({
      type: WorkspaceEventType.FILE_DELETED,
      workspaceId,
      userId,
      payload: { filePath, id: file.id },
    });
  }
}
