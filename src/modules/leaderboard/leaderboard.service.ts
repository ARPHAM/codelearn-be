import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Submission } from '../submission/entities/submission.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
  ) {}

  async getLeaderboard(period: string, type: string, limit: number, currentUser?: User) {
    const isXp = type === 'XP';
    const orderField = isXp ? 'xp' : 'rating';

    // Basic logic: rank by XP/Rating
    const users = await this.userRepo.find({
      where: { role: Role.STUDENT },
      order: { [orderField]: 'DESC' },
      take: limit,
    });

    const items = await Promise.all(
      users.map(async (u, index) => {
        // Calculate solvedCount
        const solvedCount = await this.submissionRepo
          .createQueryBuilder('s')
          .where('s.user_id = :userId', { userId: u.id })
          .andWhere('s.status = :status', { status: 'ACCEPTED' })
          .select('DISTINCT s.problem_version_id')
          .getCount();

        // Calculate Streak (Mock logic for now, should calculate from daily activity)
        const streak = 5;

        return {
          rank: index + 1,
          userId: u.id,
          name: u.fullName,
          avatar: u.avatarUrl,
          score: isXp ? u.xp : u.rating,
          solvedCount,
          winRate: 0.75, // Mock from Code Battle
          streak,
        };
      }),
    );

    let currentRank = 0;
    if (currentUser) {
      // Find rank of current user
      const currentUserScore = isXp ? currentUser.xp : currentUser.rating;
      const topRank = await this.userRepo
        .createQueryBuilder('u')
        .where(`u.${orderField} > :score`, { score: currentUserScore })
        .andWhere('u.role = :role', { role: Role.STUDENT })
        .getCount();
      currentRank = topRank + 1;
    }

    return {
      items,
      currentUser: currentUser
        ? { userId: currentUser.id, rank: currentRank, score: isXp ? currentUser.xp : currentUser.rating }
        : null,
    };
  }
}
