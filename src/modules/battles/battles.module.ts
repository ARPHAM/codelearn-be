import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BattlesController } from './battles.controller';
import { BattlesService } from './battles.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [BattlesController],
  providers: [BattlesService],
})
export class BattlesModule {}
