import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { QuestionBank } from '../../bank/entities/question-bank.entity';

@Entity('exams')
export class Exam {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column({ name: 'start_time' })
  startTime: Date;

  @Column({ name: 'end_time' })
  endTime: Date;

  @Column()
  duration: number;

  @ManyToOne(() => QuestionBank)
  @JoinColumn({ name: 'bank_id' })
  bank: QuestionBank;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ default: false })
  shuffle: boolean;

  @Column({ default: 'DRAFT' })
  status: string;

  @Column('int', { array: true, nullable: true, name: 'allowed_language_ids' })
  allowedLanguageIds: number[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ type: 'jsonb', nullable: true, name: 'generation_rules' })
  generationRules: any;

  @Column({ default: false, name: 'is_per_user_random' })
  isPerUserRandom: boolean;
}
