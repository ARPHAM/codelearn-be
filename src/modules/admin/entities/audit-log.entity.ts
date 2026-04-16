import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column()
  action: string; // VD: 'UPDATE_SETTING', 'DELETE_LANGUAGE'

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
