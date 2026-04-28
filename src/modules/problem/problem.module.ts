import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemController } from './problem.controller';
import { ProblemService } from './problem.service';

import { Problem } from './entities/problem.entity';
import { ProblemVersion } from './entities/problem-version.entity';
import { Testcase } from './entities/testcase.entity';
import { Language } from './entities/language.entity';
import { ProblemFile } from './entities/problem-file.entity';
import { ProblemStats } from './entities/problem-stats.entity';
import { AssignmentProblem } from '../assignment/entities/assignment-problem.entity';
import { BullModule } from '@nestjs/bull';

import { Submission } from '../submission/entities/submission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Problem,
      ProblemVersion,
      Testcase,
      Language,
      ProblemFile,
      ProblemStats,
      AssignmentProblem,
      Submission,
    ]),
    BullModule.registerQueue({
      name: 'code-execution',
    }),
  ],
  controllers: [ProblemController],
  providers: [ProblemService],
  exports: [ProblemService],
})
export class ProblemModule {}
