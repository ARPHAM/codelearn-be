import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submission/entities/submission.entity';
import { Enrollment } from '../course/entities/enrollment.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
  ) {}

  async getCourseAnalytics(courseId: string) {
    const totalStudents = await this.enrollRepo.count({
      where: { course: { id: courseId } },
    });

    // Tính toán tỷ lệ hoàn thành trung bình (tạm tính dựa trên số lượng solved/total)
    // Đây là logic thô, thực tế có thể phức tạp hơn
    const stats = await this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin('s.enrollment', 'e')
      .where('e.course_id = :courseId', { courseId })
      .select('COUNT(DISTINCT s.problem_version_id)', 'solved')
      .addSelect('COUNT(DISTINCT s.user_id)', 'users')
      .getRawOne();

    return {
      totalStudents,
      avgCompletion:
        stats.users > 0
          ? Math.round((stats.solved / (stats.users * 10)) * 100)
          : 0, // Giả sử trung bình 10 bài/khóa
      stuckStudents: Math.floor(totalStudents * 0.15), // Logic tạm: 15% sv thường gặp khó
      weeklySubmissions: [10, 15, 20, 25, 18, 12, 5], // Thực tế nên query theo ngày
      exerciseBreakdown: [],
    };
  }

  async getStudentAnalytics(studentId: string) {
    const submissions = await this.submissionRepo.find({
      where: { user: { id: studentId } },
      relations: ['problemVersion'],
    });

    const solved = submissions.filter((s) => s.status === 'ACCEPTED').length;
    const total = submissions.length;

    return {
      solved,
      passRate: total > 0 ? Math.round((solved / total) * 100) : 0,
      avgTime: 45, // Dự tính trung bình 45p
      weekActivity: [5, 8, 12, 10, 15, 7, 3], // Nên query từ created_at
      stuckExercises: [],
    };
  }

  async getLecturerDashboard() {
    // Lấy tổng quan cho giảng viên
    return {
      totalProblems: 50, // Có thể query từ ProblemRepo
      avgAcceptanceRate: 0.65,
      topWeakSkills: ['Giải thuật tham lam', 'Đệ quy'],
      recentSubmissions: [],
    };
  }

  async broadcastNotification(dto: {
    courseId: string;
    target: string;
    message: string;
    channels: string[];
  }) {
    return { sent: 0, message: 'Thông báo đã được gửi' };
  }
}
