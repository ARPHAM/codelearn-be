import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submission/entities/submission.entity';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Exam } from './entities/exam.entity';

@Injectable()
export class ExamRegradeService {
  private readonly logger = new Logger(ExamRegradeService.name);

  constructor(
    @InjectRepository(Submission) private subRepo: Repository<Submission>,
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectQueue('code-execution') private submissionQueue: Queue,
  ) {}

  /**
   * Chấm lại toàn bộ bài làm của một kỳ thi.
   * Admin có thể gọi hàm này khi cập nhật lại Testcase hoặc giới hạn Sandbox.
   */
  async regradeExam(examId: string) {
    this.logger.log(`Starting regrade process for Exam ID: ${examId}`);

    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Kỳ thi không tồn tại');

    // 1. Tìm tất cả các bản nộp trong ngữ cảnh Kỳ thi này
    const submissions = await this.subRepo.find({
      where: { context: 'EXAM', contextId: examId },
      relations: ['problemVersion', 'language'],
    });

    if (submissions.length === 0) {
      return { message: 'Không có bài làm nào để chấm lại.', count: 0 };
    }

    this.logger.log(`Queueing ${submissions.length} submissions for re-execution...`);

    // 2. Đẩy lại vào hàng đợi Code Execution
    for (const sub of submissions) {
      try {
        const payload = JSON.parse(sub.code); // { entryFile, files }

        await this.submissionQueue.add({
          submissionId: sub.id,
          language: sub.language.name,
          problemVersionId: sub.problemVersion.id,
          files: payload.files,
          entryFile: payload.entryFile,
          isRegrade: true, // Marker để processor biết là chấm lại và giữ điểm cao nhất
        });
      } catch (e) {
        this.logger.error(`Failed to parse code for submission ${sub.id}: ${e.message}`);
      }
    }

    return {
      message: `Đã gửi yêu cầu chấm lại cho ${submissions.length} bài làm.`,
      count: submissions.length,
    };
  }
}
