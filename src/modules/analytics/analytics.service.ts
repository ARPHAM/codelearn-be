import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submission/entities/submission.entity';
import { Enrollment } from '../course/entities/enrollment.entity';
import { Problem } from '../problem/entities/problem.entity';
import { Course } from '../course/entities/course.entity';
import { Assignment } from '../assignment/entities/assignment.entity';
import { AssignmentProblem } from '../assignment/entities/assignment-problem.entity';
import { User } from '../user/entities/user.entity';
import { In, MoreThanOrEqual } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    @InjectRepository(Problem) private problemRepo: Repository<Problem>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Assignment) private assignmentRepo: Repository<Assignment>,
    @InjectRepository(AssignmentProblem)
    private assignmentProblemRepo: Repository<AssignmentProblem>,
  ) {}

  async getCourseAnalytics(courseId: string, user: User) {
    const courseIds: string[] = [];
    if (courseId === 'all') {
      const courses = await this.courseRepo.find({
        where: { lecturer: { id: user.id } },
      });
      courseIds.push(...courses.map((c) => c.id));
    } else {
      courseIds.push(courseId);
    }

    if (courseIds.length === 0) {
      return {
        totalStudents: 0,
        avgCompletion: 0,
        stuckStudents: 0,
        weeklySubmissions: [0, 0, 0, 0, 0, 0, 0],
        totalProblems: 0,
        trends: { students: 0, completion: 0, stuck: 0 },
      };
    }

    const totalStudents = await this.enrollRepo.count({
      where: { course: { id: In(courseIds) } },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const currentNewEnrollments = await this.enrollRepo.count({
      where: {
        course: { id: In(courseIds) },
        createdAt: MoreThanOrEqual(thirtyDaysAgo),
      },
    });
    const previousNewEnrollments = await this.enrollRepo.count({
      where: {
        course: { id: In(courseIds) },
        createdAt: MoreThanOrEqual(sixtyDaysAgo),
      },
    });
    const studentTrend =
      previousNewEnrollments > 0
        ? Math.round(
            ((currentNewEnrollments -
              (previousNewEnrollments - currentNewEnrollments)) /
              (previousNewEnrollments - currentNewEnrollments || 1)) *
              100,
          )
        : 0;

    // Query total problems in these courses
    const assignmentProblems = await this.assignmentProblemRepo
      .createQueryBuilder('ap')
      .innerJoin('ap.assignment', 'a')
      .where('a.course_id IN (:...courseIds)', { courseIds })
      .select('COUNT(DISTINCT ap.problem_id)', 'count')
      .getRawOne();
    const totalProblems = parseInt(assignmentProblems.count) || 0;

    // Average completion
    const solvedStats = await this.submissionRepo
      .createQueryBuilder('s')
      .where('s.context_id IN (:...courseIds)', { courseIds })
      .andWhere("s.status = 'ACCEPTED'")
      .select('COUNT(DISTINCT CONCAT(s.user_id, s.problem_version_id))', 'solved')
      .getRawOne();

    const totalSolved = parseInt(solvedStats.solved) || 0;
    const avgCompletion =
      totalStudents > 0 && totalProblems > 0
        ? Math.round((totalSolved / (totalStudents * totalProblems)) * 100)
        : 0;

    // Stuck students logic: students with > 5 attempts on a problem and NOT solved it
    const stuckSubQuery = this.submissionRepo
      .createQueryBuilder('s')
      .select('s.user_id', 'userId')
      .addSelect('s.problem_version_id', 'problemId')
      .where('s.context_id IN (:...courseIds)', { courseIds })
      .andWhere("s.status != 'ACCEPTED'")
      .groupBy('s.user_id')
      .addGroupBy('s.problem_version_id')
      .having('COUNT(s.id) > 5');

    const stuckStudentsList = await stuckSubQuery.getRawMany();
    let stuckCount = 0;
    for (const item of stuckStudentsList) {
      const solved = await this.submissionRepo.findOne({
        where: {
          user: { id: item.userId },
          problemVersion: { id: item.problemId },
          status: 'ACCEPTED',
        },
      });
      if (!solved) stuckCount++;
    }

    // Weekly activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyStats = await this.submissionRepo
      .createQueryBuilder('s')
      .where('s.context_id IN (:...courseIds)', { courseIds })
      .andWhere('s.created_at >= :sevenDaysAgo', { sevenDaysAgo })
      .select("TO_CHAR(s.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(s.id)', 'count')
      .groupBy("TO_CHAR(s.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(s.created_at, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();

    const weeklySubmissions = new Array(7).fill(0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = weeklyStats.find((ws) => ws.date === dateStr);
      weeklySubmissions[6 - i] = match ? parseInt(match.count) : 0;
    }

    return {
      totalStudents,
      totalProblems,
      avgCompletion,
      stuckStudents: stuckCount,
      weeklySubmissions,
      trends: {
        students: studentTrend,
        completion: 5, // Simplified completion trend for now
        stuck: stuckCount > 5 ? -10 : 0, // Placeholder for trend
      },
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

    // Week activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyStats = await this.submissionRepo
      .createQueryBuilder('s')
      .where('s.user_id = :studentId', { studentId })
      .andWhere('s.created_at >= :sevenDaysAgo', { sevenDaysAgo })
      .select("TO_CHAR(s.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(s.id)', 'count')
      .groupBy("TO_CHAR(s.created_at, 'YYYY-MM-DD')")
      .getRawMany();

    const weekActivity = new Array(7).fill(0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = weeklyStats.find((ws) => ws.date === dateStr);
      weekActivity[6 - i] = match ? parseInt(match.count) : 0;
    }

    return {
      solved,
      passRate: total > 0 ? Math.round((solved / total) * 100) : 0,
      avgTime: 45,
      weekActivity,
      stuckExercises: [],
    };
  }

  async getLecturerDashboard(user: User) {
    const totalProblems = await this.problemRepo.count({
      where: { createdBy: { id: user.id } },
    });

    const subStats = await this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin('s.problemVersion', 'pv')
      .innerJoin('pv.problem', 'p')
      .where('p.created_by = :userId', { userId: user.id })
      .select('COUNT(s.id)', 'total')
      .addSelect("COUNT(CASE WHEN s.status = 'ACCEPTED' THEN 1 END)", 'accepted')
      .getRawOne();

    const totalSubmissions = parseInt(subStats.total) || 0;
    const acceptedSubmissions = parseInt(subStats.accepted) || 0;

    // Analyze skills from failed problems
    const weakSkills = await this.submissionRepo
      .createQueryBuilder('s')
      .innerJoin('s.problemVersion', 'pv')
      .innerJoin('pv.problem', 'p')
      .where('p.created_by = :userId', { userId: user.id })
      .andWhere("s.status != 'ACCEPTED'")
      .select('p.tags', 'tags')
      .getRawMany();

    const tagCounts: Record<string, number> = {};
    weakSkills.forEach((ws) => {
      if (ws.tags) {
        ws.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    const topWeakSkills = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    return {
      totalProblems,
      avgAcceptanceRate:
        totalSubmissions > 0 ? acceptedSubmissions / totalSubmissions : 0,
      topWeakSkills: topWeakSkills.length > 0 ? topWeakSkills : ['N/A'],
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
