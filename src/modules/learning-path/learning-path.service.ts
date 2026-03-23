import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LearningPathService {
  constructor(private configService: ConfigService) {}

  async getMyPath(studentId: string) {
    return {
      skills: [{ id: 'binary-search', name: 'Binary Search', status: 'active', progress: 60, prerequisites: ['arrays'] }],
      xp: 0, level: 1,
    };
  }

  async getSuggestions(studentId: string, limit: number = 5) {
    return { suggestions: [] };
  }

  async getAiHint(dto: { exerciseId: number; submissionId?: number; userCode: string; question: string; language: string }, studentId: string) {
    return { hint: 'Goi y AI dang duoc phat trien.', relatedConcept: 'Boundary conditions', followUp: 'Dieu gi xay ra neu mang rong?' };
  }
}
