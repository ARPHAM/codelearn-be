import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Problem } from './entities/problem.entity';
import { ProblemVersion } from './entities/problem-version.entity';
import { Testcase } from './entities/testcase.entity';
import { ProblemLanguageFile } from './entities/problem-language-file.entity';
import { ProblemFile } from './entities/problem-file.entity';
import { ProblemStats } from './entities/problem-stats.entity';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { FilterProblemDto, ProblemFilterType } from './dto/filter-problem.dto';
import { User } from '../user/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProblemService {
  constructor(
    @InjectRepository(Problem) private problemRepo: Repository<Problem>,
    @InjectRepository(ProblemVersion)
    private versionRepo: Repository<ProblemVersion>,
    @InjectRepository(Testcase) private testcaseRepo: Repository<Testcase>,
    @InjectRepository(ProblemLanguageFile)
    private langFileRepo: Repository<ProblemLanguageFile>,
    @InjectRepository(ProblemFile) private fileRepo: Repository<ProblemFile>,
    @InjectRepository(ProblemStats) private statsRepo: Repository<ProblemStats>,
  ) {}

  async create(dto: CreateProblemDto, user: User) {
    // 1. Create Problem
    const problem = this.problemRepo.create({
      title: dto.title,
      slug: dto.slug || dto.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), // Basic slug generation
      difficulty: dto.difficulty,
      type: dto.type,
      visibility: dto.visibility,
      source: dto.source,
      status: 'INACTIVE', // Requires admin approval to be active
      createdBy: user,
    });
    const savedProblem = await this.problemRepo.save(problem);

    // 2. Create Initial Version
    const versionId = `${savedProblem.id}-v1`;
    const version = this.versionRepo.create({
      id: versionId,
      problem: savedProblem,
      description: dto.description,
      workspaceConfig: dto.workspaceConfig,
      status: dto.status || 'PENDING', // PENDING for admin approval, DRAFT otherwise
      createdBy: user,
    });
    await this.versionRepo.save(version);

    // 3. Create Testcases
    if (dto.testcases?.length) {
      const testcasesToSave = dto.testcases.map((tc) =>
        this.testcaseRepo.create({
          id: uuidv4(),
          problemVersion: version,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          score: tc.score,
          isHidden: tc.isHidden || false,
          order: tc.order,
        }),
      );
      await this.testcaseRepo.save(testcasesToSave);
    }

    // 4. Create Language Files
    if (dto.languageFiles?.length) {
      const langFilesToSave = dto.languageFiles.map((lf) =>
        this.langFileRepo.create({
          problem: savedProblem,
          language: { id: lf.languageId } as any, // assuming language relation just needs ID
          path: lf.path,
          content: lf.content,
          type: lf.type,
        }),
      );
      await this.langFileRepo.save(langFilesToSave);
    }

    // 5. Create Problem Files
    if (dto.problemFiles?.length) {
      const pFilesToSave = dto.problemFiles.map((pf) =>
        this.fileRepo.create({
          id: uuidv4(),
          problemVersion: version,
          path: pf.path,
          content: pf.content,
          isReadonly: pf.isReadonly || false,
        }),
      );
      await this.fileRepo.save(pFilesToSave);
    }

    // Initialize stats
    const stats = this.statsRepo.create({
      problemId: savedProblem.id,
      problem: savedProblem,
    });
    await this.statsRepo.save(stats);

    return {
      problemId: savedProblem.id,
      versionId: version.id,
      slug: savedProblem.slug,
    };
  }

  // Admin sees everything
  async findAllForAdmin() {
    const [items, total] = await this.problemRepo.findAndCount({
      relations: ['createdBy'],
    });
    return { items, total, page: 1, limit: items.length };
  }

  // Lecturer sees standard info of ALL problems but with pagination and filters
  async findAllForLecturer(query: FilterProblemDto, user: User) {
    const qb = this.problemRepo
      .createQueryBuilder('problem')
      .leftJoinAndSelect('problem.createdBy', 'createdBy')
      .leftJoinAndSelect('problem.stats', 'stats');

    if (query.filter === ProblemFilterType.ME) {
      qb.andWhere('problem.created_by = :userId', { userId: user.id });
    } else if (query.filter === ProblemFilterType.PUBLIC) {
      qb.andWhere('problem.visibility = :public', { public: 'PUBLIC' });
    } else if (query.filter === ProblemFilterType.PRIVATE) {
      qb.andWhere('problem.visibility = :private', { private: 'PRIVATE' });
    }
    // If ALL, no visibility/owner filter is applied, meaning they see basics of everything.

    if (query.search) {
      qb.andWhere(
        '(problem.title ILIKE :search OR problem.slug ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.orderBy('problem.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Map items to mask some details if necessary, but returning basic item is fine
    return { items, total, page, limit };
  }

  // Student sees only PUBLIC and ACTIVE problems
  async findAllForStudent(query: FilterProblemDto) {
    const qb = this.problemRepo
      .createQueryBuilder('problem')
      .leftJoinAndSelect('problem.createdBy', 'createdBy')
      .leftJoinAndSelect('problem.stats', 'stats')
      .where('problem.visibility = :visibility', { visibility: 'PUBLIC' })
      .andWhere('problem.status = :status', { status: 'ACTIVE' });

    if (query.search) {
      qb.andWhere(
        '(problem.title ILIKE :search OR problem.slug ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.orderBy('problem.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { items, total, page, limit };
  }

  // Full detail view for Edit (Admin or creator Lecturer)
  async findOneForEdit(id: string, user: User) {
    const problem = await this.problemRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!problem) throw new NotFoundException('Problem not found');

    // Admin or Creator can edit. Others can only view if PUBLIC.
    const isCreator = problem.createdBy.id === user.id;
    const isAdmin = user.role === Role.ADMIN;
    const canEdit = isCreator || isAdmin;

    if (!canEdit && problem.visibility !== 'PUBLIC') {
      throw new ForbiddenException(
        'You can only view details of your own problems or public problems',
      );
    }

    const versions = await this.versionRepo.find({
      where: { problem: { id } },
      order: { createdAt: 'DESC' },
    });

    const currentVersion = versions[0]; // Or explicitly get by currentVersionId
    let testcases: Testcase[] = [];
    let problemFiles: ProblemFile[] = [];
    if (currentVersion) {
      testcases = await this.testcaseRepo.find({
        where: { problemVersion: { id: currentVersion.id } },
      });
      problemFiles = await this.fileRepo.find({
        where: { problemVersion: { id: currentVersion.id } },
      });
    }

    const languageFiles = await this.langFileRepo.find({
      where: { problem: { id } },
      relations: ['language'],
    });

    return {
      problem,
      versions,
      testcases,
      languageFiles,
      problemFiles,
      canEdit,
    };
  }

  // Lecturer updates a problem (creates a new PENDING version)
  async update(id: string, dto: UpdateProblemDto, user: User) {
    const problem = await this.problemRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!problem) throw new NotFoundException('Problem not found');

    if (user.role !== Role.ADMIN && problem.createdBy.id !== user.id) {
      throw new ForbiddenException('You can only edit your own problems');
    }

    // 1. Update basic Problem info (title, difficulty, etc)
    // We update problem metadata immediately since it belongs to the problem container.
    problem.title = dto.title;
    if (dto.slug) problem.slug = dto.slug;
    problem.difficulty = dto.difficulty;
    problem.type = dto.type;
    problem.visibility = dto.visibility;
    if (dto.source) problem.source = dto.source;
    await this.problemRepo.save(problem);

    // 2. Create a NEW Version (PENDING)
    const versionCount = await this.versionRepo.count({
      where: { problem: { id } },
    });
    const versionId = `${problem.id}-v${versionCount + 1}`;

    const version = this.versionRepo.create({
      id: versionId,
      problem: problem,
      description: dto.description,
      workspaceConfig: dto.workspaceConfig,
      status: 'PENDING', // Editing always requires re-approval
      createdBy: user,
    });
    await this.versionRepo.save(version);

    // 3. Re-create Testcases for this new version
    if (dto.testcases?.length) {
      const testcasesToSave = dto.testcases.map((tc) =>
        this.testcaseRepo.create({
          id: uuidv4(),
          problemVersion: version,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          score: tc.score,
          isHidden: tc.isHidden || false,
          order: tc.order,
        }),
      );
      await this.testcaseRepo.save(testcasesToSave);
    }

    // 4. Update Language Files (overwrite for the problem)
    // Delete existing language files for this problem and insert new ones
    await this.langFileRepo.delete({ problem: { id } });
    if (dto.languageFiles?.length) {
      const langFilesToSave = dto.languageFiles.map((lf) =>
        this.langFileRepo.create({
          problem: problem,
          language: { id: lf.languageId } as any,
          path: lf.path,
          content: lf.content,
          type: lf.type,
        }),
      );
      await this.langFileRepo.save(langFilesToSave);
    }

    // 5. Re-create problem files for this version
    if (dto.problemFiles?.length) {
      const pFilesToSave = dto.problemFiles.map((pf) =>
        this.fileRepo.create({
          id: uuidv4(),
          problemVersion: version,
          path: pf.path,
          content: pf.content,
          isReadonly: pf.isReadonly || false,
        }),
      );
      await this.fileRepo.save(pFilesToSave);
    }

    return {
      message: 'Problem updated successfully and pending approval',
      problemId: problem.id,
      versionId: version.id,
    };
  }

  // View for Student (No hidden testcases, no solution code)
  async findOneForStudent(slug: string) {
    const problem = await this.problemRepo.findOne({
      where: { slug, visibility: 'PUBLIC', status: 'ACTIVE' },
    });
    if (!problem)
      throw new NotFoundException('Problem not found or not public');

    const versionId = problem.currentVersionId;
    if (!versionId)
      throw new NotFoundException('Problem has no active version');

    const version = await this.versionRepo.findOne({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException('Active version not found');
    const stats = await this.statsRepo.findOne({
      where: { problemId: problem.id },
    });

    // Only fetch non-hidden testcases
    const publicTestcases = await this.testcaseRepo.find({
      where: { problemVersion: { id: versionId }, isHidden: false },
    });

    // Only fetch template language files
    const templateFiles = await this.langFileRepo.find({
      where: { problem: { id: problem.id }, type: 'TEMPLATE' },
      relations: ['language'],
    });

    const problemFiles = await this.fileRepo.find({
      where: { problemVersion: { id: versionId } },
    });

    return {
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      type: problem.type,
      stats: stats,
      version: { id: version.id, description: version.description },
      testcases: publicTestcases,
      languageFiles: templateFiles,
      files: problemFiles,
    };
  }

  // Admin approves a version
  async approveVersion(versionId: string) {
    const version = await this.versionRepo.findOne({
      where: { id: versionId },
      relations: ['problem'],
    });
    if (!version) throw new NotFoundException('Version not found');

    version.status = 'APPROVED';
    await this.versionRepo.save(version);

    // Update Problem to make it active and point to this current version
    const problem = version.problem;
    problem.status = 'ACTIVE';
    problem.currentVersionId = version.id;
    await this.problemRepo.save(problem);

    return { message: 'Version approved successfully', problemId: problem.id };
  }
}
