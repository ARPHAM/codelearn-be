import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SystemSetting, SettingType } from './entities/system-setting.entity';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    const defaults = [
      // Sandbox
      { key: 'sandbox.max_concurrent', value: '20', type: SettingType.NUMBER, group: 'sandbox', description: 'So luong container toi da chay cung luc' },
      { key: 'sandbox.default_timeout', value: '5000', type: SettingType.NUMBER, group: 'sandbox', description: 'Thoi gian timeout mac dinh (ms)' },
      { key: 'sandbox.default_memory_limit', value: '256', type: SettingType.NUMBER, group: 'sandbox', description: 'Gioi han RAM mac dinh (MB)' },
      { key: 'sandbox.cpu_limit', value: '0.5', type: SettingType.NUMBER, group: 'sandbox', description: 'Gioi han CPU mac dinh (vCPU)' },
      { key: 'sandbox.enable_network', value: 'false', type: SettingType.BOOLEAN, group: 'sandbox', description: 'Cho phep container truy cap mang' },
      
      // Plagiarism
      { key: 'plagiarism.algorithm', value: 'AST + Token', type: SettingType.STRING, group: 'plagiarism', description: 'Thuat toan kiem tra dao van' },
      { key: 'plagiarism.warning_threshold', value: '40', type: SettingType.NUMBER, group: 'plagiarism', description: 'Nguong canh bao (%)' },
      { key: 'plagiarism.danger_threshold', value: '70', type: SettingType.NUMBER, group: 'plagiarism', description: 'Nguong nguy cap (%)' },
      { key: 'plagiarism.auto_flag', value: 'true', type: SettingType.BOOLEAN, group: 'plagiarism', description: 'Tu dong danh dau vi pham' },
    ];

    for (const d of defaults) {
      const exists = await this.settingRepo.findOne({ where: { key: d.key } });
      if (!exists) {
        await this.settingRepo.save(this.settingRepo.create(d));
      }
    }
  }

  async findAllGrouped() {
    const settings = await this.settingRepo.find();
    return settings.reduce((acc, s) => {
      if (!acc[s.group]) acc[s.group] = {};
      acc[s.group][this.camelCase(s.key.split('.')[1] || s.key)] = this.parseValue(s.value, s.type);
      return acc;
    }, {});
  }

  async updateSettings(updates: any, userId?: string) {
    const keys = Object.keys(updates);
    for (const group of keys) {
      const groupUpdates = updates[group];
      for (const field of Object.keys(groupUpdates)) {
        const key = `${group}.${this.snakeCase(field)}`;
        const value = String(groupUpdates[field]);
        
        const setting = await this.settingRepo.findOne({ where: { key } });
        if (setting) {
          const oldValue = setting.value;
          setting.value = value;
          await this.settingRepo.save(setting);
          await this.cacheManager.del(`setting:${key}`);

          // Log Audit
          await this.auditLogRepo.save(this.auditLogRepo.create({
            userId,
            action: 'UPDATE_SETTING',
            metadata: { key, old: oldValue, new: value }
          }));
        }
      }
    }
    await (this.cacheManager as any).reset(); // Clear all for safety
    return this.findAllGrouped();
  }

  async getSettingValue<T>(key: string, defaultValue?: T): Promise<T> {
    const cached = await this.cacheManager.get<T>(`setting:${key}`);
    if (cached !== undefined && cached !== null) return cached;

    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) return defaultValue as T;

    const parsed = this.parseValue(setting.value, setting.type) as T;
    await this.cacheManager.set(`setting:${key}`, parsed, 60000); // Cache 1 min
    return parsed;
  }

  private parseValue(value: string, type: SettingType): any {
    switch (type) {
      case SettingType.NUMBER: return Number(value);
      case SettingType.BOOLEAN: return value === 'true';
      case SettingType.JSON: try { return JSON.parse(value); } catch { return value; }
      default: return value;
    }
  }

  private camelCase(str: string) {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  }

  private snakeCase(str: string) {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
