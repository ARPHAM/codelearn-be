import {
  Entity, PrimaryColumn, Column,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Exam } from './exam.entity';
import { User } from '../../user/entities/user.entity';

@Entity('exam_attempts')
@Index(['exam', 'user'])
export class ExamAttempt {
  @PrimaryColumn()
  id: string;

  @ManyToOne(() => Exam)
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'start_time' })
  startTime: Date;

  @Column({ name: 'end_time', nullable: true })
  endTime: Date;

  @Column({ nullable: true })
  score: number;

  @Column()
  status: string;
}