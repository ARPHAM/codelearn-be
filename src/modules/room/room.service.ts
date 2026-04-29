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
import { UserWorkspace } from '../workspace/entities/user-workspace.entity';

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
    @InjectRepository(UserWorkspace)
    private readonly workspaceRepo: Repository<UserWorkspace>,
    private readonly dataSource: DataSource,
    private readonly runtimeStore: RoomRuntimeStore,
  ) {}

  async createRoom(userId: string, dto: CreateRoomDto): Promise<Room> {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const room = manager.create(Room, {
        ...dto,
        type: dto.type || RoomType.MEETING,
        createdBy: userId,
        problemSlug: dto.problemSlug,
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
      .where('participant.roomId = :roomId', { roomId })
      .andWhere('participant.userId = :userId', { userId })
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
      status: 'PENDING',
    });

    return this.participantRepo.save(participant);
  }

  async leaveRoom(roomId: string, userId: string) {
    await this.participantRepo.delete({ roomId, userId });
  }

  async deleteRoom(roomId: string) {
    // 1. Delete all sessions related to this room
    await this.sessionRepo.delete({ roomId });
    // 2. Delete all participants
    await this.participantRepo.delete({ roomId });
    // 3. Delete the room
    await this.roomRepo.delete(roomId);
  }

  async getParticipants(roomId: string): Promise<RoomParticipant[]> {
    const participants = await this.participantRepo
      .createQueryBuilder('participant')
      .leftJoinAndSelect('participant.user', 'user')
      .leftJoinAndSelect('participant.workspace', 'workspace')
      .where('participant.roomId = :roomId', { roomId })
      .getMany();
    
    console.log(`[RoomService] Fetched ${participants.length} participants for room ${roomId}:`, 
      participants.map(p => ({ userId: p.userId, status: p.status, role: p.role }))
    );
    return participants;
  }

  async isParticipant(roomId: string, userId: string): Promise<boolean> {
    const count = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.roomId = :roomId', { roomId })
      .andWhere('participant.userId = :userId', { userId })
      .getCount();
    return count > 0;
  }

  async getParticipant(
    roomId: string,
    userId: string,
  ): Promise<RoomParticipant | null> {
    return this.participantRepo.findOne({ where: { roomId, userId } });
  }

  async validateParticipantOrThrow(
    roomId: string,
    userId: string,
  ): Promise<RoomParticipant> {
    const participant = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.roomId = :roomId', { roomId })
      .andWhere('participant.userId = :userId', { userId })
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
      .where('participant.roomId = :roomId', { roomId })
      .andWhere('participant.userId = :userId', { userId })
      .getOne();
    if (existing) return existing;

    // Validate room exists & check capacity
    const room = await this.findRoomById(roomId);
    const count = await this.participantRepo
      .createQueryBuilder('participant')
      .where('participant.roomId = :roomId', { roomId })
      .getCount();
    if (count >= room.maxParticipants) {
      throw new BadRequestException('Room is full');
    }

    // Find OR create a personal workspace for this user in this room
    let workspace = await this.workspaceRepo.findOne({
      where: { roomId, userId }
    });

    if (!workspace) {
      workspace = await this.workspaceService.createWorkspace(userId, {
        name: `Workspace for ${userId} in ${room.name}`,
        roomId,
      });
    }

    const isHost = room.createdBy === userId;
    const participant = this.participantRepo.create({
      roomId,
      userId,
      workspaceId: workspace.id,
      role: isHost ? 'HOST' : 'GUEST',
      status: isHost ? 'JOINED' : 'PENDING',
    });
    return this.participantRepo.save(participant);
  }

  async approveParticipant(roomId: string, userId: string) {
    const participant = await this.participantRepo.findOne({
      where: { roomId, userId },
    });
    if (!participant) return;

    participant.status = 'JOINED';
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
      .where('session.roomId = :roomId', { roomId })
      .andWhere("session.status = 'ACTIVE'")
      .getOne();
  }

  async startSession(roomId: string): Promise<RoomSession> {
    const existing = await this.findActiveSession(roomId);
    if (existing) {
      if (!existing.hostId) {
        const host = await this.participantRepo
          .createQueryBuilder('participant')
          .where('participant.roomId = :roomId', { roomId })
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
      .where('participant.roomId = :roomId', { roomId })
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
    let currentUserStatus: string | null = null;
    if (userId) {
      const participant = await this.participantRepo.findOne({
        where: { roomId, userId },
      });
      if (participant) {
        currentUserRole = participant.role;
        currentUserStatus = participant.status;
      }
    }

    // Fetch latest session
    const session = await this.sessionRepo.findOne({
      where: { roomId },
      order: { startedAt: 'DESC' },
    });

    if (!session) {
      return {
        room,
        session: null,
        currentUserRole,
        currentUserStatus,
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
      room,
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
      currentUserStatus,
    };
  }

  async getMyRooms(userId: string): Promise<Room[]> {
    const rooms = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.creator', 'creator')
      .loadRelationCountAndMap('room.participantsCount', 'room.participants')
      .where('room.createdBy = :userId', { userId })
      .orderBy('room.createdAt', 'DESC')
      .getMany();

    return rooms.map((r) => ({
      ...r,
      createdBy: r.creator,
    })) as any;
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
    const rooms = await this.roomRepo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.creator', 'creator')
      .loadRelationCountAndMap('room.participantsCount', 'room.participants')
      .orderBy('room.createdAt', 'DESC')
      .getMany();

    return rooms.map((r) => ({
      ...r,
      createdBy: r.creator,
    })) as any;
  }

  async updateRoomProblem(roomId: string, problemSlug: string): Promise<void> {
    await this.roomRepo.update(roomId, { problemSlug });
  }
}
