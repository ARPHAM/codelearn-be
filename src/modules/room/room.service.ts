import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { CreateRoomDto, JoinRoomDto } from './dtos/room.dto';
import { WorkspaceService } from '../workspace/workspace.service';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomParticipant)
    private readonly participantRepo: Repository<RoomParticipant>,
    private readonly workspaceService: WorkspaceService,
  ) {}

  async createRoom(userId: string, dto: CreateRoomDto): Promise<Room> {
    const room = this.roomRepo.create({
      ...dto,
      createdBy: userId,
    });
    return this.roomRepo.save(room);
  }

  async findRoomById(id: string): Promise<Room> {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async joinRoom(roomId: string, userId: string, dto: JoinRoomDto): Promise<RoomParticipant> {
    const room = await this.findRoomById(roomId);

    // Validate workspace ownership
    await this.workspaceService.findWorkspaceById(dto.workspaceId, userId);

    // Check if already in room
    const existing = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    if (existing) {
      throw new BadRequestException('User already in room');
    }

    // Check capacity
    const count = await this.participantRepo.count({ where: { roomId } });
    if (count >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    const participant = this.participantRepo.create({
      roomId,
      userId,
      workspaceId: dto.workspaceId,
      role: dto.role || 'GUEST',
    });

    return this.participantRepo.save(participant);
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const participant = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found in this room');
    }
    await this.participantRepo.remove(participant);
  }

  async getParticipants(roomId: string): Promise<RoomParticipant[]> {
    return this.participantRepo.find({
      where: { roomId },
      relations: ['user', 'workspace'],
    });
  }
}
