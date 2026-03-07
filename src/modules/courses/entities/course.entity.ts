import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  code: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'lecturer_id', nullable: true })
  lecturerId: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lecturer_id' })
  lecturer: User;

  @Column({ length: 20 })
  semester: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('enrollments')
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @CreateDateColumn({ name: 'enrolled_at' })
  enrolledAt: Date;
}
