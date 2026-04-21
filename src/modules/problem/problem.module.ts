import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemController } from './problem.controller';
import { ProblemService } from './problem.service';

import { Problem } from './entities/problem.entity';
import { ProblemVersion } from './entities/problem-version.entity';
import { Testcase } from './entities/testcase.entity';
import { Language } from './entities/language.entity';
import { ProblemLanguageFile } from './entities/problem-language-file.entity';
import { ProblemFile } from './entities/problem-file.entity';
import { ProblemStats } from './entities/problem-stats.entity';
import { AssignmentProblem } from '../assignment/entities/assignment-problem.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Problem,
      ProblemVersion,
      Testcase,
      Language,
      ProblemLanguageFile,
      ProblemFile,
      ProblemStats,
      AssignmentProblem,
    ]),
  ],
  controllers: [ProblemController],
  providers: [ProblemService],
  exports: [ProblemService],
})
export class ProblemModule {}
