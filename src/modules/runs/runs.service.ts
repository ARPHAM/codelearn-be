import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { RunExecution } from './entities/run-execution.entity';
import { CreateRunDto } from './dto/create-run.dto';
import { ProblemVersion } from '../problems/entities/problem-version.entity';
import { Problem } from '../problems/entities/problem.entity';
import { ProblemExample } from '../problems/entities/problem-example.entity';
import { SubmissionStatus } from '../../shared/enums/submission-status.enum';

@Injectable()
export class RunsService {
  constructor(
    @InjectRepository(RunExecution)
    private runExecutionRepository: Repository<RunExecution>,
    @InjectRepository(ProblemVersion)
    private problemVersionRepository: Repository<ProblemVersion>,
    @InjectRepository(ProblemExample)
    private problemExampleRepository: Repository<ProblemExample>,
    @InjectQueue('code-execution') private codeQueue: Queue,
  ) {}

  async executeRun(userId: number, dto: CreateRunDto) {
    const { problemVersionId, languageId, code, input } = dto;

    const problemVersion = await this.problemVersionRepository.findOne({
      where: { id: problemVersionId },
      relations: ['problem'],
    });

    if (!problemVersion) {
      throw new NotFoundException('Problem version not found');
    }

    const problem = problemVersion.problem;

    const codeBuffer = Buffer.from(code);
    if (codeBuffer.length > problem.maxCodeSize) {
      throw new BadRequestException(`Code size exceeds maximum limit of ${problem.maxCodeSize} bytes`);
    }

    let runInput = input;
    if (!runInput) {
      const firstExample = await this.problemExampleRepository.findOne({
        where: { problemVersionId },
        order: { order: 'ASC' },
      });
      runInput = firstExample?.input || '';
    }

    const runExecution = this.runExecutionRepository.create({
      userId,
      problemVersionId,
      languageId,
      code,
      input: runInput,
      status: SubmissionStatus.QUEUED,
    });

    await this.runExecutionRepository.save(runExecution);

    await this.codeQueue.add('run_job', {
      runId: runExecution.id,
      languageId,
      code,
      input: runInput,
      problemVersionId,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit
    });

    return runExecution;
  }

  async getRun(id: string) {
    const run = await this.runExecutionRepository.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException('Run not found');
    }
    return run;
  }
}
