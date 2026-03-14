import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { Submission } from './entities/submission.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExercisesModule } from '../exercises/exercises.module';
import { SubmissionsProcessor } from './submissions.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Exercise]),
    ExercisesModule,
    BullModule.registerQueue({
      name: 'code-execution',
    }),
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsProcessor],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
