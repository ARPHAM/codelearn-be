import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { RunExecution } from './entities/run-execution.entity';
import { CreateRunDto } from './dto/create-run.dto';
import { ProblemVersion } from '../problem/entities/problem-version.entity';
import { Problem } from '../problem/entities/problem.entity';
import { Testcase } from '../problem/entities/testcase.entity';
import { SubmissionStatus } from '../../shared/enums/submission-status.enum';
import { ProblemFile } from '../problem/entities/problem-file.entity';
import { fillTemplate } from '../problem/utils/template.util';

@Injectable()
export class RunService {
  constructor(
    @InjectRepository(RunExecution)
    private runExecutionRepository: Repository<RunExecution>,
    @InjectRepository(ProblemVersion)
    private problemVersionRepository: Repository<ProblemVersion>,
    @InjectRepository(Testcase)
    private testcaseRepository: Repository<Testcase>,
    @InjectRepository(ProblemFile)
    private problemFileRepository: Repository<ProblemFile>,
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

    // Resolve code logic
    let finalFiles: any[] = [];
    let entryFile = dto.entryFile;
    const finalCode = dto.code || '';

    // Check if we are in an exam context for Run
    const isExam = !!(dto as any).examId;

    if (problemVersionId) {
      const problemVersion = await this.problemVersionRepository.findOne({
        where: { id: problemVersionId },
      });
      const workspaceConfig = problemVersion?.workspaceConfig || {};
      const canCreateFile = workspaceConfig.canCreateFile !== false;
      const canChangeMainFile = workspaceConfig.canChangeMainFile === true;

      if (isExam) {
        // Strict Mode for Run in Exam
        const templateFiles = await this.problemFileRepository.find({
          where: {
            problemVersion: { id: problemVersionId },
            type: 'TEMPLATE',
            language: { id: languageId },
          },
        });
        const templatePaths = templateFiles.map((t) => t.path);
        
        // Ưu tiên tìm Entry File cụ thể cho ngôn ngữ này (trong Template, Neutral hoặc Hidden)
        const langEntryFile = (await this.problemFileRepository.findOne({
          where: { problemVersion: { id: problemVersionId }, language: { id: languageId }, isEntryFile: true }
        }))?.path;
        
        const systemEntryFile = langEntryFile || problemVersion?.entryFile;

        for (const tFile of templateFiles) {
          let content = tFile.content;
          if (tFile.isFillInTheBlank) {
            const fileAnswers = dto.answers ? dto.answers[tFile.path] : null;
            if (fileAnswers) content = fillTemplate(tFile.content, fileAnswers);
          } else if (tFile.isReadonly) {
            content = tFile.content;
          } else {
            const feFile = dto.files?.find((f) => f.filePath === tFile.path);
            if (feFile) content = feFile.content;
          }
          finalFiles.push({ filePath: tFile.path, content });
        }

        // Xác định entryFile cho Run (Exam context)
        if (!canChangeMainFile && systemEntryFile) {
          entryFile = systemEntryFile;
        } else if (!entryFile && systemEntryFile) {
          entryFile = systemEntryFile;
        }

        if (canCreateFile && dto.files) {
          for (const feFile of dto.files) {
            if (!templatePaths.includes(feFile.filePath)) {
              finalFiles.push({ filePath: feFile.filePath, content: feFile.content });
            }
          }
        }
      } else {
        // Freestyle Mode for Run
        finalFiles =
          dto.files?.map((f) => ({ filePath: f.filePath, content: f.content })) ||
          [];
      }

      // Add System Files (Neutral/Hidden)
      const systemFiles = await this.problemFileRepository.find({
        where: [
          { problemVersion: { id: problemVersionId }, type: 'NEUTRAL' },
          {
            problemVersion: { id: problemVersionId },
            language: { id: languageId },
            type: 'HIDDEN',
          },
        ],
      });

      for (const sFile of systemFiles) {
        if (!finalFiles.find((f) => f.filePath === sFile.path)) {
          finalFiles.push({ filePath: sFile.path, content: sFile.content });
        }
        if (sFile.isEntryFile && !entryFile) entryFile = sFile.path;
      }
    } else {
      // Basic Run without problem context
      finalFiles =
        dto.files?.map((f) => ({ filePath: f.filePath, content: f.content })) ||
        [];
    }

    if (!entryFile && finalFiles.length > 0) {
      entryFile = finalFiles[0].filePath;
    }

    const runExecution = this.runExecutionRepository.create({
      userId,
      problemVersionId,
      languageId: dto.languageId,
      code: finalFiles.length > 0 ? JSON.stringify(finalFiles) : finalCode,
      input: runInput,
      status: SubmissionStatus.QUEUED,
    });

    await this.runExecutionRepository.save(runExecution);

    await this.codeQueue.add('run_job', {
      runId: runExecution.id,
      languageId: dto.languageId,
      code: finalCode, 
      files: finalFiles, 
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
