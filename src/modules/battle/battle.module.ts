import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { User } from '../user/entities/user.entity';
import { BattleSession } from './entities/battle-session.entity';
import { BattleGateway } from './battle.gateway';
import { SubmissionModule } from '../submission/submission.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, BattleSession]),
    SubmissionModule,
  ],
  controllers: [BattleController],
  providers: [BattleService, BattleGateway],
})
export class BattleModule {}
