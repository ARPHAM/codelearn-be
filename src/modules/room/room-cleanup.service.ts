import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomGateway } from './room.gateway';
import { RoomService } from './room.service';
import { Room } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { RoomSession } from './entities/room-session.entity';
import { WorkspaceService } from '../workspace/workspace.service';

@Injectable()
export class RoomCleanupService implements OnModuleInit {
  private readonly logger = new Logger(RoomCleanupService.name);
  private readonly bootTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly roomService: RoomService,
    private readonly roomGateway: RoomGateway,
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(RoomParticipant)
    private readonly participantRepo: Repository<RoomParticipant>,
    @InjectRepository(RoomSession)
    private readonly sessionRepo: Repository<RoomSession>,
    private readonly workspaceService: WorkspaceService,
  ) {}

  onModuleInit() {
    const minutes = this.configService.get<number>(
      'ROOM_CLEANUP_INTERVAL_MINUTES',
      10,
    );
    this.logger.log(`Room cleanup scheduled every ${minutes} minutes.`);

    // Initial cleanup after startup to handle users from previous session
    // REMOVED: Too aggressive, wipes participants before they reconnect
    // setTimeout(() => this.handleCleanup(), 5000);

    setInterval(() => this.handleCleanup(), minutes * 60 * 1000);
  }

  async handleCleanup() {
    this.logger.log('Starting periodic room cleanup...');
    const now = Date.now();
    const gracePeriodMs = this.configService.get<number>(
      'ROOM_CLEANUP_GRACE_PERIOD_MS',
      5 * 60 * 1000,
    ); // 5 minutes default

    // CRITICAL: If the server just started, don't clean up anything yet.
    if (now - this.bootTime < gracePeriodMs) {
      this.logger.log('Cleanup skipped: within post-boot grace period.');
      return;
    }

    try {
      // 1. Clean up "phantom" participants (those in DB but not connected via WebSocket)
      const participants = await this.participantRepo.find();
      let removedParticipantsCount = 0;

      for (const p of participants) {
        const state = this.roomGateway.roomState.get(p.roomId);
        const isConnected = state?.users.has(p.userId);

        if (!isConnected) {
          // Clean up workspace before deleting participant
          if (p.workspaceId) {
            try {
              await this.workspaceService.deleteWorkspace(
                p.workspaceId,
                p.userId,
              );
            } catch (e) {
              // Ignore if workspace already gone
            }
          }

          // Since RoomGateway now deletes participants on disconnect,
          // any participants left in DB are truly phantoms.
          await this.participantRepo.delete({
            roomId: p.roomId,
            userId: p.userId,
          });
          removedParticipantsCount++;
        }
      }

      if (removedParticipantsCount > 0) {
        this.logger.log(
          `Cleaned up ${removedParticipantsCount} phantom participants.`,
        );
      }

      // 2. Clear out ENDED sessions
      const endedSessions = await this.sessionRepo.find({
        where: { status: 'ENDED' },
      });
      let deletedSessionsCount = 0;
      for (const session of endedSessions) {
        await this.sessionRepo.delete(session.id);
        deletedSessionsCount++;
      }

      if (deletedSessionsCount > 0) {
        this.logger.log(`Deleted ${deletedSessionsCount} historical sessions.`);
      }

      // 3. Close sessions and delete Rooms with no active participants
      const activeSessions = await this.sessionRepo.find({
        where: { status: 'ACTIVE' },
      });
      for (const session of activeSessions) {
        const state = this.roomGateway.roomState.get(session.roomId);
        if (!state || state.users.size === 0) {
          await this.roomService.endSession(session.roomId);
        }
      }

      // 4. Force delete empty rooms (no participants and no active sessions)
      // This is what makes the DB "spotless"
      const rooms = await this.roomRepo.find();
      let deletedRoomsCount = 0;

      for (const room of rooms) {
        const pCount = await this.participantRepo.count({
          where: { roomId: room.id },
        });
        const sCount = await this.sessionRepo.count({
          where: { roomId: room.id, status: 'ACTIVE' },
        });

        if (pCount === 0 && sCount === 0) {
          // Final sweep of any workspaces specifically for this room
          await this.workspaceService.deleteWorkspacesByRoomId(room.id);

          await this.roomRepo.delete(room.id);
          deletedRoomsCount++;
        }
      }

      if (deletedRoomsCount > 0) {
        this.logger.log(`Deleted ${deletedRoomsCount} empty rooms.`);
      }
    } catch (error) {
      this.logger.error('Error during room cleanup:', error.stack);
    }
  }
}
