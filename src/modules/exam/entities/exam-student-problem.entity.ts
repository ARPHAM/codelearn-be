import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exam } from './exam.entity';
import { User } from '../../user/entities/user.entity';
import { Problem } from '../../problem/entities/problem.entity';

@Entity('exam_student_problems')
export class ExamStudentProblem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Exam)
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  order: number;
}
