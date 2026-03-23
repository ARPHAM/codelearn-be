import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Problem } from './problem.entity';
import { Language } from './language.entity';

@Entity('problem_language_files')
@Index(['problem', 'language'])
export class ProblemLanguageFile {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @ManyToOne(() => Language)
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @Column()
  path: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  type: string; // TEMPLATE | SOLUTION
}