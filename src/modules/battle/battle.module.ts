import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { User } from '../user/entities/user.entity';
import { BattleSession } from './entities/battle-session.entity';
import { BattleGateway } from './battle.gateway';
import { SubmissionModule } from '../submission/submission.module';
import { UserModule } from '../user/user.module';
import { ProblemModule } from '../problem/problem.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, BattleSession]),
    forwardRef(() => SubmissionModule),
    UserModule,
    ProblemModule,
  ],
  controllers: [BattleController],
  providers: [BattleService, BattleGateway],
  exports: [BattleService],
})
export class BattleModule {}
