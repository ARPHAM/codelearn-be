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
import {
  ListCoursesDto,
  CreateClassDto,
  AssignClassUsersDto,
} from './dto/course.dto';
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
    qb.leftJoinAndSelect('c.lecturer', 'lecturer');
    
    if (query.semester && query.semester !== 'ALL') {
      qb.andWhere('c.semester = :s', { s: query.semester });
    }
    
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy('c.createdAt', 'DESC');

    const [courses, total] = await qb.getManyAndCount();

    // Map to include studentsCount and all lecturers
    const items = await Promise.all(
      courses.map(async (course) => {
        const studentsCount = await this.enrollRepo.count({
          where: { course: { id: course.id }, role: 'student' },
        });
        const lecturerEnrollments = await this.enrollRepo.find({
          where: { course: { id: course.id }, role: 'lecturer' },
          relations: ['user']
        });
        return {
          ...course,
          studentsCount,
          lecturers: lecturerEnrollments.map(e => e.user)
        };
      }),
    );

    return { items, total };
  }

  async findOne(id: string) {
    const course = await this.courseRepo.findOne({
      where: { id },
      relations: ['lecturer'],
    });
    if (!course) throw new NotFoundException('Lớp học không tồn tại');
    return course;
  }

  async getCourseUsers(courseId: string, currentUser: User, query: { role?: string, page?: number, limit?: number }) {
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

    const qb = this.enrollRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .where('e.course_id = :courseId', { courseId });

    if (query.role) {
      qb.andWhere('e.role = :role', { role: query.role });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    qb.skip((page - 1) * limit).take(limit);

    const [enrollments, total] = await qb.getManyAndCount();

    const users = enrollments.map((e) => ({
      id: e.user.id,
      name: e.user.fullName,
      fullName: e.user.fullName,
      mssv: e.user.mssv,
      email: e.user.email,
      role: e.role,
      avatarUrl: e.user.avatarUrl,
    }));

    return { users, total, page, limit };
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

  async findAllSemesters() {
    const semesters = await this.courseRepo
      .createQueryBuilder('c')
      .select('c.semester')
      .distinct(true)
      .getRawMany();
    return semesters.map((s) => s.c_semester);
  }

  async getMyCourses(user: User) {
    if (user.role === Role.LECTURER) {
      const enrollments = await this.enrollRepo.find({
        where: { user: { id: user.id }, role: 'lecturer' },
        relations: ['course'],
        order: { createdAt: 'DESC' },
      });
      return enrollments.map((e) => e.course);
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

  async create(dto: CreateClassDto) {
    const course = this.courseRepo.create();
    course.name = dto.name ?? '';
    course.code = dto.code ?? '';
    course.semester = dto.semester ?? '';
    course.description = dto.description ?? '';
    course.startDate = dto.startDate ? new Date(dto.startDate) : null;
    course.endDate = dto.endDate ? new Date(dto.endDate) : null;
    
    if (dto.lecturerId) {
      course.lecturer = { id: dto.lecturerId } as any;
    }

    return this.courseRepo.save(course);
  }

  async update(id: string, dto: Partial<CreateClassDto>) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Lớp học không tồn tại');

    if (dto.name) course.name = dto.name;
    if (dto.code) course.code = dto.code;
    if (dto.semester) course.semester = dto.semester;
    if (dto.description !== undefined) course.description = dto.description;
    if (dto.startDate) course.startDate = new Date(dto.startDate);
    if (dto.endDate) course.endDate = new Date(dto.endDate);
    
    if (dto.lecturerId !== undefined) {
      if (dto.lecturerId === '') {
        course.lecturer = null;
      } else {
        course.lecturer = { id: dto.lecturerId } as any;
      }
    }

    return this.courseRepo.save(course);
  }

  async assignUsers(courseId: string, dto: AssignClassUsersDto) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Lớp học không tồn tại');

    const enrollments: Enrollment[] = [];
    for (const userId of dto.userIds) {
      const existing = await this.enrollRepo.findOne({
        where: { user: { id: userId }, course: { id: courseId } },
      });
      if (!existing) {
        enrollments.push(
          this.enrollRepo.create({
            course: { id: courseId },
            user: { id: userId },
            role: dto.role,
          }),
        );
      } else if (existing.role !== dto.role) {
        existing.role = dto.role;
        enrollments.push(existing);
      }
    }
    return this.enrollRepo.save(enrollments);
  }

  async delete(id: string) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Lớp học không tồn tại');
    return this.courseRepo.remove(course);
  }

  async removeUser(courseId: string, userId: string) {
    const enrollment = await this.enrollRepo.findOne({
      where: { 
        course: { id: courseId }, 
        user: { id: userId } 
      }
    });
    if (!enrollment) throw new NotFoundException('Người dùng không tham gia lớp học này');
    return this.enrollRepo.remove(enrollment);
  }
}
