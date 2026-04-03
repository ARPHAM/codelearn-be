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
      
      console.log(`[RunCode] Job started for ID: ${runId}`);
      
      console.log(`[RunCode] Job started for ID: ${runId}`);
      console.log(`[RunCode] Language: ${language.name} (Image: ${language.dockerImage})`);
      
      const dockerImage = language.dockerImage;
      const runCmd = language.runCmd;
      const compileCmd = language.compileCmd;
      const fileExt = language.ext || '.txt';

      console.log(`[RunCode] Workspace: ${workspace}`);
      await fs.mkdir(workspace, { recursive: true });
      
      // Write files to workspace
      if (job.data.files && Array.isArray(job.data.files)) {
        console.log(`[RunCode] Writing ${job.data.files.length} files...`);
        for (const file of job.data.files) {
          const fullPath = path.join(workspace, file.filePath);
          await fs.mkdir(path.dirname(fullPath), { recursive: true });
          await fs.writeFile(fullPath, file.content);
        }
      } else {
        console.log(`[RunCode] Writing single code file...`);
        // Backward compatibility for single 'code' field
        let mainFile = `main${fileExt}`;
        if (language.name.toLowerCase() === 'java') mainFile = 'Main.java';
        
        const filePath = path.join(workspace, mainFile);
        await fs.writeFile(filePath, code);
      }
      
      if (input) {
        await fs.writeFile(path.join(workspace, '.std_input.txt'), input);
      } else {
        await fs.writeFile(path.join(workspace, '.std_input.txt'), '');
      }

      const entryFile = job.data.entryFile || (job.data.files && job.data.files.length > 0 ? job.data.files[0].filePath : 'main' + fileExt);
      
      // Build the base command
      let baseCommand = runCmd.replace('{entry}', entryFile);
      if (compileCmd) {
          baseCommand = `${compileCmd} && ${baseCommand}`;
      }

      // Use input redirection at the end - this is more robust for multi-stage commands
      const finalCommand = `${baseCommand} < .std_input.txt`;

      console.log(`[RunCode] Final command string: ${finalCommand}`);
      const startTime = Date.now();
      const workspaceUnix = workspace.replace(/\\/g, '/');

      const dockerCmd = `docker run --rm \
          --memory="${dockerMemoryLimit}" --cpus="${cpuLimit}" \
          -v "${workspaceUnix}:/workspace" -w /workspace \
          ${dockerImage} \
          sh -c "${finalCommand.replace(/"/g, '\\"')}"`;
          
      console.log(`[RunCode] Full Docker CLI: ${dockerCmd}`);

      try {
        const { stdout, stderr } = await execAsync(dockerCmd, { timeout });
        execResult.output = stdout;
        execResult.compileOutput = stderr;
        execResult.status = SubmissionStatus.ACCEPTED;
        console.log(`[RunCode] Exec success. Output length: ${stdout.length}`);
      } catch (error: any) {
        console.warn(`[RunCode] Exec error or timeout: ${error.message}`);
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
        console.log(`[RunCode] Result emitted to Socket.io for runId: ${runId}`);
      } catch (wsError: any) {
        console.error(`[RunCode] Failed to emit websocket: ${wsError.message}`);
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
