import { Test, TestingModule } from '@nestjs/testing';
import { LearningPathService } from './learning-path.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserSkillNode } from './entities/user-skill-node.entity';
import { Problem } from '../problem/entities/problem.entity';
import { Submission } from '../submission/entities/submission.entity';
import { AiService } from '../ai/ai.service';

describe('LearningPathService', () => {
  let service: LearningPathService;

  const mockUserSkillRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockProblemRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockSubmissionRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockAiService = {
    generateLearningPath: jest.fn(),
    getSuggestions: jest.fn(),
    getAiHint: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningPathService,
        {
          provide: getRepositoryToken(UserSkillNode),
          useValue: mockUserSkillRepo,
        },
        {
          provide: getRepositoryToken(Problem),
          useValue: mockProblemRepo,
        },
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepo,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<LearningPathService>(LearningPathService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get empty path if no nodes exist', async () => {
    mockAiService.generateLearningPath.mockResolvedValue([]);
    const result = await service.getMyPath('test-user');
    expect(result).toHaveProperty('nodes');
    expect(result.nodes).toHaveLength(0);
  });
});
