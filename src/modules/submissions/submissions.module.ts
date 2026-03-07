import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { Submission } from './entities/submission.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ExercisesModule } from '../exercises/exercises.module';

@Module({
  imports: [TypeOrmModule.forFeature([Submission, Exercise]), ExercisesModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
