import {
  Entity, PrimaryColumn, Column,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ProblemVersion } from './problem-version.entity';

@Entity('problem_files')
@Index(['problemVersion'])
export class ProblemFile {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => ProblemVersion)
  @JoinColumn({ name: 'problem_version_id' })
  problemVersion: ProblemVersion;

  @Column()
  path: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: false, name: 'is_readonly' })
  isReadonly: boolean;
}
