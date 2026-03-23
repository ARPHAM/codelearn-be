import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'start_time' })
  startTime: Date;

  @Column({ name: 'due_time' })
  dueTime: Date;

  @Column()
  type: string;

  @Column({ default: 1 })
  maxAttempts: number;

  @Column({ default: false })
  isPublished: boolean;
}