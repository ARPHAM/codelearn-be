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

const execAsync = promisify(exec);

@Processor('code-execution')
export class SubmissionsProcessor {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    private readonly configService: ConfigService,
  ) {}

  @Process()
  async handleCodeExecution(job: Job) {
    const { submissionId, language, files } = job.data;

    const tmpDirBase = this.configService.get<string>('CODE_TMP_DIR', './.tmp');
    const memoryLimit = this.configService.get<string>('DOCKER_MEMORY_LIMIT', '128m');
    const cpuLimit = this.configService.get<string>('DOCKER_CPU_LIMIT', '0.5');
    const timeout = this.configService.get<number>('CODE_TIMEOUT', 5000);

    const workspace = path.resolve(tmpDirBase, String(job.id));

    let execResult = {
      status: 'FAILED',
      stdout: '',
      stderr: '',
      executionTime: 0,
    };

    try {
      // 1. Create workspace folder
      await fs.mkdir(workspace, { recursive: true });

      // 2. Write all files from payload
      for (const file of files) {
        const filePath = path.join(workspace, file.path);
        // Ensure subdirectories exist if file.path has them
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      // 3. Get language config

      const langConf = languageConfig[language];
      if (!langConf) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // 4. Execute code using Docker
      const startTime = Date.now();
      const workspaceUnix = workspace.replace(/\\/g, '/');
      const dockerCmd = `docker run --rm --memory=${memoryLimit} --cpus=${cpuLimit} --network none -v ${workspaceUnix}:/app -w /app ${langConf.image} bash -c '${langConf.run}'`;

      try {
        const { stdout, stderr } = await execAsync(dockerCmd, { timeout });
        execResult.stdout = stdout;
        execResult.stderr = stderr;
        execResult.status = 'COMPLETED';
      } catch (error: any) {
        execResult.stdout = error.stdout || '';
        execResult.stderr = error.stderr || error.message || 'Execution error';
        if (error.killed || error.signal === 'SIGTERM') {
          execResult.status = 'TIME_LIMIT_EXCEEDED';
        } else {
          execResult.status = 'RUNTIME_ERROR';
        }
      } finally {
        execResult.executionTime = Date.now() - startTime;
      }
    } catch (globalError: any) {
      execResult.stderr = globalError.message || 'System error setup';
      execResult.status = 'SYSTEM_ERROR';
    } finally {
      // 5. Update submission record in database
      // The user wants update on: status, stdout, stderr, executionTime.
      // But let's check what fields Submission entity actually has. We will just use what typical entities have,
      // mapping executionTime to cpuTime if needed, and saving stdout.
      await this.submissionRepo.update(submissionId, {
        status: execResult.status as any,
        stdout: execResult.stdout,
        stderr: execResult.stderr,
        cpuTime: execResult.executionTime / 1000, 
      });

      // 6. Delete workspace folder
      try {
        await fs.rm(workspace, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`Failed to cleanup workspace ${workspace}:`, cleanupError);
      }
    }
  }
}
