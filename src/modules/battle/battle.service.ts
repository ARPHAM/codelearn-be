import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { BattleSession } from './entities/battle-session.entity';
import { BattleGateway } from './battle.gateway';

@Injectable()
export class BattleService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BattleSession)
    private battleRepo: Repository<BattleSession>,
    private readonly battleGateway: BattleGateway,
  ) {}

  async getActiveBattles() {
    return this.battleRepo.find({
      where: [{ status: 'WAITING' }, { status: 'ACTIVE' }],
      relations: ['player1', 'player2'],
      order: { createdAt: 'DESC' },
    });
  }

  async challenge(
    dto: { opponentId: string; duration: number; topic: string },
    player1: User,
  ) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(dto.opponentId)) {
      throw new BadRequestException('ID đối thủ không hợp lệ (phải là UUID)');
    }
    const player2 = await this.userRepo.findOne({
      where: { id: dto.opponentId },
    });
    if (!player2) throw new NotFoundException('Đối thủ không tồn tại');

    const session = this.battleRepo.create({
      player1,
      player2,
      duration: dto.duration,
      status: 'WAITING',
    });

    const saved = await this.battleRepo.save(session);
    return saved;
  }

  async accept(id: string, player2: User) {
    const session = await this.battleRepo.findOne({
      where: { id, player2Id: player2.id, status: 'WAITING' },
    });

    if (!session)
      throw new NotFoundException(
        'Yêu cầu thách đấu không tồn tại hoặc đã hết hạn',
      );

    session.status = 'ACTIVE';
    session.startedAt = new Date();
    const saved = await this.battleRepo.save(session);

    // Thông báo qua socket
    this.battleGateway.broadcastMatchFound(session.id, {
      battleId: session.id,
      player1: session.player1Id,
      player2: session.player2Id,
    });

    this.battleGateway.broadcastBattleStarted(session.id, {
      battleId: session.id,
      startsAt: session.startedAt,
      duration: session.duration,
    });

    return saved;
  }

  async cancel(id: string, user: User) {
    const session = await this.battleRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Trận đấu không tồn tại');

    if (session.player1Id !== user.id && session.player2Id !== user.id) {
      throw new BadRequestException('Bạn không có quyền hủy trận đấu này');
    }

    session.status = 'CANCELLED';
    await this.battleRepo.save(session);

    this.battleGateway.broadcastBattleCancelled(
      id,
      'Người chơi đã hủy trận đấu',
    );
    return { success: true };
  }

  async updateProgress(battleId: string, userId: string, progress: number) {
    const session = await this.battleRepo.findOne({
      where: { id: battleId, status: 'ACTIVE' },
    });
    if (!session) return;

    if (session.player1Id === userId) {
      session.player1Progress = progress;
    } else if (session.player2Id === userId) {
      session.player2Progress = progress;
    }

    await this.battleRepo.save(session);

    // Phát tín hiệu real-time
    this.battleGateway.broadcastProgress(battleId, {
      userId,
      progress,
    });
  }

  async getResult(id: string) {
    const session = await this.battleRepo.findOne({
      where: { id },
      relations: ['player1', 'player2'],
    });
    if (!session) throw new NotFoundException('Trận đấu không tồn tại');

    return {
      id: session.id,
      status: session.status,
      player1: {
        name: session.player1.fullName,
        progress: session.player1Progress,
      },
      player2: {
        name: session.player2?.fullName,
        progress: session.player2Progress,
      },
      winner: session.winnerId,
      endedAt: session.endedAt,
    };
  }

  async getLeaderboard(query: any) {
    // Leadboard logic is now in LeaderboardModule, but keeping this for compatibility if needed
    return { rankings: [] };
  }
}
