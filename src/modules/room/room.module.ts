import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Room } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { RoomSession } from './entities/room-session.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AuthModule } from '../auth/auth.module';
import { RoomGateway } from './room.gateway';
import { RoomRuntimeStore } from './room-runtime.store';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomParticipant, RoomSession]),
    WorkspaceModule,
    AuthModule,
    ConfigModule,
  ],
  controllers: [RoomController],
  providers: [RoomService, RoomGateway, RoomRuntimeStore],
  exports: [RoomService, RoomGateway, RoomRuntimeStore],
})
export class RoomModule {}
