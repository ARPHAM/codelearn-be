import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BattleModule } from './modules/battle/battle.module';
import { CourseModule } from './modules/course/course.module';
import { ExamModule } from './modules/exam/exam.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { ExerciseModule } from './modules/exercise/exercise.module';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { PairRoomsModule } from './modules/pair-rooms/pair-rooms.module';
import { PlagiarismModule } from './modules/plagiarism/plagiarism.module';
import { RunModule } from './modules/run/run.module';
import { SubmissionModule } from './modules/submission/submission.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { RoomModule } from './modules/room/room.module';
import { ProblemModule } from './modules/problem/problem.module';
import { BankModule } from './modules/bank/bank.module';
import { AiModule } from './modules/ai/ai.module';

// Entities
import { User } from './modules/user/entities/user.entity';
import { AssignmentProblem } from './modules/assignment/entities/assignment-problem.entity';
import { Assignment } from './modules/assignment/entities/assignment.entity';
import { BankItem } from './modules/bank/entities/bank-item.entity';
import { QuestionBank } from './modules/bank/entities/question-bank.entity';
import { Course } from './modules/course/entities/course.entity';
import { Enrollment } from './modules/course/entities/enrollment.entity';
import { ExamAttempt } from './modules/exam/entities/exam-attempt.entity';
import { ExamLog } from './modules/exam/entities/exam-log.entity';
import { ExamProblem } from './modules/exam/entities/exam-problem.entity';
import { Exam } from './modules/exam/entities/exam.entity';
import { ExecutionJob } from './modules/execution/entites/execution-job.entity';
import { SubmissionResult } from './modules/execution/entites/submission-result.entity';
import {
  Exercise,
  TestCase,
} from './modules/exercise/entities/exercise.entity';
import { Language } from './modules/problem/entities/language.entity';
import { ProblemLanguageFile } from './modules/problem/entities/problem-language-file.entity';
import { ProblemVersion } from './modules/problem/entities/problem-version.entity';
import { Problem } from './modules/problem/entities/problem.entity';
import { ProblemFile } from './modules/problem/entities/problem-file.entity';
import { ProblemStats } from './modules/problem/entities/problem-stats.entity';
import { Testcase as ProblemTestcase } from './modules/problem/entities/testcase.entity';
import { RunExecution } from './modules/run/entities/run-execution.entity';
import { SubmissionFile } from './modules/submission/entities/submission-file.entity';
import { Submission } from './modules/submission/entities/submission.entity';
import { UserWorkspace } from './modules/workspace/entities/user-workspace.entity';
import { WorkspaceFile } from './modules/workspace/entities/workspace-file.entity';
import { Room } from './modules/room/entities/room.entity';
import { RoomParticipant } from './modules/room/entities/room-participant.entity';
import { RoomSession } from './modules/room/entities/room-session.entity';
import { SystemSetting } from './modules/admin/entities/system-setting.entity';
import { AuditLog } from './modules/admin/entities/audit-log.entity';
import { UserSkillNode } from './modules/learning-path/entities/user-skill-node.entity';
import { BattleSession } from './modules/battle/entities/battle-session.entity';

const ALL_ENTITIES = [
  User,
  AssignmentProblem,
  Assignment,
  BankItem,
  QuestionBank,
  Course,
  Enrollment,
  ExamAttempt,
  ExamLog,
  ExamProblem,
  Exam,
  ExecutionJob,
  SubmissionResult,
  Exercise,
  TestCase,
  Language,
  ProblemLanguageFile,
  ProblemVersion,
  Problem,
  ProblemTestcase,
  ProblemFile,
  ProblemStats,
  RunExecution,
  SubmissionFile,
  Submission,
  UserWorkspace,
  WorkspaceFile,
  Room,
  RoomParticipant,
  RoomSession,
  SystemSetting,
  AuditLog,
  UserSkillNode,
  BattleSession,
];

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

    // Schedule
    ScheduleModule.forRoot(),

    // Cache
    CacheModule.register({ isGlobal: true }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const databaseUrl = cfg.get<string>('DATABASE_URL');

        if (databaseUrl) {
          // Production (Render)
          return {
            type: 'postgres',
            url: databaseUrl,
            entities: ALL_ENTITIES,
            synchronize: true,
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        // Local development
        return {
          type: 'postgres',
          host: cfg.get('DB_HOST'),
          port: +(cfg.get<string>('DB_PORT') ?? '5432'),
          username: cfg.get('DB_USERNAME'),
          password: cfg.get('DB_PASSWORD'),
          database: cfg.get('DB_NAME'),
          entities: ALL_ENTITIES,
          synchronize: cfg.get<string>('DB_SYNCHRONIZE') === 'true',
          logging: cfg.get<string>('DB_LOGGING') === 'true',
        };
      },
    }),

    // Redis Queue (Bull)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService) => ({
        redis: {
          host: cfg.get<string>('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    // Feature modules
    AuthModule,
    AdminModule,
    AnalyticsModule,
    BattleModule,
    CourseModule,
    ExamModule,
    ExecutionModule,
    ExerciseModule,
    LearningPathModule,
    PairRoomsModule,
    PlagiarismModule,
    RunModule,
    SubmissionModule,
    WorkspaceModule,
    RoomModule,
    ProblemModule,
    LeaderboardModule,
    BankModule,
    AiModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
