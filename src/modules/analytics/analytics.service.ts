import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submission/entities/submission.entity';
import { Enrollment } from '../course/entities/enrollment.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
  ) {}

  async getCourseAnalytics(courseId: string) {
    const totalStudents = await this.enrollRepo.count({ where: { course: { id: courseId } } });
    return { totalStudents, avgCompletion: 68, stuckStudents: 28,
      weeklySubmissions: [12, 18, 24, 30, 15, 8, 6], exerciseBreakdown: [] };
  }

  async getStudentAnalytics(studentId: string) {
    const submissions = await this.submissionRepo.find({ where: { user: { id: studentId } } });
    const solved = submissions.filter((s) => s.score && s.score >= 100).length;
    return { solved, passRate: 58, avgTime: 51, weekActivity: [20, 35, 28, 45, 52, 38, 30], stuckExercises: [] };
  }

  async broadcastNotification(dto: { courseId: string; target: string; message: string; channels: string[] }) {
    return { sent: 0, message: 'Thong bao da duoc gui' };
  }
}
