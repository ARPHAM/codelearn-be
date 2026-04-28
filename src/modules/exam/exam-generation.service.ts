import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { BankItem } from '../bank/entities/bank-item.entity';
import { ExamStudentProblem } from './entities/exam-student-problem.entity';

@Injectable()
export class ExamGenerationService {
  constructor(
    @InjectRepository(Exam) private examRepo: Repository<Exam>,
    @InjectRepository(BankItem) private bankItemRepo: Repository<BankItem>,
    @InjectRepository(ExamStudentProblem)
    private studentProblemRepo: Repository<ExamStudentProblem>,
  ) {}

  /**
   * Sinh đề riêng cho sinh viên dựa trên bộ quy tắc của kỳ thi.
   * Nếu đề đã được sinh trước đó, trả về bộ đề cũ.
   */
  async generateForUser(examId: string, userId: string) {
    // 1. Kiểm tra xem đã sinh đề chưa
    const existing = await this.studentProblemRepo.find({
      where: { exam: { id: examId }, user: { id: userId } },
      relations: ['problem'],
      order: { order: 'ASC' },
    });
    if (existing.length > 0) return existing;

    // 2. Lấy thông tin kỳ thi và quy tắc
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam || !exam.generationRules) {
      throw new BadRequestException('Kỳ thi không tồn tại hoặc thiếu quy tắc bốc đề');
    }

    const rules = Array.isArray(exam.generationRules) ? exam.generationRules : [];
    const pickedProblems: ExamStudentProblem[] = [];
    let currentOrder = 1;

    // 3. Thực thi bốc đề theo từng rule
    for (const rule of rules) {
      const items = await this.bankItemRepo.find({
        where: {
          bank: { id: rule.bankId },
          difficulty: rule.difficulty,
        },
        relations: ['problem'],
      });

      if (items.length < rule.count) {
        throw new BadRequestException(
          `Ngân hàng đề không đủ câu hỏi độ khó ${rule.difficulty}. Cần ${rule.count} nhưng chỉ có ${items.length}.`,
        );
      }

      // Shuffle và lấy đúng số lượng
      const shuffled = items.sort(() => 0.5 - Math.random());
      const selectedItems = shuffled.slice(0, rule.count);

      for (const item of selectedItems) {
        const studentProblem = this.studentProblemRepo.create({
          exam: { id: examId },
          user: { id: userId },
          problem: { id: item.problem.id },
          score: rule.scorePerQuestion || item.score || 0,
          order: currentOrder++,
        });
        pickedProblems.push(studentProblem);
      }
    }

    // 4. Lưu và trả về
    return this.studentProblemRepo.save(pickedProblems);
  }

  /**
   * Kiểm tra tính hợp lệ của bộ quy tắc trước khi Admin duyệt.
   */
  async validateRules(examId: string) {
    const exam = await this.examRepo.findOne({ where: { id: examId } });
    if (!exam || !exam.generationRules) return true;

    const rules = Array.isArray(exam.generationRules) ? exam.generationRules : [];
    for (const rule of rules) {
      const count = await this.bankItemRepo.count({
        where: {
          bank: { id: rule.bankId },
          difficulty: rule.difficulty,
        },
      });
      if (count < rule.count) {
        throw new BadRequestException(
          `Quy tắc không hợp lệ: Ngân hàng ${rule.bankId} không đủ số lượng câu hỏi độ khó ${rule.difficulty}.`,
        );
      }
    }
    return true;
  }
}
