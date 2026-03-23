import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { Submission } from './entities/submission.entity';
import { ProblemVersion } from '../problems/entities/problem-version.entity';
import { Language } from '../problems/entities/language.entity';
import { SubmissionsProcessor } from './submissions.processor';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, ProblemVersion, Language]),
    ExecutionModule,
    BullModule.registerQueue({
      name: 'code-execution',
    }),
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsProcessor],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
