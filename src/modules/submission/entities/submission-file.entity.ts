import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Submission } from './submission.entity';

@Entity('submission_files')
export class SubmissionFile {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @ManyToOne(() => Submission)
  @JoinColumn({ name: 'submission_id' })
  submission: Submission;

  @Column()
  path: string;

  @Column({ type: 'text' })
  content: string;
}
