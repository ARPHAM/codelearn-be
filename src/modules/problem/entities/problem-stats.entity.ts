import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Problem } from './problem.entity';

@Entity('problem_stats')
export class ProblemStats {
  @PrimaryColumn({ type: 'varchar', name: 'problem_id' })
  problemId: string;

  @OneToOne(() => Problem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ name: 'total_submissions', default: 0 })
  totalSubmissions: number;

  @Column({ type: 'float', name: 'acceptance_rate', default: 0 })
  acceptanceRate: number;
}
