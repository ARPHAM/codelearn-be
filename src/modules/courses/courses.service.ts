import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, Enrollment } from './entities/course.entity';
import { User } from '../users/entities/user.entity';
import { ListCoursesDto } from './dto/courses.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class CoursesService {
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

  async getStudents(courseId: number, currentUser: User) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Khoa hoc khong ton tai');
    if (currentUser.role === Role.LECTURER && course.lecturerId !== currentUser.id) {
      throw new ForbiddenException('Khong co quyen truy cap khoa hoc nay');
    }
    const enrollments = await this.enrollRepo.find({ where: { courseId }, relations: ['student'] });
    const students = enrollments.map((e) => ({
      id: e.student.id, name: e.student.fullName, mssv: e.student.mssv,
      email: e.student.email, progress: 0,
    }));
    return { students, total: students.length };
  }

  async enrollStudent(courseId: number, currentUser: User) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Khoa hoc khong ton tai');
    const existing = await this.enrollRepo.findOne({ where: { studentId: currentUser.id, courseId } });
    if (existing) throw new ConflictException('Sinh vien da dang ky khoa hoc nay');
    const enrollment = this.enrollRepo.create({ studentId: currentUser.id, courseId });
    const saved = await this.enrollRepo.save(enrollment);
    return { message: 'Dang ky thanh cong', enrollmentId: saved.id };
  }
}
