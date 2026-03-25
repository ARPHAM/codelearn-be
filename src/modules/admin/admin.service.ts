import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async listJobs() { return { jobs: [] }; }

  async killJob(jobId: string) {
    return { message: 'Job ' + jobId + ' da bi dung. Bai nop: FAILED' };
  }

  async getSandboxConfig() {
    return { languages: [
      { lang: 'python', cpu: '0.5vCPU', ram: '128MB', timeout: 10, enabled: true },
      { lang: 'java', cpu: '1vCPU', ram: '256MB', timeout: 15, enabled: true },
      { lang: 'cpp', cpu: '0.5vCPU', ram: '128MB', timeout: 10, enabled: true },
    ]};
  }

  async updateSandboxConfig(dto: any) {
    return { message: 'Da cap nhat cau hinh ' + dto.language, appliedAt: new Date().toISOString() };
  }

  async getAuditLogs(query: any) { return { logs: [], total: 0 }; }
  async getAuditLog(id: number) { return { id }; }
  async listLanguages() { return { languages: [] }; }

  async addLanguage(dto: any) {
    return { id: Math.floor(Math.random() * 100), message: 'Da them ngon ngu thanh cong' };
  }

  async updateLanguage(id: number, dto: any) {
    return { message: 'Da cap nhat ngon ngu', updatedAt: new Date().toISOString() };
  }

  async listLecturers(query: any = {}) { 
    const { page = 1, limit = 10, status = null, search = null, sort = 'createdAt', order = 'DESC' } = query;
    const where: any = { role: Role.LECTURER };
    
    if (status) where.status = status;
    if (search) where.fullName = Like(`%${search}%`);

    const findOptions: any = { 
      where, 
      select: ['id', 'fullName', 'email', 'avatarUrl', 'status', 'rating', 'xp', 'createdAt', 'updatedAt'],
      order: { [sort]: order }
    };

    if (page && limit) {
      findOptions.skip = (Number(page) - 1) * Number(limit);
      findOptions.take = Number(limit);
    } else if (limit) {
      findOptions.take = Number(limit);
    }

    const lecturers = await this.userRepo.find(findOptions);
    return [...lecturers];
  }

  async listStudents(query: any = {}) { 
    const { page = 1, limit = 10, status = null, search = null, sort = 'createdAt', order = 'DESC' } = query;
    const where: any = { role: Role.STUDENT };
    
    if (status) where.status = status;
    if (search) where.fullName = Like(`%${search}%`);

    const findOptions: any = { 
      where, 
      select: ['id', 'fullName', 'email', 'mssv', 'major', 'avatarUrl', 'status', 'rating', 'xp', 'createdAt', 'updatedAt'],
      order: { [sort]: order }
    };

    if (page && limit) {
      findOptions.skip = (Number(page) - 1) * Number(limit);
      findOptions.take = Number(limit);
    } else if (limit) {
      findOptions.take = Number(limit);
    }

    const students = await this.userRepo.find(findOptions);
    return [...students];
  }
}
