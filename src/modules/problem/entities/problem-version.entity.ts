import {
  Entity, PrimaryColumn, Column,
  ManyToOne, JoinColumn, Index,
  CreateDateColumn,
} from 'typeorm';
import { Problem } from './problem.entity';
import { User } from '../../user/entities/user.entity';

@Entity('problem_versions')
export class ProblemVersion {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ type: 'jsonb' })
  description: any;

  @Column({ type: 'jsonb', nullable: true, name: 'workspace_config' })
  workspaceConfig: any;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ default: 'DRAFT' })
  status: string;
}