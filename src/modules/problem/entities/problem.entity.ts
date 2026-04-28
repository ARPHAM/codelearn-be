import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ProblemStats } from './problem-stats.entity';

@Entity('problems')
export class Problem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  title: string;

  @Index({ unique: true })
  @Column()
  slug: string;

  @Column()
  difficulty: string;

  @Column()
  type: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ default: 'INACTIVE' })
  status: string;

  @Column({ default: 'PRIVATE' })
  visibility: string;

  @Column({ nullable: true })
  source: string;

  @Column({ name: 'current_version_id', nullable: true })
  currentVersionId: string;

  @Column('text', { array: true, nullable: true })
  tags: string[];

  @Column({ name: 'time_limit', default: 5000 })
  timeLimit: number;

  @Column({ name: 'memory_limit', default: 256 })
  memoryLimit: number;

  @OneToOne(() => ProblemStats, (stats) => stats.problem)
  stats: ProblemStats;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
