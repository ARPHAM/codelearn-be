import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('languages')
export class Language {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  version: string;

  @Column({ name: 'docker_image' })
  dockerImage: string;

  @Column({ name: 'compile_cmd', type: 'text', nullable: true })
  compileCmd: string;

  @Column({ name: 'run_cmd', type: 'text' })
  runCmd: string;
}