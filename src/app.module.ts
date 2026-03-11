import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { CoursesModule } from './modules/courses/courses.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { PlagiarismModule } from './modules/plagiarism/plagiarism.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { BattlesModule } from './modules/battles/battles.module';
import { PairRoomsModule } from './modules/pair-rooms/pair-rooms.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AdminModule } from './modules/admin/admin.module';

// Entities
import { User } from './modules/users/entities/user.entity';
import { Course, Enrollment } from './modules/courses/entities/course.entity';
import { Exercise, TestCase } from './modules/exercises/entities/exercise.entity';
import { Submission } from './modules/submissions/entities/submission.entity';

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
            entities: [User, Course, Enrollment, Exercise, TestCase, Submission],
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
          entities: [User, Course, Enrollment, Exercise, TestCase, Submission],
          synchronize: cfg.get<string>('DB_SYNCHRONIZE') === 'true',
          logging: cfg.get<string>('DB_LOGGING') === 'true',
        };
      }
    }),

    // Feature modules
    AuthModule,
    CoursesModule,
    ExercisesModule,
    SubmissionsModule,
    PlagiarismModule,
    AnalyticsModule,
    LearningPathModule,
    BattlesModule,
    PairRoomsModule,
    ExamsModule,
    AdminModule,
  ],
})
export class AppModule {}
