import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { User } from '../user/entities/user.entity';
import { Submission } from '../submission/entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Submission])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
