import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserWorkspace } from './entities/user-workspace.entity';
import { WorkspaceFile } from './entities/workspace-file.entity';
import { WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';
import { RoomParticipant } from '../room/entities/room-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserWorkspace, WorkspaceFile, RoomParticipant])],
  controllers: [WorkspaceController],
  providers: [WorkspaceService],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
