import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { Submission } from '../submission/entities/submission.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Submission)
    private subRepo: Repository<Submission>,
  ) {}

  async findAllLecturers() {
    return this.userRepo.find({
      where: { role: Role.LECTURER },
      select: ['id', 'fullName', 'email', 'avatarUrl'],
      order: { fullName: 'ASC' },
    });
  }

  async findAllStudents() {
    return this.userRepo.find({
      where: { role: Role.STUDENT },
      select: ['id', 'fullName', 'email', 'mssv', 'avatarUrl'],
      order: { fullName: 'ASC' },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.mssv !== undefined) user.mssv = dto.mssv;
    if (dto.major !== undefined) user.major = dto.major;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    const saved = await this.userRepo.save(user);

    return {
      id: saved.id,
      name: saved.fullName,
      email: saved.email,
      role: saved.role,
      avatar: saved.avatarUrl,
      mssv: saved.mssv,
      major: saved.major,
      rating: saved.rating,
      xp: saved.xp,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getStudentStats(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const solvedCount = await this.subRepo.createQueryBuilder('sub')
      .innerJoin('sub.problemVersion', 'pv')
      .where('sub.user.id = :userId', { userId })
      .andWhere('sub.status = :status', { status: 'ACCEPTED' })
      .select('COUNT(DISTINCT pv.problem_id)', 'count')
      .getRawOne();

    return {
      xp: user.xp || 0,
      rating: user.rating || 1200,
      solvedCount: parseInt(solvedCount?.count || '0'),
      rank: user.xp > 1000 ? 'Silver' : 'Bronze'
    };
  }
}
