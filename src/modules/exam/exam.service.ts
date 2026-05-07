import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import { ExamStudentProblem } from './entities/exam-student-problem.entity';
import { ExamLog } from './entities/exam-log.entity';
import { Submission } from '../submission/entities/submission.entity';
import { ExamGenerationService } from './exam-generation.service';
import { Course } from '../course/entities/course.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(ExamAttempt) private attemptRepo: Repository<ExamAttempt>,
    @InjectRepository(ExamStudentProblem) private studentProbRepo: Repository<ExamStudentProblem>,
    @InjectRepository(Submission) private subRepo: Repository<Submission>,
    @InjectRepository(ExamLog) private logRepo: Repository<ExamLog>,
    private examGenService: ExamGenerationService,
  ) {}

  async findAll() {
    return this.examRepo.find({
      relations: ['course'],
      order: { startTime: 'DESC' },
    });
  }

  async findAllForCourse(courseId: string) {
    return this.examRepo.find({
      where: { course: { id: courseId } },
      order: { startTime: 'ASC' },
    });
  }

  async create(dto: any) {
    const exam = this.examRepo.create({
      ...dto,
      id: dto.id || `EXAM_${Date.now()}`,
      status: 'DRAFT',
      course: { id: dto.courseId },
      bank: { id: dto.bankId },
      startTime: new Date(dto.startTime),
      endTime: new Date(new Date(dto.startTime).getTime() + dto.duration * 60000),
    });
    return this.examRepo.save(exam);
  }

  async findOne(id: string) {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!exam) throw new NotFoundException('Kỳ thi không tồn tại');
    return exam;
  }

  /**
   * Giảng viên gửi đề thi cho Admin duyệt.
   * Hệ thống sẽ tự động kiểm tra xem Bank có đủ câu hỏi theo Rule không.
   */
  async submitForApproval(id: string, lecturer: User) {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!exam) throw new NotFoundException('Kỳ thi không tồn tại');

    // Kiểm tra quyền (Ví dụ: phải thuộc giảng viên của khóa học)
    // Code này giả định bạn đã có logic check giảng viên trong lớp

    // Xác thực Rule trước khi gửi duyệt
    await this.examGenService.validateRules(id);

    exam.status = 'PENDING';
    return this.examRepo.save(exam);
  }

  async approveExam(id: string) {
    const exam = await this.examRepo.findOne({ where: { id } });
    if (!exam) throw new NotFoundException('Kỳ thi không tồn tại');
    exam.status = 'APPROVED';
    return this.examRepo.save(exam);
  }

  async startExam(examId: string, userId: string) {
    // 1. Generate problems
    const problems = await this.examGenService.generateForUser(examId, userId);

    // 2. Create/Get Attempt
    let attempt = await this.attemptRepo.findOne({
      where: { exam: { id: examId }, user: { id: userId } }
    });

    if (!attempt) {
      attempt = this.attemptRepo.create({
        id: `${examId}_${userId}`,
        exam: { id: examId },
        user: { id: userId },
        startTime: new Date(),
        status: 'IN_PROGRESS'
      });
      await this.attemptRepo.save(attempt);
    }

    return problems;
  }

  async logViolation(examId: string, userId: string, metadata: any) {
    const attempt = await this.attemptRepo.findOne({
      where: { exam: { id: examId }, user: { id: userId } }
    });
    
    if (attempt) {
      const log = this.logRepo.create({
        attempt,
        eventType: metadata.type || 'VIOLATION',
        timestamp: new Date(),
        metadata
      });
      await this.logRepo.save(log);
    }
    
    console.log(`[ExamViolation] User ${userId} in Exam ${examId}:`, metadata);
    return { success: true };
  }

  async finishExam(examId: string, userId: string) {
    const exam = await this.findOne(examId);
    
    // 1. Check if already finished
    let attempt = await this.attemptRepo.findOne({
      where: { exam: { id: examId }, user: { id: userId } }
    });
    
    if (attempt && attempt.status === 'COMPLETED') {
      return attempt;
    }

    // 2. Calculate score
    const studentProbs = await this.studentProbRepo.find({
      where: { exam: { id: examId }, user: { id: userId } },
      relations: ['problem']
    });

    let totalScore = 0;
    const details: any[] = [];

    for (const sp of studentProbs) {
      // Find best submission for this problem in this exam context
      const bestSub = await this.subRepo.findOne({
        where: { 
          user: { id: userId }, 
          problemVersion: { problem: { id: sp.problem.id } },
          context: 'EXAM',
          contextId: examId
        },
        order: { score: 'DESC' }
      });

      const problemScore = bestSub ? bestSub.score : 0;
      totalScore += problemScore;
      
      details.push({
        problemId: sp.problem.id,
        title: sp.problem.title,
        score: problemScore,
        maxScore: sp.score
      });
    }

    // 3. Save attempt
    if (!attempt) {
      attempt = this.attemptRepo.create({
        id: `${examId}_${userId}`,
        exam: { id: examId },
        user: { id: userId },
        startTime: new Date(),
        status: 'COMPLETED',
        endTime: new Date(),
        score: totalScore
      });
    } else {
      attempt.status = 'COMPLETED';
      attempt.endTime = new Date();
      attempt.score = totalScore;
    }

    return this.attemptRepo.save(attempt);
  }

  async getExamResult(examId: string, userId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { exam: { id: examId }, user: { id: userId } },
      relations: ['exam']
    });

    if (!attempt) throw new NotFoundException('Chưa có kết quả cho kỳ thi này');

    const studentProbs = await this.studentProbRepo.find({
      where: { exam: { id: examId }, user: { id: userId } },
      relations: ['problem']
    });

    const problems: any[] = [];
    for (const sp of studentProbs) {
       const bestSub = await this.subRepo.findOne({
        where: { 
          user: { id: userId }, 
          problemVersion: { problem: { id: sp.problem.id } },
          context: 'EXAM',
          contextId: examId
        },
        order: { score: 'DESC' }
      });
      problems.push({
        id: sp.problem.id,
        title: sp.problem.title,
        score: bestSub ? bestSub.score : 0,
        maxScore: sp.score,
        status: bestSub ? bestSub.status : 'NO_SUBMISSION'
      });
    }

    return {
      ...attempt,
      problems
    };
  }

  async getMonitoringData(examId: string) {
    const attempts = await this.attemptRepo.find({
      where: { exam: { id: examId } },
      relations: ['user', 'exam']
    });

    const monitoring: any[] = [];
    for (const attempt of attempts) {
      const violationCount = await this.logRepo.count({
        where: { attempt: { id: attempt.id }, eventType: 'VISIBILITY_HIDDEN' }
      });

      const studentProbs = await this.studentProbRepo.find({
        where: { exam: { id: examId }, user: { id: attempt.user.id } }
      });

      const submissionCount = await this.subRepo.count({
        where: { 
          user: { id: attempt.user.id },
          context: 'EXAM',
          contextId: examId
        }
      });

      monitoring.push({
        userId: attempt.user.id,
        fullName: attempt.user.fullName,
        email: attempt.user.email,
        status: attempt.status,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
        violationCount,
        progress: `${submissionCount} / ${studentProbs.length}`,
        score: attempt.score
      });
    }

    return monitoring;
  }

  async getStudentLogs(examId: string, userId: string) {
    const attempt = await this.attemptRepo.findOne({
      where: { exam: { id: examId }, user: { id: userId } }
    });
    if (!attempt) return [];
    
    return this.logRepo.find({
      where: { attempt: { id: attempt.id } },
      order: { timestamp: 'DESC' }
    });
  }

  async getUpcomingExams(userId: string) {
    return this.examRepo.createQueryBuilder('exam')
      .innerJoin('exam.course', 'course')
      .innerJoin('course.enrollments', 'enrollment')
      .where('enrollment.user.id = :userId', { userId })
      .andWhere('exam.endTime > :now', { now: new Date() })
      .andWhere('exam.status = :status', { status: 'APPROVED' })
      .orderBy('exam.startTime', 'ASC')
      .take(5)
      .getMany();
  }

  async recalculateAllScores(examId: string) {
    const attempts = await this.attemptRepo.find({
      where: { exam: { id: examId } },
      relations: ['user']
    });

    for (const attempt of attempts) {
      const studentProbs = await this.studentProbRepo.find({
        where: { exam: { id: examId }, user: { id: attempt.user.id } },
        relations: ['problem']
      });

      let totalScore = 0;
      for (const sp of studentProbs) {
        const bestSub = await this.subRepo.findOne({
          where: { 
            user: { id: attempt.user.id }, 
            problemVersion: { problem: { id: sp.problem.id } },
            context: 'EXAM',
            contextId: examId
          },
          order: { score: 'DESC' }
        });
        totalScore += bestSub ? bestSub.score : 0;
      }

      attempt.score = totalScore;
      await this.attemptRepo.save(attempt);
    }

    return { success: true, count: attempts.length };
  }
}
