import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
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

  @Column({ nullable: true })
  difficultyOverride: string;

  @Column({ nullable: true })
  score: number;
}