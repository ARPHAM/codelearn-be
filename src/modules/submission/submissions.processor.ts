import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Repository, Like } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { Language } from '../problem/entities/language.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ExecutionGateway } from '../execution/execution.gateway';
import { SubmissionStatus } from '../../shared/enums/submission-status.enum';
import { Testcase } from '../problem/entities/testcase.entity';

const execAsync = promisify(exec);

@Processor('code-execution')
export class SubmissionsProcessor {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Testcase)
    private readonly testcaseRepo: Repository<Testcase>,
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
    private readonly configService: ConfigService,
    private readonly executionGateway: ExecutionGateway,
  ) {}

  @Process()
  async handleCodeExecution(job: Job) {
    console.log("========== JOB START ==========");
    console.log("JOB RECEIVED:", job.id);
    console.log("JOB DATA:", job.data);

    const { submissionId, language, files, entryFile, problemVersionId } = job.data;

    const tmpDirBase = this.configService.get<string>('CODE_TMP_DIR', './.tmp');
    const memoryLimit = this.configService.get<string>('DOCKER_MEMORY_LIMIT', '128m');
    const cpuLimit = this.configService.get<string>('DOCKER_CPU_LIMIT', '0.5');
    const globalTimeout = Number(this.configService.get('CODE_TIMEOUT', 5000));

    const workspace = path.resolve(tmpDirBase, String(job.id));
    console.log("Workspace path:", workspace);

    let finalStatus = SubmissionStatus.ACCEPTED;
    let totalScore = 0;
    let testcasesPassed = 0;
    let maxRuntime = 0;
    let totalMemory = 0;
    let lastError = '';
    const results: any[] = [];

    try {
      // STEP 1: Creating workspace
      console.log(`[Submission] Job started for ID: ${submissionId}`);
      await fs.mkdir(workspace, { recursive: true });

      // STEP 2: Writing files
      console.log(`[Submission] Writing ${files.length} files to workspace...`);
      for (const file of files) {
        const filePath = path.join(workspace, file.filePath);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      // STEP 3: Loading language config from DB
      // Use a case-insensitive search for flexibility (e.g., "Python (Data Science)")
      const languageEntity = await this.languageRepo.createQueryBuilder('lang')
        .where('LOWER(lang.name) LIKE :name', { name: `%${language.toLowerCase()}%` })
        .getOne();

      if (!languageEntity) {
        throw new Error(`Unsupported or missing language in DB: ${language}`);
      }

      console.log(`[Submission] Using language: ${languageEntity.name} (Image: ${languageEntity.dockerImage})`);
      const dockerImage = languageEntity.dockerImage;
      const runCmd = languageEntity.runCmd;
      const compileCmd = languageEntity.compileCmd;

      // STEP 4: Fetch Testcases
      const testcases = await this.testcaseRepo.find({
        where: { problemVersion: { id: problemVersionId } },
        order: { order: 'ASC' },
      });

      console.log(`Evaluating ${testcases.length} testcases...`);

      // STEP 5: Loop through testcases
      for (let i = 0; i < testcases.length; i++) {
        const tc = testcases[i];
        const inputPath = path.join(workspace, '.std_input.txt');
        await fs.writeFile(inputPath, tc.input);

        // Build the base command
        let basePart = runCmd.replace('{entry}', entryFile || 'main.py');
        if (compileCmd) {
            basePart = `${compileCmd} && ${basePart}`;
        }

        const finalCommand = `${basePart} < .std_input.txt`;

        const startTime = Date.now();
        const workspaceUnix = workspace.replace(/\\/g, '/');

        const dockerCmd = `docker run --rm \
          --memory="${memoryLimit}" --cpus="${cpuLimit}" \
          --pids-limit=64 --network=none --read-only \
          --tmpfs /tmp:rw,size=64m --security-opt=no-new-privileges \
          --ulimit cpu=5 \
          -v "${workspaceUnix}:/workspace" -w /workspace \
          ${dockerImage} \
          sh -c "${finalCommand.replace(/"/g, '\\"')}"`;
          
        console.log(`[Submission] Full Docker CLI: ${dockerCmd}`);

        let tcStatus = SubmissionStatus.ACCEPTED;
        let tcStdout = '';
        let tcStderr = '';

        try {
          const { stdout, stderr } = await execAsync(dockerCmd, { timeout: globalTimeout });
          tcStdout = stdout.trim();
          tcStderr = stderr;

          // Compare output
          const expected = tc.expectedOutput.trim();
          if (tcStdout !== expected) {
            tcStatus = SubmissionStatus.WRONG_ANSWER;
          }
        } catch (error: any) {
          tcStdout = error.stdout || '';
          tcStderr = error.stderr || error.message || 'Execution error';

          if (error.killed || error.signal === 'SIGTERM') {
            tcStatus = SubmissionStatus.TIME_LIMIT;
          } else {
            tcStatus = SubmissionStatus.RUNTIME_ERROR;
          }
        }

        const runtime = Date.now() - startTime;
        maxRuntime = Math.max(maxRuntime, runtime);

        if (tcStatus === SubmissionStatus.ACCEPTED) {
          testcasesPassed++;
          totalScore += tc.score;
        } else if (finalStatus === SubmissionStatus.ACCEPTED) {
          // Update overall status to the first failing status encountered
          finalStatus = tcStatus;
          lastError = tcStderr;
        }

        results.push({
          id: tc.id,
          status: tcStatus,
          runtime,
          passed: tcStatus === SubmissionStatus.ACCEPTED
        });

        console.log(`Testcase ${i + 1}: ${tcStatus} (${runtime}ms)`);
      }

    } catch (globalError: any) {
      console.log("SYSTEM ERROR:", globalError);
      lastError = globalError.message || 'System error setup';
      finalStatus = SubmissionStatus.RUNTIME_ERROR;
    } finally {
      // STEP 6: Updating database
      try {
        await this.submissionRepo.update(submissionId, {
          status: finalStatus,
          errorMessage: lastError,
          runtime: maxRuntime,
          score: totalScore,
          testcasePassed: testcasesPassed,
          results: JSON.stringify(results),
        });
      } catch (dbError) {
        console.error("DB UPDATE ERROR:", dbError);
      }

      // STEP 7: Sending websocket result
      try {
        this.executionGateway.sendResult(submissionId, {
          status: finalStatus,
          score: totalScore,
          testcasesPassed,
          testcasesTotal: results.length,
          results: results,
          error: lastError
        });
        console.log(`[Submission] Result emitted via WebSocket for ID: ${submissionId}`);
      } catch (wsError) {
        console.error(`[Submission] WebSocket error: ${wsError}`);
      }

      // STEP 8: Cleaning workspace
      try {
        await fs.rm(workspace, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`Failed to cleanup workspace ${workspace}:`, cleanupError);
      }

      console.log("========== JOB END ==========");
    }
  }
}