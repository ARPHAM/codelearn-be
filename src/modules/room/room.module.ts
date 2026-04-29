import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Room } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { RoomSession } from './entities/room-session.entity';
import { UserWorkspace } from '../workspace/entities/user-workspace.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AuthModule } from '../auth/auth.module';
import { RoomGateway } from './room.gateway';
import { RoomRuntimeStore } from './room-runtime.store';
import { RoomCleanupService } from './room-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomParticipant, RoomSession, UserWorkspace]),
    WorkspaceModule,
    AuthModule,
    ConfigModule,
  ],
  controllers: [RoomController],
  providers: [RoomService, RoomGateway, RoomRuntimeStore, RoomCleanupService],
  exports: [RoomService, RoomGateway, RoomRuntimeStore, RoomCleanupService],
})
export class RoomModule {}
