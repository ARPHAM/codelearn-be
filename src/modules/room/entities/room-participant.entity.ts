import { Entity, Column, CreateDateColumn, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Room } from './room.entity';
import { User } from '../../user/entities/user.entity';
import { UserWorkspace } from '../../workspace/entities/user-workspace.entity';

@Entity('room_participants')
export class RoomParticipant {
  @PrimaryColumn({ name: 'room_id' })
  roomId: string;

  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  role: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => UserWorkspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace: UserWorkspace;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
