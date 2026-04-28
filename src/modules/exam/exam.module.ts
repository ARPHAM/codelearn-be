import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { Exam } from './entities/exam.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { ExamLog } from './entities/exam-log.entity';
import { ExamProblem } from './entities/exam-problem.entity';
import { ExamStudentProblem } from './entities/exam-student-problem.entity';
import { ExamGenerationService } from './exam-generation.service';
import { ExamRegradeService } from './exam-regrade.service';
import { BankItem } from '../bank/entities/bank-item.entity';
import { Course } from '../course/entities/course.entity';
import { Submission } from '../submission/entities/submission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam,
      ExamAttempt,
      ExamLog,
      ExamProblem,
      ExamStudentProblem,
      BankItem,
      Course,
      Submission,
    ]),
    BullModule.registerQueue({
      name: 'code-execution',
    }),
  ],
  controllers: [ExamController],
  providers: [ExamService, ExamGenerationService, ExamRegradeService],
  exports: [ExamService, ExamGenerationService, ExamRegradeService],
})
export class ExamModule {}
