import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { languageConfig } from '../../config/language.config';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ExecutionGateway } from '../execution/execution.gateway';
import { SubmissionStatus } from '../../shared/enums/submission-status.enum';

const execAsync = promisify(exec);

@Processor('code-execution')
export class SubmissionsProcessor {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    private readonly configService: ConfigService,
    private readonly executionGateway: ExecutionGateway,
  ) {}

  @Process()
  async handleCodeExecution(job: Job) {
    console.log("========== JOB START ==========");
    console.log("JOB RECEIVED:", job.id);
    console.log("JOB DATA:", job.data);

    const { submissionId, language, files, mainFile } = job.data;
    // console.log(job.data);

    const tmpDirBase = this.configService.get<string>('CODE_TMP_DIR', './.tmp');
    const memoryLimit = this.configService.get<string>('DOCKER_MEMORY_LIMIT', '128m');
    const cpuLimit = this.configService.get<string>('DOCKER_CPU_LIMIT', '0.5');
    const timeout = Number(this.configService.get('CODE_TIMEOUT', 5000));

    const workspace = path.resolve(tmpDirBase, String(job.id));

    console.log("Workspace path:", workspace);

    let execResult = {
      status: SubmissionStatus.RUNTIME_ERROR,
      stdout: '',
      stderr: '',
      executionTime: 0,
    };

    try {
      console.log("STEP 1: Creating workspace...");
      await fs.mkdir(workspace, { recursive: true });
      console.log("Workspace created");

      console.log("STEP 2: Writing files...");

      for (const file of files) {
        const filePath = path.join(workspace, file.path); // FIX: dùng path thay vì filename
        console.log("Writing file:", filePath);

        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      console.log("Files in workspace:", await fs.readdir(workspace));

      console.log("STEP 3: Loading language config...");
      const langConf = languageConfig[language];

      if (!langConf) {
        throw new Error(`Unsupported language: ${language}`);
      }

      console.log("Language config:", langConf);

      let runCommand = langConf.run;

      if (mainFile) {
        runCommand = runCommand.replace('{entry}', mainFile || 'main.py');
      }

      console.log("Run command:", runCommand);

      console.log("STEP 4: Preparing docker command...");
      const startTime = Date.now();
      const workspaceUnix = workspace.replace(/\\/g, '/');

      const dockerCmd = [
        'docker run',
        '--rm',
        `--memory=${memoryLimit}`,
        `--memory-swap=${memoryLimit}`,
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

      console.log("Docker command:");
      console.log(dockerCmd);

      try {
        console.log("STEP 5: Running docker...");

        const { stdout, stderr } = await execAsync(dockerCmd, { timeout });

        console.log("Docker finished");

        execResult.stdout = stdout;
        execResult.stderr = stderr;
        execResult.status = SubmissionStatus.ACCEPTED;

        console.log("STDOUT:", stdout);
        console.log("STDERR:", stderr);

      } catch (error: any) {
        console.log("Docker execution error");

        execResult.stdout = error.stdout || '';
        execResult.stderr = error.stderr || error.message || 'Execution error';

        if (error.killed || error.signal === 'SIGTERM') {
          execResult.status = SubmissionStatus.TIME_LIMIT;
        } else {
          execResult.status = SubmissionStatus.RUNTIME_ERROR;
        }

        console.log("Error stdout:", execResult.stdout);
        console.log("Error stderr:", execResult.stderr);
      } finally {
        execResult.executionTime = Date.now() - startTime;
        console.log("Execution time:", execResult.executionTime, "ms");
      }

    } catch (globalError: any) {
      console.log("SYSTEM ERROR:", globalError);

      execResult.stderr = globalError.message || 'System error setup';
      execResult.status = SubmissionStatus.RUNTIME_ERROR;
    } finally {
      console.log("STEP 6: Updating database...");

      try {
        await this.submissionRepo.update(submissionId, {
          status: execResult.status,
          errorMessage: execResult.stderr,
          runtime: execResult.executionTime,
        });

        console.log("Database updated successfully");

      } catch (dbError) {
        console.error("DB UPDATE ERROR:", dbError);
      }

      console.log("STEP 7: Sending websocket result...");

      try {
        this.executionGateway.sendResult(submissionId, {
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          status: execResult.status,
        });

        console.log("Websocket event sent");

      } catch (wsError) {
        console.error("Websocket error:", wsError);
      }

      console.log("STEP 8: Cleaning workspace...");

      try {
        await fs.rm(workspace, { recursive: true, force: true });
        console.log("Workspace cleaned");
      } catch (cleanupError) {
        console.error(`Failed to cleanup workspace ${workspace}:`, cleanupError);
      }

      console.log("========== JOB END ==========");
    }
  }
}