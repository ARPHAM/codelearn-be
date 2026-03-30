import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Room } from './entities/room.entity';
import { RoomParticipant } from './entities/room-participant.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, RoomParticipant]),
    WorkspaceModule,
  ],
  controllers: [RoomController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
