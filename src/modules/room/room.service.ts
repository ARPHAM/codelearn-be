import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Room, RoomType } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { RoomSession } from './entities/room-session.entity';
import { CreateRoomDto, JoinRoomDto, UpdateRoomDto } from './dtos/room.dto';
import { WorkspaceService } from '../workspace/workspace.service';
import { RoomRuntimeStore } from './room-runtime.store';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomParticipant)
    private readonly participantRepo: Repository<RoomParticipant>,
    @InjectRepository(RoomSession)
    private readonly sessionRepo: Repository<RoomSession>,
    private readonly workspaceService: WorkspaceService,
    private readonly dataSource: DataSource,
    private readonly runtimeStore: RoomRuntimeStore,
  ) {}

  async createRoom(userId: string, dto: CreateRoomDto): Promise<Room> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const room = manager.create(Room, {
        ...dto,
        type: dto.type || RoomType.MEETING,
        createdBy: userId,
      });
      const savedRoom = await manager.save(Room, room);

      // Create a personal workspace for the creator explicitly for this room
      const workspace = await this.workspaceService.createWorkspace(
        userId,
        {
          name: `Workspace for ${savedRoom.name}`,
          roomId: savedRoom.id,
        },
        manager,
      );

      // Add creator as the first participant
      const participant = manager.create(RoomParticipant, {
        roomId: savedRoom.id,
        userId,
        workspaceId: workspace.id,
        role: 'HOST',
      });
      await manager.save(RoomParticipant, participant);

      return savedRoom;
    });
  }

  async findRoomById(id: string): Promise<Room> {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    return room;
  }

  async joinRoom(
    roomId: string,
    userId: string,
    dto: JoinRoomDto,
  ): Promise<RoomParticipant> {
    if (!dto.workspaceId) {
      // If no workspace provided, use the "ensureParticipant" logic to auto-create/find one
      return this.ensureParticipant(roomId, userId);
    }

    const room = await this.findRoomById(roomId);

    // Validate workspace ownership
    await this.workspaceService.findWorkspaceById(dto.workspaceId, userId);

    // Check if already in room
    const existing = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.room_id = :roomId', { roomId })
      .andWhere('participant.user_id = :userId', { userId })
      .getOne();
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
    const participant = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.room_id = :roomId', { roomId })
      .andWhere('participant.user_id = :userId', { userId })
      .getOne();
    if (!participant) {
      throw new NotFoundException('Participant not found in this room');
    }
    await this.participantRepo.remove(participant);
  }

  async getParticipants(roomId: string): Promise<RoomParticipant[]> {
    return this.participantRepo
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.user', 'user')
      .leftJoinAndSelect('participant.workspace', 'workspace')
      .where('participant.room_id = :roomId', { roomId })
      .getMany();
  }

  async isParticipant(roomId: string, userId: string): Promise<boolean> {
    const count = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.room_id = :roomId', { roomId })
      .andWhere('participant.user_id = :userId', { userId })
      .getCount();
    return count > 0;
  }

  async validateParticipantOrThrow(
    roomId: string,
    userId: string,
  ): Promise<RoomParticipant> {
    const participant = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.room_id = :roomId', { roomId })
      .andWhere('participant.user_id = :userId', { userId })
      .getOne();
    if (!participant) {
      throw new ForbiddenException('User is not a participant of this room');
    }
    return participant;
  }

  /**
   * Ensure user is a participant. If not, auto-add them as GUEST
   * with an auto-created workspace. Used by Socket join_room.
   */
  async ensureParticipant(
    roomId: string,
    userId: string,
  ): Promise<RoomParticipant> {
    // Check if already participant
    const existing = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.room_id = :roomId', { roomId })
      .andWhere('participant.user_id = :userId', { userId })
      .getOne();
    if (existing) return existing;

    // Validate room exists & check capacity
    const room = await this.findRoomById(roomId);
    const count = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.room_id = :roomId', { roomId })
      .getCount();
    if (count >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    // Reuse existing workspace if any, or create new
    let workspace = await this.workspaceService
      .findAllWorkspaces(userId)
      .then((wsList) =>
        wsList.find((ws) => ws.name === `Workspace for ${room.name}`),
      );

    if (!workspace) {
      workspace = await this.workspaceService.createWorkspace(userId, {
        name: `Workspace for ${room.name}`,
        roomId,
      });
    }

    const participant = this.participantRepo.create({
      roomId,
      userId,
      workspaceId: workspace.id,
      role: room.createdBy === userId ? 'HOST' : 'GUEST',
    });
    return this.participantRepo.save(participant);
  }

  async getRoomIdByWorkspace(workspaceId: string): Promise<string | null> {
    const participant = await this.participantRepo.findOne({
      where: { workspaceId },
      select: ['roomId'],
    });
    return participant?.roomId || null;
  }

  async findActiveSession(roomId: string): Promise<RoomSession | null> {
    return this.sessionRepo
      .createQueryBuilder('session')
      .where('session.room_id = :roomId', { roomId })
      .andWhere("session.status = 'ACTIVE'")
      .getOne();
  }

  async startSession(roomId: string): Promise<RoomSession> {
    const existing = await this.findActiveSession(roomId);
    if (existing) {
      if (!existing.hostId) {
        const host = await this.participantRepo
          .createQueryBuilder('participant')
          .where('participant.room_id = :roomId', { roomId })
          .andWhere('participant.role = :role', { role: 'HOST' })
          .getOne();
        if (host) {
          existing.hostId = host.userId;
          await this.sessionRepo.save(existing);
        }
      }
      return existing;
    }

    const host = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.room_id = :roomId', { roomId })
      .andWhere('participant.role = :role', { role: 'HOST' })
      .getOne();
    const session = this.sessionRepo.create({
      roomId,
      hostId: host?.userId,
      status: 'ACTIVE',
    });
    return this.sessionRepo.save(session);
  }

  async endSession(roomId: string): Promise<void> {
    const session = await this.findActiveSession(roomId);
    if (session) {
      session.status = 'ENDED';
      session.endedAt = new Date();
      await this.sessionRepo.save(session);
    }
    this.runtimeStore.clearClosing(roomId);
  }

  async getRoomSession(roomId: string, userId?: string) {
    const room = await this.findRoomById(roomId);

    let currentUserRole: string | null = null;
    if (userId) {
      const participant = await this.participantRepo
        .createQueryBuilder('participant')
        .where('participant.room_id = :roomId', { roomId })
        .andWhere('participant.user_id = :userId', { userId })
        .getOne();
      if (participant) {
        currentUserRole = participant.role;
      }
    }

    // Fetch latest session
    const session = await this.sessionRepo
      .createQueryBuilder('session')
      .where('session.room_id = :roomId', { roomId })
      .orderBy('session.started_at', 'DESC')
      .getOne();

    if (!session) {
      return {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
        },
        session: null,
        currentUserRole,
      };
    }

    let sessionStatus: 'ACTIVE' | 'CLOSING' | 'CLOSED' | null = null;
    let closingAt: number | undefined;
    let graceRemainingSeconds: number | undefined;

    if (session.status === 'ACTIVE') {
      closingAt = this.runtimeStore.getClosingAt(roomId);
      if (closingAt) {
        sessionStatus = 'CLOSING';
      } else {
        sessionStatus = 'ACTIVE';
      }
    } else if (session.status === 'ENDED' && session.endedAt) {
      // Check grace period (15 minutes)
      const gracePeriodMs = 15 * 60 * 1000;
      const endsAt = session.endedAt.getTime() + gracePeriodMs;
      const now = Date.now();

      if (now < endsAt) {
        sessionStatus = 'CLOSED';
        graceRemainingSeconds = Math.floor((endsAt - now) / 1000);
      }
    }

    return {
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
      },
      session: sessionStatus
        ? {
            id: session.id,
            status: sessionStatus,
            hostId: session.hostId,
            closingAt,
            endedAt: session.endedAt ? session.endedAt.getTime() : undefined,
            graceRemainingSeconds,
          }
        : null,
      currentUserRole,
    };
  }

  async getMyRooms(userId: string): Promise<Room[]> {
    return this.roomRepo.find({
      where: { createdBy: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateRoom(
    roomId: string,
    userId: string,
    dto: UpdateRoomDto,
  ): Promise<Room> {
    const room = await this.findRoomById(roomId);

    // Verify ownership
    if (room.createdBy !== userId) {
      throw new ForbiddenException(
        'Only the room creator can update the room settings',
      );
    }

    // Apply updates
    Object.assign(room, dto);
    return this.roomRepo.save(room);
  }

  async getRooms(): Promise<Room[]> {
    return this.roomRepo.find({
      order: { createdAt: 'DESC' },
    });
  }
}
