import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProblemVersion } from './problem-version.entity';

@Entity('testcases')
@Index(['problemVersion'])
export class Testcase {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => ProblemVersion)
  @JoinColumn({ name: 'problem_version_id' })
  problemVersion: ProblemVersion;

  @Column({ type: 'text' })
  input: string;

  @Column({ type: 'text', name: 'expected_output' })
  expectedOutput: string;

  @Column()
  score: number;

  @Column({ default: false })
  isHidden: boolean;

  @Column()
  order: number;
}
