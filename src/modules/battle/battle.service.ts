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
import { PresenceService, UserStatus } from '../user/presence.service';
import { ProblemService } from '../problem/problem.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/entities/notification.entity';

@Injectable()
export class BattleService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(BattleSession)
    private battleRepo: Repository<BattleSession>,
    private readonly battleGateway: BattleGateway,
    private readonly presenceService: PresenceService,
    private readonly problemService: ProblemService,
    private readonly notificationService: NotificationService,
  ) {}

  private battleTimers: Map<string, any> = new Map();

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

    // Kiểm tra trạng thái đối thủ
    const status = await this.presenceService.getStatus(player2.id);
    if (status === UserStatus.OFFLINE) {
      throw new BadRequestException('Đối thủ hiện không trực tuyến');
    }
    if (status === UserStatus.BUSY) {
      throw new BadRequestException('Đối thủ đang bận thi đấu hoặc trong kỳ thi');
    }

    const session = this.battleRepo.create({
      player1,
      player2,
      duration: dto.duration,
      status: 'WAITING',
    });

    const saved = await this.battleRepo.save(session);

    // Gửi thông báo đến đối thủ
    await this.notificationService.create({
      userId: player2.id,
      title: 'Lời mời thách đấu',
      message: `${player1.fullName} đã thách đấu bạn một trận Ranked 1v1!`,
      type: NotificationType.BATTLE,
      metadata: {
        battleId: saved.id,
        challengerName: player1.fullName,
      },
    });

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

    // Chọn bài tập ngẫu nhiên
    const problem = await this.problemService.getRandomProblem();
    session.problemId = problem.id;

    const saved = await this.battleRepo.save(session);

    // Đặt trạng thái cả 2 thành BUSY
    await this.presenceService.updateStatus(session.player1Id, UserStatus.BUSY);
    await this.presenceService.updateStatus(session.player2Id, UserStatus.BUSY);

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
      problemSlug: problem.slug,
      player1: session.player1Id,
      player2: session.player2Id,
    });

    // Bắt đầu đếm ngược thời gian thực
    this.startBattleTimer(saved.id, saved.duration);

    return saved;
  }

  private startBattleTimer(battleId: string, duration: number) {
    if (this.battleTimers.has(battleId)) {
      clearInterval(this.battleTimers.get(battleId));
    }

    const timerId = setInterval(async () => {
      const session = await this.battleRepo.findOne({ where: { id: battleId } });
      if (!session || session.status !== 'ACTIVE') {
        clearInterval(timerId);
        this.battleTimers.delete(battleId);
        return;
      }

      const elapsed = Math.floor(
        (new Date().getTime() - session.startedAt.getTime()) / 1000,
      );
      const remaining = duration - elapsed;

      if (remaining <= 0) {
        clearInterval(timerId);
        this.battleTimers.delete(battleId);
        await this.finishBattle(battleId, null); // Timeout -> Hòa hoặc xử thua tùy logic
      } else {
        this.battleGateway.broadcastTimerUpdate(battleId, remaining);
      }
    }, 1000);

    this.battleTimers.set(battleId, timerId);
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
    
    // Xóa timer nếu có
    if (this.battleTimers.has(id)) {
      clearInterval(this.battleTimers.get(id));
      this.battleTimers.delete(id);
    }

    return { success: true };
  }

  async surrender(battleId: string, userId: string) {
    const session = await this.battleRepo.findOne({
      where: { id: battleId, status: 'ACTIVE' },
    });
    if (!session) throw new NotFoundException('Trận đấu không tồn tại');

    const winnerId =
      session.player1Id === userId ? session.player2Id : session.player1Id;
    await this.finishBattle(battleId, winnerId);
    
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

    // Nếu đạt 100% thì kết thúc trận đấu
    if (progress >= 100) {
      await this.finishBattle(battleId, userId);
    }
  }

  async finishBattle(battleId: string, winnerId: string | null) {
    const session = await this.battleRepo.findOne({
      where: { id: battleId },
      relations: ['player1', 'player2'],
    });
    if (!session || session.status !== 'ACTIVE') return;

    session.status = 'ENDED';
    session.winnerId = winnerId;
    session.endedAt = new Date();
    await this.battleRepo.save(session);

    // Xóa timer
    if (this.battleTimers.has(battleId)) {
      clearInterval(this.battleTimers.get(battleId));
      this.battleTimers.delete(battleId);
    }

    // Cập nhật Rating Elo
    let ratingChanges = { p1: 0, p2: 0 };
    if (winnerId && session.player1 && session.player2) {
      const isP1Winner = winnerId === session.player1Id;
      const p1 = await this.userRepo.findOne({ where: { id: session.player1Id } });
      const p2 = await this.userRepo.findOne({ where: { id: session.player2Id } });

      if (p1 && p2) {
        const changes = this.calculateElo(
          isP1Winner ? p1.rating : p2.rating,
          isP1Winner ? p2.rating : p1.rating,
        );

        if (isP1Winner) {
          p1.rating += changes.winnerChange;
          p2.rating += changes.loserChange;
          ratingChanges = { p1: changes.winnerChange, p2: changes.loserChange };
        } else {
          p2.rating += changes.winnerChange;
          p1.rating += changes.loserChange;
          ratingChanges = { p1: changes.loserChange, p2: changes.winnerChange };
        }

        await this.userRepo.save([p1, p2]);
      }
    }

    // Giải phóng trạng thái BUSY (về ONLINE)
    await this.presenceService.updateStatus(session.player1Id, UserStatus.ONLINE);
    await this.presenceService.updateStatus(session.player2Id, UserStatus.ONLINE);

    this.battleGateway.broadcastBattleEnd(battleId, {
      winnerId,
      winnerName: winnerId
        ? winnerId === session.player1Id
          ? session.player1.fullName
          : session.player2.fullName
        : 'Hòa',
      endedAt: session.endedAt,
      ratingChanges,
    });
  }

  private calculateElo(winnerRating: number, loserRating: number) {
    const K = 32;
    const expectedWinner =
      1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser =
      1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

    const winnerChange = Math.round(K * (1 - expectedWinner));
    const loserChange = Math.round(K * (0 - expectedLoser));

    return { winnerChange, loserChange };
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
