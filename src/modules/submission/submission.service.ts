import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { User } from '../user/entities/user.entity';
import { ProblemVersion } from '../problem/entities/problem-version.entity';
import { Language } from '../problem/entities/language.entity';
import { Exam } from '../exam/entities/exam.entity';
import { ProblemFile } from '../problem/entities/problem-file.entity';
import {
  CreateSubmissionDto,
  UpdateScoreDto,
  ListSubmissionsDto,
} from './dto/submission.dto';
import { SubmissionStatus } from '../../shared/enums/submission-status.enum';
import { Role } from '../../common/enums/role.enum';
import { fillTemplate } from '../problem/utils/template.util';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(ProblemVersion)
    private problemVersionRepo: Repository<ProblemVersion>,
    @InjectRepository(Language) private languageRepo: Repository<Language>,
    @InjectRepository(ProblemFile)
    private problemFileRepository: Repository<ProblemFile>,
    @InjectRepository(Exam)
    private examRepo: Repository<Exam>,
    @InjectQueue('code-execution') private submissionQueue: Queue,
  ) {}

  async submit(dto: CreateSubmissionDto, student: User) {
    const problemVersion = await this.problemVersionRepo.findOne({
      where: { id: dto.problemVersionId },
      relations: ['problem'],
    });
    if (!problemVersion)
      throw new NotFoundException('Phien ban bai tap khong ton tai');

    const problem = problemVersion.problem;
    const timeLimit = problem.timeLimit;
    const memoryLimit = problem.memoryLimit;

    // Tìm kiếm ngôn ngữ
    const language = await this.languageRepo.findOne({ where: { id: dto.languageId } });
    
    if (!language) throw new NotFoundException('Ngon ngu khong ho tro');

    let context = 'EXERCISE';
    let contextId = problemVersion.id;

    if (dto.examId) {
      context = 'EXAM';
      contextId = dto.examId;
    } else if (dto.battleId) {
      context = 'BATTLE';
      contextId = dto.battleId;
    }

    // Kiểm tra ràng buộc kỳ thi
    if (context === 'EXAM') {
      const exam = await this.examRepo.findOne({ where: { id: dto.examId } });
      if (!exam) throw new NotFoundException('Ky thi khong ton tai');
      
      const now = new Date();
      if (now < exam.startTime || now > exam.endTime) {
        throw new BadRequestException('Ky thi chua bat dau hoac da ket thuc');
      }

      if (exam.allowedLanguageIds && exam.allowedLanguageIds.length > 0) {
        if (!exam.allowedLanguageIds.includes(language.id)) {
          throw new BadRequestException('Ngon ngu nay khong duoc phep trong ky thi');
        }
      }

      // Kiểm tra xem đã nộp chưa (Nộp xong cũng khóa)
      const hasSubmitted = await this.submissionRepo.findOne({
        where: {
          user: { id: student.id },
          context: 'EXAM',
          contextId: dto.examId,
          problemVersion: { id: dto.problemVersionId },
        },
      });

      if (hasSubmitted) {
        throw new BadRequestException('Bạn đã nộp bài này trong kỳ thi và không thể sửa đổi.');
      }
    }

    // Resolve code logic
    let finalFiles: any[] = [];
    let entryFile = dto.entryFile;

    const workspaceConfig = problemVersion.workspaceConfig || {};
    const canCreateFile = workspaceConfig.canCreateFile !== false;

    if (context === 'EXAM') {
      // Chế độ THI: Strict mode
      const templateFiles = await this.problemFileRepository.find({
        where: {
          problemVersion: { id: dto.problemVersionId },
          language: { id: language.id },
          type: 'TEMPLATE',
        },
      });

      const templatePaths = templateFiles.map((t) => t.path);
      
      // Ưu tiên tìm Entry File cụ thể cho ngôn ngữ này (trong Template, Neutral hoặc Hidden)
      const langEntryFile = (await this.problemFileRepository.findOne({
        where: { problemVersion: { id: dto.problemVersionId }, language: { id: language.id }, isEntryFile: true }
      }))?.path;
      
      const systemEntryFile = langEntryFile || problemVersion.entryFile;
      const canChangeMainFile = workspaceConfig.canChangeMainFile === true;

      for (const tFile of templateFiles) {
        let content = tFile.content;

        if (tFile.isFillInTheBlank) {
          const fileAnswers = dto.answers ? dto.answers[tFile.path] : null;
          if (fileAnswers) {
            content = fillTemplate(tFile.content, fileAnswers);
          }
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

      // Bổ sung các file mới từ FE nếu được phép
      if (canCreateFile && dto.files) {
        for (const feFile of dto.files) {
          if (!templatePaths.includes(feFile.filePath)) {
            finalFiles.push({ filePath: feFile.filePath, content: feFile.content });
          }
        }
      }
    } else {
      // Chế độ THƯỜNG: Freestyle - Học sinh nộp gì dùng nấy
      finalFiles = dto.files?.map(f => ({ filePath: f.filePath, content: f.content })) || [];
    }

    // Bổ sung các file NEUTRAL hoặc HIDDEN cho cả 2 chế độ
    const systemFiles = await this.problemFileRepository.find({
      where: [
        { problemVersion: { id: dto.problemVersionId }, type: 'NEUTRAL' },
        { problemVersion: { id: dto.problemVersionId }, language: { id: language.id }, type: 'HIDDEN' }
      ]
    });

    for (const sFile of systemFiles) {
      if (!finalFiles.find(f => f.filePath === sFile.path)) {
        finalFiles.push({ filePath: sFile.path, content: sFile.content });
      }
      if (sFile.isEntryFile && !entryFile) entryFile = sFile.path;
    }

    if (!entryFile && finalFiles.length > 0) {
      entryFile = finalFiles[0].filePath;
    }

    // Giới hạn lưu trữ
    await this.enforceRetentionLimit(student.id, problemVersion.id, language.id, context, contextId);

    const submission = this.submissionRepo.create({
      problemVersion: { id: dto.problemVersionId },
      user: { id: student.id },
      language: { id: language.id },
      code: JSON.stringify({ entryFile, files: finalFiles }),
      status: SubmissionStatus.QUEUED,
      context,
      contextId,
      type: 'SUBMIT',
    });

    const saved = await this.submissionRepo.save(submission);

    await this.submissionQueue.add({
      submissionId: saved.id,
      language: language.name,
      problemVersionId: dto.problemVersionId,
      files: finalFiles.map((f) => ({
        filePath: f.filePath,
        content: f.content,
      })),
      entryFile,
      timeLimit,
      memoryLimit,
    });

    return {
      submissionId: saved.id,
      status: 'queued',
      message: 'Da nhan code. Dang cham...',
    };
  }

  private async enforceRetentionLimit(userId: string, problemVersionId: string, languageId: number, context: string, contextId: string) {
    if (context === 'EXERCISE') {
      const submissions = await this.submissionRepo.find({
        where: { user: { id: userId }, problemVersion: { id: problemVersionId }, language: { id: languageId }, context: 'EXERCISE' },
        order: { createdAt: 'DESC' }
      });
      if (submissions.length >= 5) {
        // Tìm bản ghi có điểm cao nhất để bảo vệ khỏi việc bị xóa (Chống exploit điểm XP)
        const bestSub = submissions.reduce((best, curr) => ((curr.score || 0) > (best.score || 0) ? curr : best), submissions[0]);
        
        // Cắt lấy phần cũ (từ index 4 trở đi) nhưng LOẠI TRỪ bản ghi điểm cao nhất
        const toDelete = submissions.slice(4).filter(sub => sub.id !== bestSub.id);
        
        if (toDelete.length > 0) {
          await this.submissionRepo.remove(toDelete);
        }
      }
    } else if (context === 'EXAM' || context === 'BATTLE') {
      const existing = await this.submissionRepo.find({
        where: { user: { id: userId }, problemVersion: { id: problemVersionId }, context, contextId }
      });
      if (existing.length > 0) {
        await this.submissionRepo.remove(existing);
      }
    }
  }

  async getResult(id: string, currentUser: User) {
    const sub = await this.submissionRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!sub) throw new NotFoundException('Submission khong ton tai');
    if (sub.user?.id !== currentUser.id && currentUser.role === Role.STUDENT) {
      throw new ForbiddenException('Khong co quyen xem submission nay');
    }

    let results = [];
    try {
      if (sub.context !== 'EXAM') {
        results = sub.results ? JSON.parse(sub.results) : [];
      }
    } catch (e) {
      console.error('Error parsing results:', e);
    }

    return {
      status: sub.status,
      score: sub.score,
      maxScore: sub.maxScore,
      testcasesPassed: sub.testcasePassed || 0,
      testcasesTotal: results.length,
      results: results,
      runtime: sub.runtime,
      memory: sub.memory,
      errorMessage: sub.errorMessage,
      createdAt: sub.createdAt,
    };
  }

  async getByExercise(problemVersionId: string, query: ListSubmissionsDto) {
    const qb = this.submissionRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'u')
      .where('s.problemVersionId = :problemVersionId', { problemVersionId });
    if (query.status && query.status !== 'all')
      qb.andWhere('s.status = :status', { status: query.status });
    const page = query.page ?? 1;
    qb.skip((page - 1) * 20).take(20);
    const [submissions, total] = await qb.getManyAndCount();
    return {
      submissions: submissions.map((s) => ({
        id: s.id,
        userId: s.user?.id,
        studentName: s.user?.fullName,
        score: s.score,
        status: s.status,
        submittedAt: s.createdAt,
      })),
      total,
    };
  }

  async updateScore(id: string, dto: UpdateScoreDto, _currentUser: User) {
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Submission khong ton tai');
    const oldScore = sub.score;
    sub.score = dto.score;
    await this.submissionRepo.save(sub);
    return { message: 'Da cap nhat diem', oldScore, newScore: dto.score };
  }
}
