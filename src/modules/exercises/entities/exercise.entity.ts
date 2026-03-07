import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { Difficulty } from '../../../common/enums/difficulty.enum';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: Difficulty })
  difficulty: Difficulty;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ default: 10 })
  score: number;

  @Column({ type: 'simple-array', nullable: true })
  languages: string[];

  @Column({ type: 'jsonb', nullable: true })
  hints: string[];

  @Column({ default: 'draft' })
  status: string;

  @Column({ name: 'course_id', nullable: true })
  courseId: number;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'creator_id' })
  creatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => TestCase, (tc) => tc.exercise)
  testCases: TestCase[];
}

@Entity('test_cases')
export class TestCase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exercise_id' })
  exerciseId: number;

  @ManyToOne(() => Exercise, (e) => e.testCases)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'text' })
  input: string;

  @Column({ name: 'expected_output', type: 'text' })
  expectedOutput: string;

  @Column({ name: 'is_hidden', default: false })
  isHidden: boolean;

  @Column({ name: 'order_idx', default: 0 })
  orderIdx: number;
}
