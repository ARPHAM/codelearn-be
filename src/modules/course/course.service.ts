import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { Enrollment } from './entities/enrollment.entity';
import { User } from '../user/entities/user.entity';
import { ListCoursesDto } from './dto/course.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async findAll(query: ListCoursesDto) {
    const qb = this.courseRepo.createQueryBuilder('c');
    if (query.semester) qb.where('c.semester = :s', { s: query.semester });
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);
    const [courses, total] = await qb.getManyAndCount();
    return { courses, total };
  }

  async getStudents(courseId: string, currentUser: User) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['lecturer'],
    });
    if (!course) throw new NotFoundException('Khoa hoc khong ton tai');
    if (
      currentUser.role === Role.LECTURER &&
      course.lecturer?.id !== currentUser.id
    ) {
      throw new ForbiddenException('Khong co quyen truy cap khoa hoc nay');
    }
    const enrollments = await this.enrollRepo.find({
      where: { course: { id: courseId } },
      relations: ['user'],
    });
    const students = enrollments.map((e) => ({
      id: e.user.id,
      name: e.user.fullName,
      mssv: e.user.mssv,
      email: e.user.email,
      progress: 0,
    }));
    return { students, total: students.length };
  }

  async enrollStudent(courseId: string, currentUser: User) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Khoa hoc khong ton tai');
    const existing = await this.enrollRepo.findOne({
      where: { user: { id: currentUser.id }, course: { id: courseId } },
    });
    if (existing)
      throw new ConflictException('Sinh vien da dang ky khoa hoc nay');
    const enrollment = this.enrollRepo.create({
      user: { id: currentUser.id },
      course: { id: courseId },
      role: 'student',
    });
    const saved = await this.enrollRepo.save(enrollment);
    return { message: 'Dang ky thanh cong', enrollmentId: saved.id };
  }

  async getMyCourses(user: User) {
    if (user.role === Role.LECTURER) {
      return this.courseRepo.find({
        where: { lecturer: { id: user.id } },
        order: { createdAt: 'DESC' },
      });
    }

    if (user.role === Role.STUDENT) {
      const enrollments = await this.enrollRepo.find({
        where: { user: { id: user.id } },
        relations: ['course'],
        order: { createdAt: 'DESC' },
      });
      return enrollments.map((e) => e.course);
    }

    if (user.role === Role.ADMIN) {
      return this.courseRepo.find({
        order: { createdAt: 'DESC' },
      });
    }

    return [];
  }
}
