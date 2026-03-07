import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BattlesService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async challenge(dto: { opponentId: number; duration: number; topic: string }, challenger: User) {
    const opponent = await this.userRepo.findOne({ where: { id: dto.opponentId } });
    if (!opponent) throw new NotFoundException('Doi thu khong ton tai');
    const battleId = Math.floor(Math.random() * 10000);
    return { battleId, status: 'pending', message: 'Da gui loi moi. Cho doi thu chap nhan.' };
  }

  async accept(id: number, _student: User) {
    return { battleId: id, status: 'active', exercise: null, startsAt: new Date().toISOString() };
  }

  async getResult(id: number) {
    return { winner: null, ratingChange: { me: 0, opponent: 0 }, comparison: { testsPassed: [], time: [] } };
  }

  async getLeaderboard(query: { courseId?: number; limit?: number; period?: string }) {
    return { rankings: [] };
  }
}
