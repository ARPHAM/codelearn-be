import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';
import { SubmissionStatus } from '../../../common/enums/submission-status.enum';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exercise_id' })
  exerciseId: number;

  @ManyToOne(() => Exercise)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ length: 20 })
  language: string;

  @Column({ name: 'source_code', type: 'text' })
  sourceCode: string;

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.QUEUED })
  status: SubmissionStatus;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ nullable: true })
  passed: number;

  @Column({ nullable: true })
  total: number;

  @Column({ name: 'cpu_time', type: 'numeric', precision: 8, scale: 3, nullable: true })
  cpuTime: number;

  @Column({ name: 'memory_mb', type: 'numeric', precision: 8, scale: 2, nullable: true })
  memoryMb: number;

  @Column({ type: 'text', nullable: true })
  stderr: string;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;
}
