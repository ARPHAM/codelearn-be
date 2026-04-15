import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Problem } from '../../problem/entities/problem.entity';

@Entity('battle_sessions')
export class BattleSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'player1_id' })
  player1: User;

  @Column({ name: 'player1_id' })
  player1Id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'player2_id' })
  player2: User;

  @Column({ name: 'player2_id', nullable: true })
  player2Id: string;

  @ManyToOne(() => Problem, { nullable: true })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ name: 'problem_id', nullable: true })
  problemId: string;

  @Column({ default: 'WAITING' })
  status: string; // WAITING | ACTIVE | ENDED | CANCELLED

  @Column({ type: 'int', default: 30 })
  duration: number; // in minutes

  @Column({ type: 'int', default: 0, name: 'player1_progress' })
  player1Progress: number; // number of testcases passed

  @Column({ type: 'int', default: 0, name: 'player2_progress' })
  player2Progress: number;

  @Column({ name: 'winner_id', nullable: true })
  winnerId: string;

  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', name: 'ended_at', nullable: true })
  endedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
