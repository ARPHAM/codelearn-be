import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ProblemVersion } from '../../problem/entities/problem-version.entity';
import { Language } from '../../problem/entities/language.entity';

@Entity('submissions')
@Index(['user'])
@Index(['problemVersion'])
export class Submission {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => ProblemVersion)
  @JoinColumn({ name: 'problem_version_id' })
  problemVersion: ProblemVersion;

  @ManyToOne(() => Language)
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @Column({ name: 'language_id' })
  languageId: number;

  @Column({ type: 'text', nullable: true })
  code: string;

  @Column()
  type: string; // RUN | SUBMIT

  @Index()
  @Column()
  context: string;

  @Index()
  @Column({ name: 'context_id' })
  contextId: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  score: number;

  @Column({ nullable: true })
  runtime: number;

  @Column({ nullable: true })
  memory: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  @Column({ nullable: true })
  testcasePassed: number;

  @Column({ type: 'text', nullable: true })
  results: string; // Store JSON array of testcase results

  @Column({ type: 'text', nullable: true })
  input: string;

  @Column({ type: 'text', nullable: true })
  output: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'submitted_at', nullable: true })
  submittedAt: Date;
}
