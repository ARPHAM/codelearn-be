import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionBank } from './question-bank.entity';
import { Problem } from '../../problem/entities/problem.entity';

@Entity('bank_items')
export class BankItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => QuestionBank)
  @JoinColumn({ name: 'bank_id' })
  bank: QuestionBank;

  @ManyToOne(() => Problem)
  @JoinColumn({ name: 'problem_id' })
  problem: Problem;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ nullable: true })
  difficultyOverride: string;

  @Column({ nullable: true })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
