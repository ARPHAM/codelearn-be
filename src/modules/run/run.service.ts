import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { RunExecution } from './entities/run-execution.entity';
import { CreateRunDto } from './dto/create-run.dto';
import { ProblemVersion } from '../problem/entities/problem-version.entity';
import { Problem } from '../problem/entities/problem.entity';
import { Testcase } from '../problem/entities/testcase.entity';
import { SubmissionStatus } from '../../shared/enums/submission-status.enum';

@Injectable()
export class RunService {
  constructor(
    @InjectRepository(RunExecution)
    private runExecutionRepository: Repository<RunExecution>,
    @InjectRepository(ProblemVersion)
    private problemVersionRepository: Repository<ProblemVersion>,
    @InjectRepository(Testcase)
    private testcaseRepository: Repository<Testcase>,
    @InjectQueue('code-execution') private codeQueue: Queue,
  ) {}

  async executeRun(userId: string, dto: CreateRunDto) {
    const { problemVersionId, languageId, code, input } = dto;
    let timeLimit: number | undefined;
    let memoryLimit: number | undefined;
    let maxCodeSize = 50000;
    let runInput = input || '';

    if (problemVersionId) {
      const problemVersion = await this.problemVersionRepository.findOne({
        where: { id: problemVersionId },
        relations: ['problem'],
      });

      if (!problemVersion) {
        throw new NotFoundException('Problem version not found');
      }

      const problem = problemVersion.problem;
      timeLimit = (problem as any).timeLimit;
      memoryLimit = (problem as any).memoryLimit;
      maxCodeSize = (problem as any).maxCodeSize || 50000;

      if (!runInput) {
        const firstExample = await this.testcaseRepository.findOne({
          where: { problemVersion: { id: problemVersionId }, isHidden: false },
          order: { order: 'ASC' },
        });
        runInput = firstExample?.input || '';
      }
    }

    const codeBuffer = Buffer.from(
      dto.files ? JSON.stringify(dto.files) : dto.code || '',
    );
    if (codeBuffer.length > maxCodeSize) {
      throw new BadRequestException(
        `Code size exceeds maximum limit of ${maxCodeSize} bytes`,
      );
    }

    // Resolve code to store in DB
    const finalCode = dto.files ? JSON.stringify(dto.files) : dto.code || '';
    const entryFile =
      dto.entryFile ||
      (dto.files && dto.files.length > 0 ? dto.files[0].filePath : '');

    const runExecution = this.runExecutionRepository.create({
      userId,
      problemVersionId,
      languageId,
      code: finalCode,
      input: runInput,
      status: SubmissionStatus.QUEUED,
    });

    await this.runExecutionRepository.save(runExecution);

    await this.codeQueue.add('run_job', {
      runId: runExecution.id,
      languageId,
      code: dto.code,
      files: dto.files,
      entryFile,
      input: runInput,
      problemVersionId,
      timeLimit,
      memoryLimit,
    });

    return runExecution;
  }

  async getRun(id: string) {
    const run = await this.runExecutionRepository.findOne({ where: { id } });
    if (!run) {
      throw new NotFoundException('Run not found');
    }
    return {
      id: run.id,
      status: run.status,
      output: run.output,
      compileOutput: run.compileOutput,
      runtime: run.runtime,
      createdAt: run.createdAt,
    };
  }
}
