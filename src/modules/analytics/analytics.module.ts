import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController, NotificationsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Submission } from '../submissions/entities/submission.entity';
import { Enrollment } from '../courses/entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Submission, Enrollment])],
  controllers: [AnalyticsController, NotificationsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
