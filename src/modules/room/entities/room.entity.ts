import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string;

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
