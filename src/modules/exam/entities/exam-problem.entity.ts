import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exam } from './exam.entity';
import { Problem } from '../../problem/entities/problem.entity';

@Entity('exam_problems')
@Index(['exam', 'problem'], { unique: true })
export class ExamProblem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Exam)
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column()
  score: number;

  @Column()
  order: number;

  @Column()
  sourceType: string;
}
