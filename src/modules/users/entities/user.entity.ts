import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';
import { Role } from '../../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ length: 20, nullable: true })
  mssv: string;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ length: 100, nullable: true })
  major: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ default: 1500 })
  rating: number;

  @Column({ default: 0 })
  xp: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
