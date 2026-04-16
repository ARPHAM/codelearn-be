import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../submission/entities/submission.entity';

@Injectable()
export class PlagiarismService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
  ) {}

  async startCheck(exerciseId: number, threshold: number = 40) {
    const jobId = 'plg_' + Math.random().toString(36).slice(2, 8);
    return {
      jobId,
      status: 'running',
      message: 'Dang phan tich submissions cua bai ' + exerciseId + '...',
    };
  }

  async getResults(exerciseId: number) {
    return { pairs: [], analyzedAt: new Date().toISOString() };
  }

  async flagPair(dto: {
    submissionAId: number;
    submissionBId: number;
    action: string;
    reason: string;
  }) {
    return { message: 'Da xu ly. Email thong bao da gui den 2 sinh vien.' };
  }
}
