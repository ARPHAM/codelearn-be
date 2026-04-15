import {
  Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn,
} from 'typeorm';
import { Submission } from '../../submission/entities/submission.entity';

@Entity('execution_jobs')
export class ExecutionJob {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column({ name: 'submission_id' })
  submissionId: string;

  @ManyToOne(() => Submission)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @Column()
  status: string;

  @Column({ name: 'worker_id', nullable: true })
  workerId: string;
}