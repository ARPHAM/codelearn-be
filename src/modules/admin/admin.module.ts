import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../user/entities/user.entity';
import { Language } from '../problem/entities/language.entity';
import { LanguagesService } from './languages.service';
import { LanguagesController } from './languages.controller';
import { SystemSetting } from './entities/system-setting.entity';
import { AuditLog } from './entities/audit-log.entity';
import { SystemSettingsService } from './system-settings.service';
import { HealthService } from './health.service';
import { ExecutionJob } from '../execution/entites/execution-job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Language,
      SystemSetting,
      AuditLog,
      ExecutionJob,
    ]),
  ],
  controllers: [AdminController, LanguagesController],
  providers: [
    AdminService,
    LanguagesService,
    SystemSettingsService,
    HealthService,
  ],
  exports: [LanguagesService, SystemSettingsService, TypeOrmModule],
})
export class AdminModule {}
