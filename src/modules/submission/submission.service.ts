import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { User } from '../user/entities/user.entity';
import { ProblemVersion } from '../problem/entities/problem-version.entity';
import { Language } from '../problem/entities/language.entity';
import {
  CreateSubmissionDto,
  UpdateScoreDto,
  ListSubmissionsDto,
} from './dto/submission.dto';
import { SubmissionStatus } from '../../shared/enums/submission-status.enum';
import { Role } from '../../common/enums/role.enum';
import { ProblemLanguageFile } from '../problem/entities/problem-language-file.entity';
import { fillTemplate } from '../problem/utils/template.util';

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(ProblemVersion)
    private problemVersionRepo: Repository<ProblemVersion>,
    @InjectRepository(Language) private languageRepo: Repository<Language>,
    @InjectRepository(ProblemLanguageFile)
    private langFileRepository: Repository<ProblemLanguageFile>,
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
    const timeLimit = (problem as any).timeLimit;
    const memoryLimit = (problem as any).memoryLimit;

    // Tìm kiếm ngôn ngữ không phân biệt chữ hoa chữ thường
    const languages = await this.languageRepo.find();
    const language = languages.find(l => 
      l.name.toLowerCase() === dto.language.toLowerCase() ||
      l.ext.toLowerCase() === (dto.language.startsWith('.') ? dto.language.toLowerCase() : '.' + dto.language.toLowerCase())
    );
    
    if (!language) throw new NotFoundException('Ngon ngu khong ho tro');

    // Resolve code with FITB support
    let finalFiles = dto.files || [];
    if (dto.answers && dto.problemVersionId) {
      const templateFiles = await this.langFileRepository.find({
        where: {
          problemVersion: { id: dto.problemVersionId },
          type: 'TEMPLATE',
        },
      });

      for (const tFile of templateFiles) {
        const fileAnswers = dto.answers[tFile.path];
        if (fileAnswers) {
          const filledContent = fillTemplate(tFile.content, fileAnswers);
          const existingIdx = finalFiles.findIndex(
            (f) => f.filePath === tFile.path,
          );
          if (existingIdx !== -1) {
            finalFiles[existingIdx].content = filledContent;
          } else {
            finalFiles.push({ filePath: tFile.path, content: filledContent });
          }
        }
      }
    }

    const entryFile = finalFiles.find((f) => f.filePath === dto.entryFile);
    if (!entryFile) {
      throw new NotFoundException('Khong tim thay file main / entry');
    }

    const submission = this.submissionRepo.create({
      problemVersion: { id: dto.problemVersionId },
      user: { id: student.id },
      language: { id: language.id },

      code: JSON.stringify({
        entryFile: dto.entryFile,
        files: finalFiles,
      }),

      status: SubmissionStatus.QUEUED,
      context: dto.battleId ? 'BATTLE' : 'EXERCISE',
      contextId: dto.battleId || dto.problemVersionId,
    });

    const saved = await this.submissionRepo.save(submission);

    await this.submissionQueue.add({
      submissionId: saved.id,
      language: dto.language,
      problemVersionId: dto.problemVersionId,
      files: finalFiles.map((f) => ({
        filePath: f.filePath,
        content: f.content,
      })),
      entryFile: dto.entryFile,
      timeLimit,
      memoryLimit,
    });

    return {
      submissionId: saved.id,
      status: 'queued',
      message: 'Da nhan code. Dang cham...',
    };
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
      results = sub.results ? JSON.parse(sub.results) : [];
    } catch (e) {
      console.error('Error parsing results:', e);
    }

    return {
      status: sub.status,
      score: sub.score,
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
