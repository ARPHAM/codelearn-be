import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  name: string;

  @Column()
  code: string;

  @Column()
  semester: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'lecturer_id' })
  lecturer: User;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ default: 'active' })
  status: string;
}
