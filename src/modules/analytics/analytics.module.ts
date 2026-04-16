import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AnalyticsController,
  NotificationsController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Submission } from '../submission/entities/submission.entity';
import { Enrollment } from '../course/entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Submission, Enrollment])],
  controllers: [AnalyticsController, NotificationsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
