import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Submission } from '../../submission/entities/submission.entity';
import { Testcase } from '../../problem/entities/testcase.entity';

@Entity('submission_results')
@Index(['submission', 'testcase'], { unique: true })
export class SubmissionResult {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Submission)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @ManyToOne(() => Testcase)
  @JoinColumn({ name: 'testcase_id' })
  testcase: Testcase;

  @Column()
  status: string;

  @Column({ nullable: true })
  runtime: number;

  @Column({ nullable: true })
  memory: number;

  @Column({ type: 'text', nullable: true })
  output: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;
}
