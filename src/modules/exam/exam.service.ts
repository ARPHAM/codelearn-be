import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { ExamGenerationService } from './exam-generation.service';
import { Course } from '../course/entities/course.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    private examGenService: ExamGenerationService,
  ) {}

  async findAllForCourse(courseId: string) {
    return this.examRepo.find({
      where: { course: { id: courseId } },
      order: { startTime: 'ASC' },
    });
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
}
