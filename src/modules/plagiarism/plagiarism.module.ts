import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlagiarismController } from './plagiarism.controller';
import { PlagiarismService } from './plagiarism.service';
import { Submission } from '../submissions/entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Submission])],
  controllers: [PlagiarismController],
  providers: [PlagiarismService],
})
export class PlagiarismModule {}
