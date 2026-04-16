import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { User } from '../user/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { ExecutionJob } from '../execution/entites/execution-job.entity';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
    @InjectRepository(ExecutionJob)
    private jobRepo: Repository<ExecutionJob>,
  ) {}

  async listJobs() {
    const jobs = await this.jobRepo.find({
      relations: [
        'submission',
        'submission.user',
        'submission.problemVersion',
        'submission.problemVersion.problem',
        'submission.language',
      ],
    });
    return { jobs };
  }

  async killJob(jobId: string) {
    // Logic thực tế để kill container (VD: qua Docker API)
    return {
      message: 'Yêu cầu dừng Job ' + jobId + ' đã được gửi tới Sandbox worker.',
    };
  }

  async getAuditLogs(query: any) {
    const { page = 1, limit = 20, search = '' } = query;
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.where('log.action ILIKE :search OR log.userId ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getAuditLog(id: number) {
    return this.auditRepo.findOne({ where: { id } });
  }
  async listLanguages() {
    return { languages: [] };
  }

  async addLanguage(dto: any) {
    return {
      id: Math.floor(Math.random() * 100),
      message: 'Da them ngon ngu thanh cong',
    };
  }

  async updateLanguage(id: number, dto: any) {
    return {
      message: 'Da cap nhat ngon ngu',
      updatedAt: new Date().toISOString(),
    };
  }

  async listLecturers(query: any = {}) {
    const {
      page = 1,
      limit = 10,
      status = null,
      search = null,
      sort = 'createdAt',
      order = 'DESC',
    } = query;
    const where: any = { role: Role.LECTURER };

    if (status) where.status = status;
    if (search) where.fullName = Like(`%${search}%`);

    const findOptions: any = {
      where,
      select: [
        'id',
        'fullName',
        'email',
        'avatarUrl',
        'status',
        'rating',
        'xp',
        'createdAt',
        'updatedAt',
      ],
      order: { [sort]: order },
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
    const {
      page = 1,
      limit = 10,
      status = null,
      search = null,
      sort = 'createdAt',
      order = 'DESC',
    } = query;
    const where: any = { role: Role.STUDENT };

    if (status) where.status = status;
    if (search) where.fullName = Like(`%${search}%`);

    const findOptions: any = {
      where,
      select: [
        'id',
        'fullName',
        'email',
        'mssv',
        'major',
        'avatarUrl',
        'status',
        'rating',
        'xp',
        'createdAt',
        'updatedAt',
      ],
      order: { [sort]: order },
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
