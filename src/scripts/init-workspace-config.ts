import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProblemVersion } from '../modules/problem/entities/problem-version.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const versionRepo = app.get<Repository<ProblemVersion>>(
    getRepositoryToken(ProblemVersion),
  );

  console.log('--- UPDATING WORKSPACE CONFIGS ---');
  
  const result = await versionRepo
    .createQueryBuilder()
    .update(ProblemVersion)
    .set({
      workspaceConfig: {
        canCreateFile: false,
        canChangeMainFile: false,
      } as any,
    })
    .where('workspace_config IS NULL')
    .execute();

  console.log(`Updated ${result.affected} records.`);
  
  await app.close();
}

bootstrap();
