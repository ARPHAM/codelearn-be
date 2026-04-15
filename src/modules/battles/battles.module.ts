import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattlesController } from './battles.controller';
import { BattlesService } from './battles.service';
import { User } from '../user/entities/user.entity';
import { BattleSession } from './entities/battle-session.entity';
import { BattlesGateway } from './battles.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([User, BattleSession])],
  controllers: [BattlesController],
  providers: [BattlesService, BattlesGateway],
})
export class BattlesModule {}
