import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExamAttempt } from './exam-attempt.entity';

@Entity('exam_logs')
export class ExamLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ExamAttempt)
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttempt;

  @Column()
  eventType: string;

  @Column()
  timestamp: Date;

  @Column({ type: 'json', nullable: true })
  metadata: any;
}
