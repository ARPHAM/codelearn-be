import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findAllLecturers() {
    return this.userRepo.find({
      where: { role: Role.LECTURER },
      select: ['id', 'fullName', 'email', 'avatarUrl'],
      order: { fullName: 'ASC' },
    });
  }
}
