import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RunExecution } from './entities/run-execution.entity';
import { Language } from '../problem/entities/language.entity';
import { SubmissionStatus } from '../../shared/enums/submission-status.enum';
import { languageConfig } from '../../config/language.config';
import { ExecutionGateway } from '../execution/execution.gateway';

const execAsync = promisify(exec);

@Processor('code-execution')
export class RunsProcessor {
  constructor(
    @InjectRepository(RunExecution)
    private readonly runExecutionRepo: Repository<RunExecution>,
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
    private readonly configService: ConfigService,
    private readonly executionGateway: ExecutionGateway,
  ) {}

  @Process('run_job')
  async handleRunExecution(job: Job) {
    console.log("========== RUN JOB START ==========");
    console.log("JOB DATA:", job.data);

    const { runId, languageId, code, input, timeLimit, memoryLimit } = job.data;

    // Update status to RUNNING
    await this.runExecutionRepo.update(runId, { status: SubmissionStatus.RUNNING });

    const tmpDirBase = this.configService.get<string>('CODE_TMP_DIR', './.tmp');
    const dockerMemoryLimit = `${memoryLimit || 256}m`;
    const cpuLimit = this.configService.get<string>('DOCKER_CPU_LIMIT', '0.5');
    const timeout = Number(timeLimit || 5000) + 1000; // Provide leeway for docker startup

    const workspace = path.resolve(tmpDirBase, `run_${runId}`);
    
    let execResult = {
      status: SubmissionStatus.RUNTIME_ERROR,
      output: '',
      compileOutput: '',
      executionTime: 0,
    };

    try {
      await fs.mkdir(workspace, { recursive: true });
      
      const language = await this.languageRepo.findOne({ where: { id: languageId } });
      if (!language) {
        throw new Error(`Language ID ${languageId} not found in database`);
      }
      
      const langConf = languageConfig[language.name];
      if (!langConf) {
        throw new Error(`Unsupported language config for: ${language.name}`);
      }
      
      // Determine file extension
      const fileExt = langConf.ext || '.txt';
      let mainFile = `main${fileExt}`;
      if (language.name === 'java') mainFile = 'Main.java'; // Special case for JavaMain class name requirement

      const filePath = path.join(workspace, mainFile);
      await fs.writeFile(filePath, code);
      
      if (input) {
        await fs.writeFile(path.join(workspace, 'input.txt'), input);
      } else {
        await fs.writeFile(path.join(workspace, 'input.txt'), '');
      }

      let runCommand = langConf.run.replace('{entry}', mainFile);
      // Ensure input is piped to the command
      runCommand = `cat input.txt | ${runCommand}`;

      const startTime = Date.now();
      const workspaceUnix = workspace.replace(/\\/g, '/');

      const dockerCmd = [
        'docker run',
        '--rm',
        `--memory=${dockerMemoryLimit}`,
        `--memory-swap=${dockerMemoryLimit}`,
        `--cpus=${cpuLimit}`,
        '--pids-limit=64',
        '--network=none',
        '--read-only',
        '--tmpfs /tmp:rw,size=64m',
        '--security-opt=no-new-privileges',
        '--ulimit cpu=5',
        `-v ${workspaceUnix}:/app`,
        '-w /app',
        langConf.image,
        `sh -c "${runCommand}"`
      ].join(' ');

      try {
        const { stdout, stderr } = await execAsync(dockerCmd, { timeout });
        execResult.output = stdout;
        execResult.compileOutput = stderr;
        execResult.status = SubmissionStatus.ACCEPTED;
      } catch (error: any) {
        execResult.output = error.stdout || '';
        execResult.compileOutput = error.stderr || error.message || 'Execution error';

        if (error.killed || error.signal === 'SIGTERM') {
          execResult.status = SubmissionStatus.TIME_LIMIT;
        } else {
          execResult.status = SubmissionStatus.RUNTIME_ERROR;
        }
      } finally {
        execResult.executionTime = Date.now() - startTime;
      }

    } catch (globalError: any) {
      execResult.compileOutput = globalError.message || 'System error setup';
      execResult.status = SubmissionStatus.RUNTIME_ERROR;
    } finally {
      try {
        await this.runExecutionRepo.update(runId, {
          status: execResult.status,
          output: execResult.output,
          compileOutput: execResult.compileOutput,
          runtime: execResult.executionTime,
        });
      } catch (dbError) {
        console.error("DB UPDATE ERROR RUNS:", dbError);
      }

      // Send WS Result
      try {
        this.executionGateway.sendResult(runId, {
          status: execResult.status,
          output: execResult.output,
          compileOutput: execResult.compileOutput,
          runtime: execResult.executionTime,
        });
      } catch (wsError) {
        console.error("WS ERROR RUNS:", wsError);
      }

      try {
        await fs.rm(workspace, { recursive: true, force: true });
      } catch (cleanupError) {
        // Ignore silent cleanup fails
      }
      console.log("========== RUN JOB END ==========");
    }
  }
}
