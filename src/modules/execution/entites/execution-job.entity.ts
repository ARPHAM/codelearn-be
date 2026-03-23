import {
  Entity, PrimaryColumn, Column, Index,
} from 'typeorm';

@Entity('execution_jobs')
export class ExecutionJob {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column({ name: 'submission_id' })
  submissionId: string;

  @Column()
  status: string;

  @Column({ name: 'worker_id', nullable: true })
  workerId: string;
}