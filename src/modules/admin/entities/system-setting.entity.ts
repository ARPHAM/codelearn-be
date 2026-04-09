import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

export enum SettingType {
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({
    type: 'enum',
    enum: SettingType,
    default: SettingType.STRING,
  })
  type: SettingType;

  @Column()
  group: string;

  @Column({ nullable: true })
  description?: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
