import {
  Entity, Column, ManyToOne, JoinColumn, Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Assignment } from './assignment.entity';
import { Problem } from '../../problem/entities/problem.entity';

@Entity('assignment_problems')
@Index(['assignment', 'problem'], { unique: true })
export class AssignmentProblem {

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Assignment)
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column()
  order: number;

  @Column()
  score: number;

  @Column()
  sourceType: string;
}