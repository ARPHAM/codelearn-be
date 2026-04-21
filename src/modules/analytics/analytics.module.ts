import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AnalyticsController,
  NotificationsController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Submission } from '../submission/entities/submission.entity';
import { Enrollment } from '../course/entities/enrollment.entity';
import { Problem } from '../problem/entities/problem.entity';
import { Course } from '../course/entities/course.entity';
import { Assignment } from '../assignment/entities/assignment.entity';
import { AssignmentProblem } from '../assignment/entities/assignment-problem.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Submission,
      Enrollment,
      Problem,
      Course,
      Assignment,
      AssignmentProblem,
    ]),
  ],
  controllers: [AnalyticsController, NotificationsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
