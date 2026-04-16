import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

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

  @Column({ name: 'problem_id', nullable: true })
  problemId: number;

  @Column({ default: 'OPEN' })
  status: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'max_participants', default: 10 })
  maxParticipants: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
