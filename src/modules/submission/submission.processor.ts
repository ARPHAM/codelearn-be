import { Process, Processor } from '@nestjs/bull';
import { Inject, forwardRef } from '@nestjs/common';
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
import { ProblemVersion } from '../problem/entities/problem-version.entity';
import { SystemSettingsService } from '../admin/system-settings.service';
import { BattleService } from '../battle/battle.service';

const execAsync = promisify(exec);

@Processor('code-execution')
export class SubmissionProcessor {
  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(Testcase)
    private readonly testcaseRepo: Repository<Testcase>,
    @InjectRepository(ProblemVersion)
    private readonly versionRepo: Repository<ProblemVersion>,
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
    private readonly configService: ConfigService,
    private readonly executionGateway: ExecutionGateway,
    private readonly systemSettingsService: SystemSettingsService,
    @Inject(forwardRef(() => BattleService))
    private readonly battleService: BattleService,
  ) {}

  @Process()
  async handleCodeExecution(job: Job) {
    console.log('========== JOB START ==========');
    console.log('JOB RECEIVED:', job.id);
    console.log('JOB DATA:', job.data);

    const {
      submissionId,
      language,
      files,
      entryFile,
      problemVersionId,
      memoryLimit,
      timeLimit,
    } = job.data;

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

    const workspace = path.resolve(tmpDirBase, String(job.id));
    console.log('Workspace path:', workspace);

    let finalStatus = SubmissionStatus.ACCEPTED;
    let totalScore = 0;
    let totalMaxScore = 0;
    let testcasesPassed = 0;
    let totalRuntime = 0;
    let maxMemory = 0;
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
      const languageEntity = await this.languageRepo
        .createQueryBuilder('lang')
        .where('LOWER(lang.name) LIKE :name', {
          name: `%${language.toLowerCase()}%`,
        })
        .getOne();

      if (!languageEntity) {
        throw new Error(`Unsupported or missing language in DB: ${language}`);
      }

      console.log(
        `[Submission] Using language: ${languageEntity.name} (Image: ${languageEntity.dockerImage})`,
      );
      const dockerImage = languageEntity.dockerImage;
      const runCmd = languageEntity.runCmd;
      const compileCmd = languageEntity.compileCmd;

      const memoryLmt =
        memoryLimit || languageEntity.defaultMemoryLimit || defaultMemory;
      const cpuLmt = languageEntity.defaultCpuLimit || defaultCpu;
      const timeLmt =
        timeLimit || languageEntity.defaultTimeout || defaultTimeout;

      const finalMemoryLimit = `${memoryLmt}m`;
      const finalCpuLimit = String(cpuLmt);
      const executionTimeout = Number(timeLmt) + 1000;

      // STEP 4: Fetch Testcases
      const testcases = await this.testcaseRepo.find({
        where: { problemVersion: { id: problemVersionId } },
        order: { order: 'ASC' },
      });

      console.log(`Evaluating ${testcases.length} testcases...`);

      // STEP 5: Compile if necessary (Once for all testcases)
      if (compileCmd) {
        console.log(`[Submission] Compiling with image ${dockerImage}...`);
        const compileFullCmd = [
          'docker run --rm',
          `--memory="${finalMemoryLimit}"`,
          `--cpus="${finalCpuLimit}"`,
          `-v "${workspace.replace(/\\/g, '/')}:/workspace"`,
          '-w /workspace',
          dockerImage,
          `sh -c "${compileCmd.replace(/"/g, '\\"')}"`,
        ].join(' ');

        try {
          const { stderr } = await execAsync(compileFullCmd, {
            timeout: 30000,
          }); // 30s for compilation
          if (stderr)
            console.warn(`[Submission] Compile Warning/Error: ${stderr}`);
        } catch (error: any) {
          console.error(`[Submission] Compile Failed: ${error.message}`);
          finalStatus = SubmissionStatus.RUNTIME_ERROR;
          lastError = error.stderr || error.message || 'Compilation Error';
          // No need to run testcases if compilation failed
          throw new Error('Compilation Failed');
        }
      }

      console.log(`Evaluating ${testcases.length} testcases...`);

      // STEP 6: Loop through testcases
      for (let i = 0; i < testcases.length; i++) {
        const tc = testcases[i];
        totalMaxScore += tc.score;
        const inputPath = path.join(workspace, '.std_input.txt');
        await fs.writeFile(inputPath, tc.input);

        // Create a script wrapper file inside the workspace for precise metrics
        const marker = `__SUBEXEC_${submissionId}_${tc.id}__`;
        const timeLimitSecs = Math.ceil(executionTimeout / 1000);
        const wrapperScriptPath = path.join(workspace, '_exec_wrapper.sh');

        const wrapperContent = [
          '#!/bin/sh',
          `s=$(date +%s%N)`,
          `timeout ${timeLimitSecs}s ${runCmd.replace('{entry}', entryFile)} < .std_input.txt`,
          `ret=$?`,
          `e=$(date +%s%N)`,
          `# Try to get memory from cgroup v1 or v2`,
          `mem=0`,
          `if [ -f /sys/fs/cgroup/memory/memory.max_usage_in_bytes ]; then mem=$(cat /sys/fs/cgroup/memory/memory.max_usage_in_bytes); fi`,
          `if [ $mem -eq 0 ] && [ -f /sys/fs/cgroup/memory.current ]; then mem=$(cat /sys/fs/cgroup/memory.current); fi`,
          `echo`,
          `echo "${marker}runtime:$(( (e-s)/1000000 ))"`,
          `echo "${marker}memory:$(( mem/1024 ))"`,
          `echo "${marker}exitcode:$ret"`,
          `exit $ret`,
        ].join('\n');

        await fs.writeFile(wrapperScriptPath, wrapperContent);

        const startTime = Date.now();
        const workspaceUnix = workspace.replace(/\\/g, '/');

        const dockerCmd = [
          'docker run --rm',
          `--memory="${finalMemoryLimit}"`,
          `--cpus="${finalCpuLimit}"`,
          '--pids-limit=64 --network=none --read-only',
          '--tmpfs /tmp:rw,size=64m --security-opt=no-new-privileges',
          '--ulimit cpu=5',
          `-v "${workspaceUnix}:/workspace"`,
          '-w /workspace',
          dockerImage,
          `sh _exec_wrapper.sh`,
        ].join(' ');

        console.log(`[Submission] Full Docker CLI: ${dockerCmd}`);

        let tcStatus = SubmissionStatus.ACCEPTED;
        let tcStdout = '';
        let tcStderr = '';
        let tcExecutionTime = 0;
        let tcMemory = 0;

        try {
          const { stdout, stderr } = await execAsync(dockerCmd, {
            timeout: executionTimeout + 2000,
          });

          let cleanStdout = stdout;
          let internalExitCode = 0;

          const runtimeMatch = stdout.match(
            new RegExp(`${marker}runtime:(\\d+)`),
          );
          if (runtimeMatch) {
            tcExecutionTime = parseInt(runtimeMatch[1]);
            cleanStdout = cleanStdout.replace(runtimeMatch[0], '');
          }

          const memoryMatch = stdout.match(
            new RegExp(`${marker}memory:(\\d+)`),
          );
          if (memoryMatch) {
            tcMemory = parseInt(memoryMatch[1]);
            cleanStdout = cleanStdout.replace(memoryMatch[0], '');
          }

          const exitCodeMatch = stdout.match(
            new RegExp(`${marker}exitcode:(\\d+)`),
          );
          if (exitCodeMatch) {
            internalExitCode = parseInt(exitCodeMatch[1]);
            cleanStdout = cleanStdout.replace(exitCodeMatch[0], '');
          }

          if (internalExitCode === 124) {
            tcStatus = SubmissionStatus.TIME_LIMIT;
            tcStderr = 'Time Limit Exceeded';
          } else if (internalExitCode !== 0) {
            tcStatus = SubmissionStatus.RUNTIME_ERROR;
            tcStderr =
              stderr || `Runtime Error (Exit Code: ${internalExitCode})`;
          }

          tcStdout = cleanStdout.trim();

          if (tcStatus === SubmissionStatus.ACCEPTED) {
            // Compare output
            const expected = tc.expectedOutput.trim();
            if (tcStdout !== expected) {
              tcStatus = SubmissionStatus.WRONG_ANSWER;
            }
          }
        } catch (error: any) {
          tcStdout = error.stdout || '';

          if (error.killed || error.signal === 'SIGTERM') {
            tcStatus = SubmissionStatus.TIME_LIMIT;
            tcStderr = 'Time Limit Exceeded';
          } else {
            tcStatus = SubmissionStatus.RUNTIME_ERROR;
            // Clean up error message to hide system paths and docker commands
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
            tcStderr = cleanError;
          }
        }

        const runtime =
          tcExecutionTime || Math.max(0, Date.now() - startTime - 500);
        totalRuntime += runtime;
        const memory = (typeof tcMemory !== 'undefined' ? tcMemory : 0);
        maxMemory = Math.max(maxMemory, memory);

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
          passed: tcStatus === SubmissionStatus.ACCEPTED,
        });

        console.log(`Testcase ${i + 1}: ${tcStatus} (${runtime}ms)`);
      }
    } catch (error: any) {
      console.error('[SubmissionProcessor] Global Error:', error);
      // Ensure we still update the submission status if something breaks globally
      await this.submissionRepo.update(submissionId, {
        status: SubmissionStatus.RUNTIME_ERROR,
        errorMessage: 'Internal Sandbox Error',
      });
    } finally {
      // STEP 6: Updating database
      try {
        // Logic giữ điểm cao nhất khi có yêu cầu (isRegrade)
        let scoreToSave = totalScore;
        if (job.data.isRegrade) {
          const currentSub = await this.submissionRepo.findOne({
            where: { id: submissionId },
            select: ['score'],
          });
          if (currentSub && currentSub.score > totalScore) {
            scoreToSave = currentSub.score;
          }
        }

        await this.submissionRepo.update(submissionId, {
          status: finalStatus,
          errorMessage: lastError,
          runtime: totalRuntime,
          memory: maxMemory,
          score: scoreToSave,
          maxScore: totalMaxScore,
          testcasePassed: testcasesPassed,
          results: JSON.stringify(results),
        });
      } catch (dbError) {
        console.error('DB UPDATE ERROR:', dbError);
      }

      // Logic chuyển đổi trạng thái khi xác thực bài giải thành công (isVerified)
      let subContext = 'EXERCISE';
      try {
        const sub = await this.submissionRepo.findOne({
            where: { id: submissionId },
            relations: ['problemVersion', 'problemVersion.problem', 'user', 'language']
        });
        if (sub) {
            subContext = sub.context;
            const problemId = sub.problemVersion?.problem?.id;
            const userId = sub?.user?.id;
            const languageId = sub?.language?.id;

            if (sub.context === 'SYSTEM_VERIFY' && finalStatus === SubmissionStatus.ACCEPTED) {
                await this.versionRepo.update(sub.problemVersion.id, { isVerified: true });
                console.log(`[Submission] Problem Version ${sub.problemVersion.id} is now VERIFIED.`);
            }

            // Cập nhật thống kê bài tập (Lượt nộp, Tỉ lệ trúng tuyển) cho chế độ Luyện tập
            if (problemId && subContext === 'EXERCISE') {
                try {
                    // 1. Tính toán và cộng điểm XP cho User một cách an toàn (tránh race condition spam)
                    if (userId) {
                        await this.submissionRepo.manager.transaction(async (manager) => {
                            // Lock dòng user để tránh 2 request nộp bài cùng lúc làm lộn xộn XP
                            await manager.query(`SELECT 1 FROM users WHERE id = $1 FOR UPDATE`, [userId]);
                            
                            // Lấy điểm cao nhất TRƯỚC ĐÓ của user cho bài này THEO NGÔN NGỮ (loại trừ bài nộp hiện tại)
                            const prevMaxRes = await manager.query(
                                `SELECT COALESCE(MAX(s.score), 0) as max_score
                                 FROM submissions s
                                 JOIN problem_versions pv ON s.problem_version_id = pv.id
                                 WHERE pv.problem_id = $1 AND s.user_id = $2 AND s.id != $3 AND s.context = 'EXERCISE' AND s.language_id = $4`,
                                [problemId, userId, submissionId, languageId]
                            );
                            const prevMaxScore = Number(prevMaxRes[0]?.max_score || 0);

                            // Nếu điểm lần này cao hơn kỷ lục cũ, cộng thêm phần chênh lệch
                            if (totalScore > prevMaxScore) {
                                const xpDelta = totalScore - prevMaxScore;
                                await manager.query(
                                    `UPDATE users SET xp = xp + $1 WHERE id = $2`,
                                    [xpDelta, userId]
                                );
                                console.log(`[Submission] Tặng ${xpDelta} XP cho User ${userId}. Kỷ lục cũ: ${prevMaxScore}, mới: ${totalScore}.`);
                            }
                        });
                    }

                    // 2. Cập nhật thống kê bài tập
                    await this.submissionRepo.query(
                        `UPDATE problem_stats
                         SET total_submissions = (
                               SELECT COUNT(*) FROM submissions s 
                               JOIN problem_versions pv ON s.problem_version_id = pv.id 
                               WHERE pv.problem_id = $1 AND s.type = 'SUBMIT' AND s.context = 'EXERCISE'
                             ),
                             acceptance_rate = (
                               SELECT COALESCE(
                                 CAST(SUM(CASE WHEN s.status = 'accepted' THEN 1 ELSE 0 END) AS FLOAT) / 
                                 NULLIF(COUNT(*), 0) * 100
                               , 0)
                               FROM submissions s 
                               JOIN problem_versions pv ON s.problem_version_id = pv.id 
                               WHERE pv.problem_id = $1 AND s.type = 'SUBMIT' AND s.context = 'EXERCISE'
                             )
                         WHERE problem_id = $1`,
                        [problemId]
                    );
                } catch (statsErr) {
                    console.error('[Submission] Lỗi cập nhật thống kê/XP:', statsErr);
                }
            }
        }
      } catch (verifyError) {
        console.error('VERIFY ERROR:', verifyError);
      }

      // STEP 7: Sending websocket result
      try {
        const wsData: any = {
          status: finalStatus,
          score: totalScore,
          maxScore: totalMaxScore,
          testcasesPassed,
          testcasesTotal: results.length,
          error: lastError,
        };

        if (subContext !== 'EXAM') {
          wsData.results = results;
        }

        this.executionGateway.sendResult(submissionId, wsData);
        console.log(
          `[Submission] Result emitted via WebSocket for ID: ${submissionId}`,
        );

        // Cập nhật tiến độ Battle nếu cần
        if (subContext === 'BATTLE') {
          const sub = await this.submissionRepo.findOne({
            where: { id: submissionId },
            select: ['contextId', 'user', 'testcasePassed'],
            relations: ['user'],
          });
          if (sub && sub.contextId) {
            // Tính toán % tiến độ (giả sử maxScore hoặc testcasesTotal là 100%)
            // Ở đây ta dùng testcasesPassed / total để ra %
            const percent = results.length > 0 ? Math.round((testcasesPassed / results.length) * 100) : 0;
            await this.battleService.updateProgress(sub.contextId, sub.user.id, percent);
          }
        }
      } catch (wsError) {
        console.error(`[Submission] WebSocket error: ${wsError}`);
      }

      // STEP 8: Cleaning workspace
      try {
        await fs.rm(workspace, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(
          `Failed to cleanup workspace ${workspace}:`,
          cleanupError,
        );
      }

      console.log('========== JOB END ==========');
    }
  }
}
