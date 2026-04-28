import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { RunController } from './run.controller';
import { RunService } from './run.service';
import { RunExecution } from './entities/run-execution.entity';
import { ProblemVersion } from '../problem/entities/problem-version.entity';
import { Testcase } from '../problem/entities/testcase.entity';
import { Language } from '../problem/entities/language.entity';
import { ProblemFile } from '../problem/entities/problem-file.entity';
import { RunProcessor } from './run.processor';
import { ExecutionModule } from '../execution/execution.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RunExecution,
      ProblemVersion,
      Testcase,
      Language,
      ProblemFile,
    ]),
    ExecutionModule,
    AdminModule,
    BullModule.registerQueue({
      name: 'code-execution',
    }),
  ],
  controllers: [RunController],
  providers: [RunService, RunProcessor],
  exports: [RunService],
})
export class RunModule {}
