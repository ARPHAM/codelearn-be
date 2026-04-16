import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { Submission } from './entities/submission.entity';
import { ProblemVersion } from '../problem/entities/problem-version.entity';
import { Language } from '../problem/entities/language.entity';
import { Testcase } from '../problem/entities/testcase.entity';
import { SubmissionProcessor } from './submission.processor';
import { ExecutionModule } from '../execution/execution.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, ProblemVersion, Language, Testcase]),
    ExecutionModule,
    AdminModule,
    BullModule.registerQueue({
      name: 'code-execution',
    }),
  ],
  controllers: [SubmissionController],
  providers: [SubmissionService, SubmissionProcessor],
  exports: [SubmissionService],
})
export class SubmissionModule {}
