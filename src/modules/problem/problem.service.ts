import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Problem } from './entities/problem.entity';
import { ProblemVersion } from './entities/problem-version.entity';
import { Testcase } from './entities/testcase.entity';
import { ProblemFile } from './entities/problem-file.entity';
import { ProblemStats } from './entities/problem-stats.entity';
import { Submission } from '../submission/entities/submission.entity';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { FilterProblemDto, ProblemFilterType } from './dto/filter-problem.dto';
import { User } from '../user/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { v4 as uuidv4 } from 'uuid';
import { AssignmentProblem } from '../assignment/entities/assignment-problem.entity';
import { standardizeDescription } from './utils/description.util';

@Injectable()
export class ProblemService {
  constructor(
    @InjectRepository(Problem) private problemRepo: Repository<Problem>,
    @InjectRepository(ProblemVersion)
    private versionRepo: Repository<ProblemVersion>,
    @InjectRepository(Testcase) private testcaseRepo: Repository<Testcase>,
    @InjectRepository(ProblemFile) private fileRepo: Repository<ProblemFile>,
    @InjectRepository(ProblemStats) private statsRepo: Repository<ProblemStats>,
    @InjectRepository(Submission) private subRepo: Repository<Submission>,
    @InjectRepository(AssignmentProblem)
    private assignmentProblemRepo: Repository<AssignmentProblem>,
    @InjectQueue('code-execution') private codeQueue: Queue,
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
      timeLimit: dto.timeLimit || 5000,
      memoryLimit: dto.memoryLimit || 256,
      status: 'INACTIVE', // Requires admin approval to be active
      createdBy: user,
    });
    const savedProblem = await this.problemRepo.save(problem);

    // 2. Create Initial Version
    const versionId = `${savedProblem.id}-v1`;
    const version = this.versionRepo.create({
      id: versionId,
      problem: savedProblem,
      description: standardizeDescription(dto.description),
      workspaceConfig: dto.workspaceConfig,
      entryFile: dto.entryFile,
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

    // 4. Create Problem Files (Consolidated)
    if (dto.problemFiles?.length) {
      const pFilesToSave = dto.problemFiles.map((pf) =>
        this.fileRepo.create({
          id: uuidv4(),
          problemVersion: version,
          language: pf.languageId ? ({ id: pf.languageId } as any) : null,
          path: pf.path,
          content: pf.content,
          type: pf.type || 'NEUTRAL',
          isReadonly: pf.isReadonly || false,
          isEntryFile: pf.isEntryFile || false,
          isFillInTheBlank: pf.isFillInTheBlank || false,
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

  // Admin sees everything with filters and pagination
  async findAllForAdmin(query: FilterProblemDto) {
    const qb = this.problemRepo
      .createQueryBuilder('problem')
      .leftJoinAndSelect('problem.createdBy', 'createdBy')
      .leftJoinAndSelect('problem.stats', 'stats');

    if (query.search) {
      qb.andWhere(
        '(problem.title ILIKE :search OR problem.slug ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.authorId) {
      qb.andWhere('problem.created_by = :authorId', {
        authorId: query.authorId,
      });
    }

    if (query.difficulty) {
      qb.andWhere('problem.difficulty = :difficulty', {
        difficulty: query.difficulty,
      });
    }

    if (query.status) {
      qb.andWhere('problem.status = :status', { status: query.status });
    }

    if (query.courseId) {
      qb.innerJoin(
        AssignmentProblem,
        'ap',
        'ap.problem_id = problem.id',
      ).andWhere('ap.course_id = :courseId', { courseId: query.courseId });
    }

    qb.orderBy('problem.createdAt', 'DESC');

    const total = await qb.getCount();
    const items = await qb
      .skip(((query.page || 1) - 1) * (query.limit || 10))
      .take(query.limit || 10)
      .getMany();

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
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

    // Security check: Lecturers can only see other lecturers' problems if they are ACTIVE.
    // They can always see their own problems (including INACTIVE/PENDING).
    const isAdmin = user.role === Role.ADMIN;
    qb.andWhere(
      '(problem.status = :activeStatus OR problem.created_by = :userId OR :isAdmin = true)',
      { activeStatus: 'ACTIVE', userId: user.id, isAdmin },
    );

    if (query.difficulty) {
      qb.andWhere('problem.difficulty = :difficulty', {
        difficulty: query.difficulty,
      });
    }

    if (query.status) {
      qb.andWhere('problem.status = :status', { status: query.status });
    }

    if (query.courseId) {
      qb.innerJoin(
        AssignmentProblem,
        'ap',
        'ap.problem.id = problem.id',
      ).innerJoin('ap.assignment', 'a');
      qb.andWhere('a.course.id = :courseId', { courseId: query.courseId });
    }

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

  // Student sees only PUBLIC and ACTIVE problems
  async findAllForStudent(query: FilterProblemDto, user: User) {
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

    if (query.difficulty) {
      qb.andWhere('problem.difficulty = :difficulty', {
        difficulty: query.difficulty,
      });
    }

    if (query.status && user) {
      // Subquery to check if user has passed this problem
      // A problem is solved if there's any submission with status 'PASSED' for its versions
      const solvedSubQuery = qb
        .subQuery()
        .select('1')
        .from('submissions', 'sub')
        .innerJoin('problem_versions', 'pv', 'pv.id = sub.problem_version_id')
        .where('pv.problem_id = problem.id')
        .andWhere('sub.user_id = :userId', { userId: user.id })
        .andWhere('sub.status = :passedStatus', { passedStatus: 'PASSED' })
        .getQuery();

      if (query.status === 'SOLVED') {
        qb.andWhere(`EXISTS (${solvedSubQuery})`);
      } else if (query.status === 'UNSOLVED') {
        qb.andWhere(`NOT EXISTS (${solvedSubQuery})`);
      }
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

    const currentVersion = versions[0];
    let testcases: Testcase[] = [];
    let problemFiles: ProblemFile[] = [];

    if (currentVersion) {
      testcases = await this.testcaseRepo.find({
        where: { problemVersion: { id: currentVersion.id } },
      });
      problemFiles = await this.fileRepo.find({
        where: { problemVersion: { id: currentVersion.id } },
        relations: ['language'],
      });
    }

    return {
      problem,
      versions,
      testcases,
      problemFiles,
      languageFiles: problemFiles, // For backward compatibility with frontend
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

    // Only set to PENDING if currently INACTIVE or REJECTED
    // If it's already ACTIVE, keep it ACTIVE so students can still access the old version
    if (problem.status === 'INACTIVE' || problem.status === 'REJECTED') {
      problem.status = 'PENDING';
    }

    await this.problemRepo.save(problem);

    // 2. Create a NEW Version (PENDING)
    const versionCount = await this.versionRepo.count({
      where: { problem: { id } },
    });
    const versionId = `${problem.id}-v${versionCount + 1}`;

    const version = this.versionRepo.create({
      id: versionId,
      problem: problem,
      description: standardizeDescription(dto.description),
      workspaceConfig: dto.workspaceConfig,
      entryFile: dto.entryFile,
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

    // 4. Re-create consolidated problem files for this version
    if (dto.problemFiles?.length) {
      const pFilesToSave = dto.problemFiles.map((pf) =>
        this.fileRepo.create({
          id: uuidv4(),
          problemVersion: version,
          language: pf.languageId ? ({ id: pf.languageId } as any) : null,
          path: pf.path,
          content: pf.content,
          type: pf.type || 'NEUTRAL',
          isReadonly: pf.isReadonly || false,
          isEntryFile: pf.isEntryFile || false,
          isFillInTheBlank: pf.isFillInTheBlank || false,
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
  async findOneForStudent(slug: string, user?: User, languageId?: number, examId?: string) {
    const problem = await this.problemRepo.findOne({
      where: { slug },
      relations: ['createdBy'],
    });

    if (!problem) throw new NotFoundException('Problem not found');

    const isOwner = user && (problem as any).createdBy?.id === user.id;
    const isAdmin = user && user.role === Role.ADMIN;
    const canSeeAll = isOwner || isAdmin;

    const isPublicAndActive =
      problem.visibility === 'PUBLIC' && problem.status === 'ACTIVE';

    // Check visibility
    if (!canSeeAll && problem.visibility === 'PRIVATE' && !examId) {
      throw new NotFoundException('Problem not found');
    }

    if (!isPublicAndActive && !canSeeAll && !examId) {
      throw new NotFoundException('Problem not found or not public');
    }

    let versionId: string | null | undefined = problem.currentVersionId;

    // If no official version but requester is authorized, use the latest draft version
    if (!versionId && (isOwner || isAdmin)) {
      const latestVersion = await this.versionRepo.findOne({
        where: { problem: { id: problem.id } },
        order: { createdAt: 'DESC' },
      });
      versionId = latestVersion?.id;
    }

    if (!versionId)
      throw new NotFoundException('Bài tập chưa có phiên bản chính thức hoặc nháp');

    const version = await this.versionRepo.findOne({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException('Active version not found');
    const stats = await this.statsRepo.findOne({
      where: { problemId: problem.id },
    });

    // Fetch testcases
    let testcases: Testcase[] = [];
    if (canSeeAll) {
      // Authors and Admins see ALL testcases
      testcases = await this.testcaseRepo.find({
        where: { problemVersion: { id: versionId } },
        order: { order: 'ASC' },
      });
    } else {
      // Students only see public testcases
      testcases = await this.testcaseRepo.find({
        where: { problemVersion: { id: versionId }, isHidden: false },
        order: { order: 'ASC' },
      });
    }

    let studentFiles: ProblemFile[] = [];

    if (canSeeAll) {
      // Authors and Admins see EVERYTHING
      studentFiles = await this.fileRepo.find({
        where: { problemVersion: { id: versionId } },
        relations: ['language'],
      });
    } else if (examId) {
      // Exam Mode: Return TEMPLATE and NEUTRAL
      const queryBuilder = this.fileRepo.createQueryBuilder('file')
        .where('file.problem_version_id = :versionId', { versionId })
        .andWhere('(file.type = :neutralType OR file.type = :templateType)', {
          neutralType: 'NEUTRAL',
          templateType: 'TEMPLATE'
        });
      
      if (languageId) {
        queryBuilder.andWhere('file.language_id = :languageId', { languageId });
      }
      studentFiles = await queryBuilder.getMany();
    } else {
      // Normal Practice Mode: Return empty files as per requirement
      studentFiles = [];
    }

    return {
      id: problem.id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      type: problem.type,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      stats: stats,
      version: { 
        id: version.id, 
        description: version.description,
        workspaceConfig: version.workspaceConfig,
        entryFile: version.entryFile
      },
      testcases: testcases,
      files: studentFiles,
      languageFiles: studentFiles,
      canEdit: canSeeAll,
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

  // Admin rejects a version
  async rejectVersion(versionId: string) {
    const version = await this.versionRepo.findOne({
      where: { id: versionId },
      relations: ['problem'],
    });
    if (!version) throw new NotFoundException('Version not found');

    version.status = 'REJECTED';
    await this.versionRepo.save(version);

    // If the problem was pointing to this version as current, we might want to reconsider its status.
    // However, usually only pending (INACTIVE) problems get rejected.
    const problem = version.problem;
    if (problem.currentVersionId === version.id || problem.status === 'INACTIVE') {
      problem.status = 'REJECTED';
      await this.problemRepo.save(problem);
    }

    return { message: 'Version rejected successfully', problemId: problem.id };
  }

  /**
   * Lấy danh sách các tác giả đã từng tạo bài tập (bao gồm cả Admin và Lecturer)
   */
  async findAllAuthors() {
    // Sử dụng repository của User để lấy dữ liệu User trực tiếp, join với Problem để lọc ra những người có bài tập
    return await this.problemRepo.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .innerJoin(Problem, 'problem', 'problem.created_by = user.id')
      .select(['user.id', 'user.fullName', 'user.email', 'user.avatarUrl'])
      .distinct(true)
      .getMany();
  }

  async verifySolution(versionId: string, languageId: number) {
    const version = await this.versionRepo.findOne({
      where: { id: versionId },
      relations: ['problem'],
    });
    if (!version) throw new NotFoundException('Phien ban khong ton tai');

    const testcases = await this.testcaseRepo.find({
      where: { problemVersion: { id: versionId } },
    });
    if (!testcases.length) throw new BadRequestException('Bai tap chua co testcase');

    // Lay tat ca file giai phap cho ngon ngu nay
    const solutionFiles = await this.fileRepo.find({
      where: { 
        problemVersion: { id: versionId }, 
        language: { id: languageId }, 
        type: 'SOLUTION' 
      },
      relations: ['language']
    });

    if (!solutionFiles.length) throw new BadRequestException('Khong tim thay file giai pháp cho ngon ngu nay');

    // Lấy thêm file neutral và hidden cho ngôn ngữ này
    const systemFiles = await this.fileRepo.find({
      where: [
        { problemVersion: { id: versionId }, type: 'NEUTRAL' },
        { problemVersion: { id: versionId }, language: { id: languageId }, type: 'HIDDEN' }
      ]
    });

    const finalFiles = [...solutionFiles, ...systemFiles].map(f => ({
      filePath: f.path,
      content: f.content
    }));

    const entryFileObj = solutionFiles.find(f => f.isEntryFile) || systemFiles.find(f => f.isEntryFile) || solutionFiles[0];
    const language = (solutionFiles[0] as any).language;

    // Build a temporary submission but with context SYSTEM_VERIFY
    const subId = `verify-${uuidv4()}`;
    const submission = this.subRepo.create({
        id: subId,
        problemVersion: { id: versionId },
        languageId,
        code: JSON.stringify({ entryFile: entryFileObj.path, files: finalFiles }),
        status: 'QUEUED',
        context: 'SYSTEM_VERIFY',
        contextId: versionId,
        type: 'SUBMIT'
    });
    await this.subRepo.save(submission);

    await this.codeQueue.add({
      submissionId: subId,
      language: language.name,
      problemVersionId: versionId,
      files: finalFiles,
      entryFile: entryFileObj.path,
      timeLimit: version.problem.timeLimit,
      memoryLimit: version.problem.memoryLimit,
    });

    return { message: 'Đã bắt đầu quá trình xác thực giải pháp...', submissionId: subId };
  }
}
