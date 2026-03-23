import {
  Entity, Column,
  ManyToOne, JoinColumn, Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('problems')
export class Problem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  title: string;

  @Index({ unique: true })
  @Column()
  slug: string;

  @Column()
  difficulty: string;

  @Column()
  type: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column()
  status: string;

  @Column()
  visibility: string;

  @Column({ nullable: true })
  source: string;

  @Column({ name: 'current_version_id', nullable: true })
  currentVersionId: string;
}