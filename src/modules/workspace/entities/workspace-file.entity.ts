import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn, Unique, CreateDateColumn } from 'typeorm';
import { UserWorkspace } from './user-workspace.entity';
import { User } from '../../user/entities/user.entity';

@Entity('workspace_files')
@Unique(['workspaceId', 'path'])
export class WorkspaceFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workspace_id' })
  workspaceId: string;

  @ManyToOne(() => UserWorkspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace: UserWorkspace;

  @Column()
  path: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
