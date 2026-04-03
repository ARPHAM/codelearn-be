import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RunExecution } from './entities/run-execution.entity';
import { ProblemVersion } from '../problem/entities/problem-version.entity';
import { Testcase } from '../problem/entities/testcase.entity';
import { Language } from '../problem/entities/language.entity';
import { RunsProcessor } from './runs.processor';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RunExecution,
      ProblemVersion,
      Testcase,
      Language,
    ]),
    ExecutionModule,
    BullModule.registerQueue({
      name: 'code-execution',
    }),
  ],
  controllers: [RunsController],
  providers: [RunsService, RunsProcessor],
  exports: [RunsService],
})
export class RunsModule {}
