import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../problem/entities/language.entity';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
@Injectable()
export class LanguagesService implements OnModuleInit {
  private readonly logger = new Logger(LanguagesService.name);

  constructor(
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
  ) {}

  async onModuleInit() {
    this.logger.log('LanguagesService initialized with dynamic DB configuration.');
  }

  async findAll() {
    return this.languageRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    return this.languageRepo.findOne({ where: { id } });
  }

  async create(dto: Partial<Language>) {
    const language = this.languageRepo.create(dto);
    language.imageStatus = 'PULLING';
    const saved = await this.languageRepo.save(language);
    
    this.pullImage(saved.id, saved.dockerImage);
    return saved;
  }

  async update(id: number, dto: Partial<Language>) {
    const language = await this.findOne(id);
    if (!language) throw new Error('Language not found');

    const oldImage = language.dockerImage;
    Object.assign(language, dto);

    if (dto.dockerImage && dto.dockerImage !== oldImage) {
      language.imageStatus = 'PULLING';
    }

    const saved = await this.languageRepo.save(language);
    
    if (language.imageStatus === 'PULLING') {
      this.pullImage(saved.id, saved.dockerImage);
    }

    return saved;
  }

  async remove(id: number) {
    return this.languageRepo.delete(id);
  }

  private async pullImage(id: number, imageName: string) {
    this.logger.log(`Starting docker pull for ${imageName}...`);
    try {
      await execAsync(`docker pull ${imageName}`);
      await this.languageRepo.update(id, { imageStatus: 'READY', lastError: null });
      this.logger.log(`Successfully pulled ${imageName}`);
    } catch (error) {
      this.logger.error(`Failed to pull ${imageName}: ${error.message}`);
      await this.languageRepo.update(id, { 
        imageStatus: 'ERROR', 
        lastError: error.message 
      });
    }
  }
}
