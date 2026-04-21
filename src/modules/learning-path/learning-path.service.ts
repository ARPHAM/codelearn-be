import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSkillNode } from './entities/user-skill-node.entity';
import { Problem } from '../problem/entities/problem.entity';
import { Submission } from '../submission/entities/submission.entity';
import { AiService } from '../ai/ai.service';

@Injectable()
export class LearningPathService {
  private readonly logger = new Logger(LearningPathService.name);

  constructor(
    @InjectRepository(UserSkillNode)
    private userSkillRepo: Repository<UserSkillNode>,
    @InjectRepository(Problem)
    private problemRepo: Repository<Problem>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    private aiService: AiService,
  ) {}

  async getMyPath(userId: string) {
    let nodes = await this.userSkillRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    if (nodes.length === 0) {
      nodes = await this.refreshLearningPath(userId);
    }

    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        title: n.title,
        tag: n.tag,
        difficulty: n.difficulty,
        status: n.status,
        progress: n.progress,
        position: { x: n.positionX, y: n.positionY },
        parentId: n.parentId,
      })),
    };
  }

  async refreshLearningPath(userId: string) {
    try {
      // 1. Get user context
      const solvedSubmissions = await this.submissionRepo.find({
        where: { user: { id: userId }, status: 'ACCEPTED' },
        relations: ['problemVersion', 'problemVersion.problem'],
      });

      const solvedTags = [
        ...new Set(
          solvedSubmissions
            .map((s) => s.problemVersion.problem.tags || [])
            .flat()
            .filter(Boolean),
        ),
      ];

      // 2. Generate path via AI
      const aiNodes = await this.aiService.generateLearningPath({
        fullName: 'Sinh viên', // Mock
        solvedTags,
        preferredLanguages: ['C++', 'Python'], // Mock
        currentLevel: 1,
      });

      // 3. Clear old nodes
      await this.userSkillRepo.delete({ userId });

      // 4. Save new nodes (handle parent mapping)
      const idMap = new Map<string, string>();

      // Save all nodes first to get IDs
      for (const aiNode of aiNodes) {
        const newNode = this.userSkillRepo.create({
          userId,
          title: aiNode.title,
          tag: aiNode.tag,
          difficulty: aiNode.difficulty,
          status: aiNode.parentId === null ? 'ACTIVE' : 'LOCKED',
          positionX: aiNode.position.x,
          positionY: aiNode.position.y,
        });
        const saved = await this.userSkillRepo.save(newNode);
        idMap.set(aiNode.tempId, saved.id);
      }

      // Update parentIds
      for (const aiNode of aiNodes) {
        if (aiNode.parentId) {
          const dbId = idMap.get(aiNode.tempId);
          const dbParentId = idMap.get(aiNode.parentId);
          if (dbId && dbParentId) {
            await this.userSkillRepo.update(dbId, { parentId: dbParentId });
          }
        }
      }

      return this.userSkillRepo.find({ where: { userId } });
    } catch (error) {
      this.logger.error(
        `Failed to refresh learning path for user ${userId}`,
        error,
      );
      return [];
    }
  }

  async getSuggestions(userId: string, limit: number = 5) {
    const solvedSubmissions = await this.submissionRepo.find({
      where: { user: { id: userId }, status: 'ACCEPTED' },
      relations: ['problemVersion', 'problemVersion.problem'],
    });
    const solvedTags = [
      ...new Set(
        solvedSubmissions
          .map((s) => s.problemVersion.problem.tags || [])
          .flat()
          .filter(Boolean),
      ),
    ];

    const aiSuggestions = await this.aiService.getSuggestions({ solvedTags });

    // Find problems matching the suggested tags
    let suggestedProblems: Problem[] = [];
    if (aiSuggestions && aiSuggestions.length > 0) {
      suggestedProblems = await this.problemRepo
        .createQueryBuilder('p')
        .where('p.tags && :tags', { tags: aiSuggestions })
        .limit(limit)
        .getMany();
    }

    return {
      suggestions: suggestedProblems.map((p) => ({
        problemId: p.id,
        title: p.title,
        tag: p.tags?.[0] || 'Chung',
        difficulty: p.difficulty,
        aiReason: `Dựa trên kỹ năng ${p.tags?.[0]} của bạn.`,
      })),
    };
  }

  async getAiHint(dto: any, userId: string) {
    return this.aiService.getAiHint({
      userCode: dto.userCode,
      question: dto.question,
      language: dto.language,
    });
  }
}
