import { Injectable } from '@nestjs/common';

@Injectable()
export class ExamsService {
  async generate(dto: { courseId: number; name: string; duration: number; rules: any[]; requiredTags: string[]; shuffle: boolean }) {
    const examId = Math.floor(Math.random() * 1000);
    return { examId, questions: [], totalScore: dto.rules.reduce((s, r) => s + r.count * r.score, 0), preview: '/exams/' + examId + '/preview' };
  }

  async findOne(id: number) {
    return { id, name: 'Kiem tra', duration: 90, startAt: null, questions: [] };
  }
}
