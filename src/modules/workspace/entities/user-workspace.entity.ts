import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum WorkspaceSource {
  LOCAL_UPLOAD = 'LOCAL_UPLOAD',
  FROM_PROBLEM = 'FROM_PROBLEM',
  MANUAL = 'MANUAL',
}

@Entity('user_workspaces')
export class UserWorkspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: WorkspaceSource,
    default: WorkspaceSource.MANUAL,
  })
  source: WorkspaceSource;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
