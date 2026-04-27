import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProblemVersion } from './problem-version.entity';
import { Language } from './language.entity';

@Entity('problem_files')
@Index(['problemVersion'])
@Index(['language'])
export class ProblemFile {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => ProblemVersion)
  @JoinColumn({ name: 'problem_version_id' })
  problemVersion: ProblemVersion;

  @ManyToOne(() => Language, { nullable: true })
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @Column({ name: 'language_id', nullable: true })
  languageId: number;

  @Column()
  path: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 'NEUTRAL' })
  type: string; // TEMPLATE | SOLUTION | NEUTRAL | HIDDEN

  @Column({ default: false, name: 'is_readonly' })
  isReadonly: boolean;

  @Column({ default: false, name: 'is_entry_file' })
  isEntryFile: boolean;

  @Column({ default: false, name: 'is_fill_in_the_blank' })
  isFillInTheBlank: boolean;
}
