import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RunsController } from './runs.controller';
import { RunsService } from './runs.service';
import { RunExecution } from './entities/run-execution.entity';
import { ProblemVersion } from '../problems/entities/problem-version.entity';
import { ProblemExample } from '../problems/entities/problem-example.entity';
import { Language } from '../problems/entities/language.entity';
import { RunsProcessor } from './runs.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RunExecution,
      ProblemVersion,
      ProblemExample,
      Language,
    ]),
    BullModule.registerQueue({
      name: 'code-execution',
    }),
  ],
  controllers: [RunsController],
  providers: [RunsService, RunsProcessor],
  exports: [RunsService],
})
export class RunsModule {}
