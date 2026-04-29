import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { RoomParticipant } from './room-participant.entity';

export enum RoomType {
  MEETING = 'MEETING',
  CODE = 'CODE',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: RoomType, default: RoomType.MEETING })
  type: RoomType;

  @Column({ name: 'problem_slug', nullable: true })
  problemSlug: string;

  @Column({ default: 'OPEN' })
  status: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'max_participants', default: 10 })
  maxParticipants: number;

  @OneToMany(() => RoomParticipant, (participant) => participant.room)
  participants: RoomParticipant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
