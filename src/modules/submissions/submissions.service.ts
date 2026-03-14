import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';
import { User } from '../users/entities/user.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { CreateSubmissionDto, UpdateScoreDto, ListSubmissionsDto } from './dto/submissions.dto';
import { SubmissionStatus } from '../../common/enums/submission-status.enum';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(Exercise) private exerciseRepo: Repository<Exercise>,
    @InjectQueue('code-execution') private submissionQueue: Queue,
  ) {}

  async submit(dto: CreateSubmissionDto, student: User) {
    const exercise = await this.exerciseRepo.findOne({ where: { id: dto.exerciseId } });
    if (!exercise) throw new NotFoundException('Bai tap khong ton tai');

    const mainFile = dto.files.find(f => f.filename === dto.mainFile);
    if (!mainFile) {
      throw new NotFoundException('Khong tim thay file main');
    }

    const submission = this.submissionRepo.create({
      exerciseId: dto.exerciseId,
      studentId: student.id,
      language: dto.language,

      // lưu JSON
      sourceCode: JSON.stringify({
        mainFile: dto.mainFile,
        files: dto.files
      }),

      status: SubmissionStatus.QUEUED,
    });

    const saved = await this.submissionRepo.save(submission);

    await this.submissionQueue.add({
      submissionId: saved.id,
      language: dto.language,
      files: dto.files.map(f => ({
        path: f.filename,
        content: f.content
      })),
      mainFile: dto.mainFile,
    });

    return {
      submissionId: saved.id,
      status: 'queued',
      message: 'Da nhan code. Dang cham...'
    };
  }

  async getResult(id: number, currentUser: User) {
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Submission khong ton tai');
    if (sub.studentId !== currentUser.id && currentUser.role === Role.STUDENT) {
      throw new ForbiddenException('Khong co quyen xem submission nay');
    }
    return { status: sub.status, score: sub.score, passed: sub.passed, total: sub.total,
      timeCpu: sub.cpuTime ? sub.cpuTime + 's' : null, memoryMb: sub.memoryMb, testResults: [], stdout: sub.stdout, stderr: sub.stderr };
  }

  async getByExercise(exerciseId: number, query: ListSubmissionsDto) {
    const qb = this.submissionRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.student', 'u').where('s.exerciseId = :exerciseId', { exerciseId });
    if (query.status && query.status !== 'all') qb.andWhere('s.status = :status', { status: query.status });
    const page = query.page ?? 1;
    qb.skip((page - 1) * 20).take(20);
    const [submissions, total] = await qb.getManyAndCount();
    return {
      submissions: submissions.map((s) => ({
        id: s.id, studentId: s.studentId, studentName: (s as any).student?.fullName,
        score: s.score, status: s.status, submittedAt: s.submittedAt,
      })), total,
    };
  }

  async updateScore(id: number, dto: UpdateScoreDto, _currentUser: User) {
    const sub = await this.submissionRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Submission khong ton tai');
    const oldScore = sub.score;
    sub.score = dto.score;
    await this.submissionRepo.save(sub);
    return { message: 'Da cap nhat diem', oldScore, newScore: dto.score };
  }
}
