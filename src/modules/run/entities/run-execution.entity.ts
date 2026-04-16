import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ProblemVersion } from '../../problem/entities/problem-version.entity';
import { Language } from '../../problem/entities/language.entity';
import { SubmissionStatus } from '../../../shared/enums/submission-status.enum';

@Entity('run_executions')
export class RunExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'problem_version_id', type: 'uuid', nullable: true })
  problemVersionId?: string;

  @ManyToOne(() => ProblemVersion, { nullable: true })
  @JoinColumn({ name: 'problem_version_id' })
  problemVersion?: ProblemVersion;

  @Column({ name: 'language_id' })
  languageId: number;

  @ManyToOne(() => Language)
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @Column({ type: 'text' })
  code: string;

  @Column({ type: 'text', nullable: true, comment: 'Custom user input' })
  input: string;

  @Column({ type: 'text', nullable: true })
  output: string;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.QUEUED,
  })
  status: SubmissionStatus;

  @Column({ type: 'int', nullable: true, comment: 'Runtime in ms' })
  runtime: number;

  @Column({ type: 'int', nullable: true, comment: 'Memory in KB/MB' })
  memory: number;

  @Column({ type: 'text', nullable: true })
  compileOutput: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
