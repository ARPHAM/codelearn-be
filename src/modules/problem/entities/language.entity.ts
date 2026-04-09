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

  @Column({ name: 'ext' })
  ext: string;

  @Column({ name: 'template', type: 'text', nullable: true })
  template: string;

  @Column({ 
    name: 'image_status', 
    type: 'varchar', 
    default: 'READY',
    comment: 'READY, PULLING, ERROR' 
  })
  imageStatus: string;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string | null;

  @Column({ name: 'compile_cmd', type: 'text', nullable: true })
  compileCmd: string;

  @Column({ name: 'run_cmd', type: 'text' })
  runCmd: string;

  @Column({ name: 'default_memory_limit', type: 'int', default: 256 })
  defaultMemoryLimit: number;

  @Column({ name: 'default_cpu_limit', type: 'float', default: 0.5 })
  defaultCpuLimit: number;

  @Column({ name: 'default_timeout', type: 'int', default: 5000 })
  defaultTimeout: number;
}