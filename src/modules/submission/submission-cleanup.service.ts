import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { RunExecution } from '../run/entities/run-execution.entity';

@Injectable()
export class SubmissionCleanupService {
  private readonly logger = new Logger(SubmissionCleanupService.name);

  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(RunExecution)
    private runExecutionRepo: Repository<RunExecution>,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCleanup() {
    this.logger.log('Starting execution cleanup job...');
    
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Dọn dẹp Submission có type là RUN (nếu có lưu vào bảng Submission)
    // Hoặc dọn dẹp bảng RunExecution vì người dùng nói "run code thông thường"
    const runExecutionsToDelete = await this.runExecutionRepo.find({
      where: { createdAt: LessThan(oneHourAgo) }
    });

    if (runExecutionsToDelete.length > 0) {
      this.logger.log(`Deleting ${runExecutionsToDelete.length} old run executions.`);
      await this.runExecutionRepo.remove(runExecutionsToDelete);
    }

    // Nếu bảng submissions cũng lưu các bản tạm/run thô, chúng ta cũng dọn dẹp
    const subsToDelete = await this.submissionRepo.find({
      where: { 
        type: 'RUN', 
        createdAt: LessThan(oneHourAgo) 
      }
    });

    if (subsToDelete.length > 0) {
        this.logger.log(`Deleting ${subsToDelete.length} old RUN submissions.`);
        await this.submissionRepo.remove(subsToDelete);
    }
  }
}
