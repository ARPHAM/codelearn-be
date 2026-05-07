import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Submission } from '../submission/entities/submission.entity';
import { UserService } from './user.service';
import { PresenceService } from './presence.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Submission])],
  controllers: [UserController],
  providers: [UserService, PresenceService],
  exports: [UserService, PresenceService],
})
export class UserModule {}
