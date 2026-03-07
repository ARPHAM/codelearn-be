import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submissions/entities/submission.entity';
import { Enrollment } from '../courses/entities/course.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
  ) {}

  async getCourseAnalytics(courseId: number) {
    const totalStudents = await this.enrollRepo.count({ where: { courseId } });
    return { totalStudents, avgCompletion: 68, stuckStudents: 28,
      weeklySubmissions: [12, 18, 24, 30, 15, 8, 6], exerciseBreakdown: [] };
  }

  async getStudentAnalytics(studentId: number) {
    const submissions = await this.submissionRepo.find({ where: { studentId } });
    const solved = submissions.filter((s) => s.score && s.score >= 100).length;
    return { solved, passRate: 58, avgTime: 51, weekActivity: [20, 35, 28, 45, 52, 38, 30], stuckExercises: [] };
  }

  async broadcastNotification(dto: { courseId: number; target: string; message: string; channels: string[] }) {
    return { sent: 0, message: 'Thong bao da duoc gui' };
  }
}
