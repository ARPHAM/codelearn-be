import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../problem/entities/language.entity';
import { exec } from 'child_process';
import { promisify } from 'util';
import { languageConfig } from '../../config/language.config';

const execAsync = promisify(exec);

@Injectable()
export class LanguagesService implements OnModuleInit {
  private readonly logger = new Logger(LanguagesService.name);

  constructor(
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
  ) {}

  async onModuleInit() {
    await this.seedLanguages();
  }

  private async seedLanguages() {
    const count = await this.languageRepo.count();
    if (count > 0) return;

    this.logger.log('Seeding initial languages from config...');
    const languages = Object.entries(languageConfig).map(([name, config], index) => {
      const lang = new Language();
      lang.name = name.charAt(0).toUpperCase() + name.slice(1);
      lang.version = config.image.split(':').pop() || 'latest';
      lang.dockerImage = config.image;
      lang.ext = config.ext;
      lang.runCmd = config.run;
      lang.imageStatus = 'READY'; // Assume pre-installed for seed
      
      // Basic templates
      if (name === 'python') lang.template = 'def main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()';
      if (name === 'java') lang.template = 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}';
      if (name === 'cpp') lang.template = '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}';
      if (name === 'javascript' || name === 'typescript') lang.template = 'console.log("Hello, World!");';
      
      return lang;
    });

    await this.languageRepo.save(languages);
    this.logger.log(`Seeded ${languages.length} languages.`);
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
