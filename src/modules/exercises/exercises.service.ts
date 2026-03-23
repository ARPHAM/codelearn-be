import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise, TestCase } from './entities/exercise.entity';
import { User } from '../user/entities/user.entity';
import { CreateExerciseDto, UpdateExerciseDto, ListExercisesDto } from './dto/exercises.dto';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise) private exerciseRepo: Repository<Exercise>,
    @InjectRepository(TestCase) private testCaseRepo: Repository<TestCase>,
  ) {}

  async findAll(query: ListExercisesDto) {
    const qb = this.exerciseRepo.createQueryBuilder('e');
    if (query.courseId) qb.andWhere('e.courseId = :c', { c: query.courseId });
    if (query.difficulty) qb.andWhere('e.difficulty = :d', { d: query.difficulty });
    if (query.tag) qb.andWhere(':tag = ANY(e.tags)', { tag: query.tag });
    const exercises = await qb.getMany();
    return { exercises };
  }

  async findOne(id: number) {
    const exercise = await this.exerciseRepo.findOne({ where: { id }, relations: ['testCases'] });
    if (!exercise) throw new NotFoundException('Bai tap khong ton tai');
    return exercise;
  }

  async create(dto: CreateExerciseDto, creator: User) {
    const exercise = this.exerciseRepo.create({ ...dto, creatorId: creator.id, status: 'draft' });
    const saved = await this.exerciseRepo.save(exercise);
    if (dto.testCases?.length) {
      const cases = dto.testCases.map((tc, idx) =>
        this.testCaseRepo.create({ exerciseId: saved.id, input: tc.input, expectedOutput: tc.output, isHidden: tc.hidden ?? false, orderIdx: idx }),
      );
      await this.testCaseRepo.save(cases);
    }
    return { id: saved.id, message: 'Tao bai tap thanh cong', status: 'draft' };
  }

  async update(id: number, dto: UpdateExerciseDto, currentUser: User) {
    const exercise = await this.exerciseRepo.findOne({ where: { id } });
    if (!exercise) throw new NotFoundException('Bai tap khong ton tai');
    if (exercise.creatorId !== currentUser.id && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Ban khong phai tac gia bai tap nay');
    }
    Object.assign(exercise, dto);
    await this.exerciseRepo.save(exercise);
    return { message: 'Cap nhat thanh cong', updatedAt: new Date().toISOString() };
  }
}
