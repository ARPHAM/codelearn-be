import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningPathController } from './learning-path.controller';
import { LearningPathService } from './learning-path.service';
import { UserSkillNode } from './entities/user-skill-node.entity';
import { Problem } from '../problem/entities/problem.entity';
import { Submission } from '../submission/entities/submission.entity';
import { AiService } from '../../shared/services/ai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSkillNode, Problem, Submission]),
  ],
  controllers: [LearningPathController],
  providers: [LearningPathService, AiService],
  exports: [LearningPathService],
})
export class LearningPathModule {}
