import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('user_skill_nodes')
export class UserSkillNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  tag: string;

  @Column()
  difficulty: string; // EASY | MEDIUM | HARD

  @Column({ default: 'LOCKED' })
  status: string; // DONE | ACTIVE | LOCKED

  @Column({ type: 'float', default: 0 })
  progress: number;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => UserSkillNode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: UserSkillNode;

  @Column({ type: 'float', name: 'position_x', default: 0 })
  positionX: number;

  @Column({ type: 'float', name: 'position_y', default: 0 })
  positionY: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
