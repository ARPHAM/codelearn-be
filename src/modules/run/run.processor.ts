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
import { SystemSettingsService } from '../admin/system-settings.service';

const execAsync = promisify(exec);

@Processor('code-execution')
export class RunProcessor {
  constructor(
    @InjectRepository(RunExecution)
    private readonly runExecutionRepo: Repository<RunExecution>,
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
    private readonly configService: ConfigService,
    private readonly executionGateway: ExecutionGateway,
    private readonly systemSettingsService: SystemSettingsService,
  ) {}

  @Process('run_job')
  async handleRunExecution(job: Job) {
    console.log('========== RUN JOB START ==========');
    console.log('JOB DATA:', job.data);

    const { runId, languageId, code, input, timeLimit, memoryLimit } = job.data;

    // Update status to RUNNING
    await this.runExecutionRepo.update(runId, {
      status: SubmissionStatus.RUNNING,
    });

    const tmpDirBase = this.configService.get<string>('CODE_TMP_DIR', './.tmp');

    // Fetch dynamic settings
    const defaultMemory =
      await this.systemSettingsService.getSettingValue<number>(
        'sandbox.default_memory_limit',
        256,
      );
    const defaultCpu = await this.systemSettingsService.getSettingValue<number>(
      'sandbox.cpu_limit',
      0.5,
    );
    const defaultTimeout =
      await this.systemSettingsService.getSettingValue<number>(
        'sandbox.default_timeout',
        5000,
      );

    const language = await this.languageRepo.findOne({
      where: { id: languageId },
    });
    if (!language) {
      throw new Error(`Language ID ${languageId} not found in database`);
    }

    const memoryLmt =
      memoryLimit || language.defaultMemoryLimit || defaultMemory;
    const cpuLmt = language.defaultCpuLimit || defaultCpu;
    const timeLmt = timeLimit || language.defaultTimeout || defaultTimeout;

    const dockerMemoryLimit = `${memoryLmt}m`;
    const finalCpuLimit = String(cpuLmt);
    const timeout = Number(timeLmt) + 1000; // Provide leeway for docker startup

    const workspace = path.resolve(tmpDirBase, `run_${runId}`);

    const execResult = {
      status: SubmissionStatus.RUNTIME_ERROR,
      output: '',
      compileOutput: '',
      executionTime: 0,
    };

    try {
      await fs.mkdir(workspace, { recursive: true });

      console.log(`[RunCode] Job started for ID: ${runId}`);
      console.log(
        `[RunCode] Language: ${language.name} (Image: ${language.dockerImage})`,
      );

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

      const entryFile =
        job.data.entryFile ||
        (job.data.files && job.data.files.length > 0
          ? job.data.files[0].filePath
          : 'main' + fileExt);

      // Build the base command - keep it separate for the wrapper
      let baseCommand = runCmd.replace('{entry}', entryFile);
      if (compileCmd) {
        baseCommand = `${compileCmd} && ${baseCommand}`;
      }

      // Create a script wrapper file inside the workspace
      // This is much more stable for Windows CLI than passing long escaped strings
      const marker = `__CODEEXEC_${runId}__`;
      const timeLimitSecs = Math.ceil(timeLmt / 1000);
      const wrapperScriptPath = path.join(workspace, '_exec_wrapper.sh');

      const wrapperContent = [
        '#!/bin/sh',
        // Run compilation if present (don't time this part)
        compileCmd ? `${compileCmd}` : '',
        // Start timing now
        `s=$(date +%s%N)`,
        `timeout ${timeLimitSecs}s ${runCmd.replace('{entry}', entryFile)} < .std_input.txt`,
        `ret=$?`,
        `e=$(date +%s%N)`,
        `echo`,
        `echo "${marker}runtime:$(( (e-s)/1000000 ))"`,
        `echo "${marker}exitcode:$ret"`,
        `exit $ret`,
      ]
        .filter((line) => line !== '')
        .join('\n');

      await fs.writeFile(wrapperScriptPath, wrapperContent);
      console.log(`[RunCode] Created wrapper script: ${wrapperScriptPath}`);

      const startTime = Date.now();
      const workspaceUnix = workspace.replace(/\\/g, '/');

      const dockerCmd = [
        'docker run --rm',
        `--memory="${dockerMemoryLimit}"`,
        `--cpus="${finalCpuLimit}"`,
        `-v "${workspaceUnix}:/workspace"`,
        '-w /workspace',
        dockerImage,
        `sh _exec_wrapper.sh`,
      ].join(' ');

      console.log(`[RunCode] Full Docker CLI: ${dockerCmd}`);

      try {
        const { stdout, stderr } = await execAsync(dockerCmd, { timeout });

        // Parse metadata from stdout
        let cleanStdout = stdout;
        let internalRuntime = 0;
        let internalExitCode = 0;

        const runtimeMatch = stdout.match(
          new RegExp(`${marker}runtime:(\\d+)`),
        );
        if (runtimeMatch) {
          internalRuntime = parseInt(runtimeMatch[1]);
          cleanStdout = cleanStdout.replace(runtimeMatch[0], '');
        }

        const exitCodeMatch = stdout.match(
          new RegExp(`${marker}exitcode:(\\d+)`),
        );
        if (exitCodeMatch) {
          internalExitCode = parseInt(exitCodeMatch[1]);
          cleanStdout = cleanStdout.replace(exitCodeMatch[0], '');
        }

        // Handle specific internal exit codes
        // 124 is standard for 'timeout' command failure
        if (internalExitCode === 124) {
          execResult.status = SubmissionStatus.TIME_LIMIT;
          execResult.compileOutput = 'Time Limit Exceeded';
        } else if (internalExitCode !== 0) {
          execResult.status = SubmissionStatus.RUNTIME_ERROR;
          execResult.compileOutput =
            stderr || `Runtime Error (Exit Code: ${internalExitCode})`;
        } else {
          execResult.status = SubmissionStatus.ACCEPTED;
        }

        execResult.output = cleanStdout.trim();
        execResult.executionTime = internalRuntime; // Use the precise internal runtime
      } catch (error: any) {
        console.warn(`[RunCode] Exec error or timeout: ${error.message}`);
        execResult.output = error.stdout || '';

        if (error.killed || error.signal === 'SIGTERM') {
          execResult.status = SubmissionStatus.TIME_LIMIT;
          execResult.compileOutput = 'Time Limit Exceeded';
        } else {
          execResult.status = SubmissionStatus.RUNTIME_ERROR;

          // Use stderr if available, otherwise hide the raw command message
          let cleanError = (error.stderr || '').trim();
          if (!cleanError) {
            const rawMsg = error.message || '';
            if (
              rawMsg.includes('docker run') ||
              rawMsg.includes('Command failed')
            ) {
              cleanError = 'Runtime Error';
            } else {
              cleanError = rawMsg || 'Execution Error';
            }
          }
          execResult.compileOutput = cleanError;
        }
      } finally {
        // If we didn't get an internal runtime (e.g. error), use wall clock minus some overhead?
        // No, keep the internal measurement if available
        if (!execResult.executionTime) {
          execResult.executionTime = Math.max(0, Date.now() - startTime - 500); // Rough estimate for startup
        }
      }
    } catch (globalError: any) {
      execResult.compileOutput = 'Internal Sandbox Error';
      execResult.status = SubmissionStatus.RUNTIME_ERROR;
      console.error('[RunProcessor] Global Error:', globalError);
    } finally {
      try {
        await this.runExecutionRepo.update(runId, {
          status: execResult.status,
          output: execResult.output,
          compileOutput: execResult.compileOutput,
          runtime: execResult.executionTime,
        });
      } catch (dbError) {
        console.error('DB UPDATE ERROR RUNS:', dbError);
      }

      // Send WS Result
      try {
        this.executionGateway.sendResult(runId, {
          status: execResult.status,
          output: execResult.output,
          compileOutput: execResult.compileOutput,
          runtime: execResult.executionTime,
        });
        console.log(
          `[RunCode] Result emitted to Socket.io for runId: ${runId}`,
        );
      } catch (wsError: any) {
        console.error(`[RunCode] Failed to emit websocket: ${wsError.message}`);
      }

      try {
        await fs.rm(workspace, { recursive: true, force: true });
      } catch (cleanupError) {
        // Ignore silent cleanup fails
      }
      console.log('========== RUN JOB END ==========');
    }
  }
}
