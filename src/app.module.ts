import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BattlesModule } from './modules/battles/battles.module';
import { CoursesModule } from './modules/course/courses.module';
import { ExamsModule } from './modules/exam/exams.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { PairRoomsModule } from './modules/pair-rooms/pair-rooms.module';
import { PlagiarismModule } from './modules/plagiarism/plagiarism.module';
import { RunsModule } from './modules/runs/runs.module';
import { SubmissionsModule } from './modules/submission/submissions.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { RoomModule } from './modules/room/room.module';

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
import { Exercise, TestCase } from './modules/exercises/entities/exercise.entity';
import { Language } from './modules/problem/entities/language.entity';
import { ProblemLanguageFile } from './modules/problem/entities/problem-language-file.entity';
import { ProblemVersion } from './modules/problem/entities/problem-version.entity';
import { Problem } from './modules/problem/entities/problem.entity';
import { Testcase as ProblemTestcase } from './modules/problem/entities/testcase.entity';
import { RunExecution } from './modules/runs/entities/run-execution.entity';
import { SubmissionFile } from './modules/submission/entities/submission-file.entity';
import { Submission } from './modules/submission/entities/submission.entity';
import { UserWorkspace } from './modules/workspace/entities/user-workspace.entity';
import { WorkspaceFile } from './modules/workspace/entities/workspace-file.entity';
import { Room } from './modules/room/entities/room.entity';
import { RoomParticipant } from './modules/room/entities/room-participant.entity';

const ALL_ENTITIES = [
  User, AssignmentProblem, Assignment, BankItem, QuestionBank, Course, Enrollment,
  ExamAttempt, ExamLog, ExamProblem, Exam, ExecutionJob, SubmissionResult,
  Exercise, TestCase, Language, ProblemLanguageFile, ProblemVersion, Problem, ProblemTestcase,
  RunExecution, SubmissionFile, Submission,
  UserWorkspace, WorkspaceFile, Room, RoomParticipant
];

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({ isGlobal: true }),

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
      }
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
    BattlesModule,
    CoursesModule,
    ExamsModule,
    ExecutionModule,
    ExercisesModule,
    LearningPathModule,
    PairRoomsModule,
    PlagiarismModule,
    RunsModule,
    SubmissionsModule,
    WorkspaceModule,
    RoomModule,
  ],
})
export class AppModule {}

