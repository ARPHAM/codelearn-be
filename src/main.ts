import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Global prefix
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORS
  const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3456').split(',');
  app.enableCors({ origin: corsOrigins, credentials: true });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE ?? 'CodeLearn API')
      .setDescription(process.env.SWAGGER_DESCRIPTION ?? 'CodeLearn REST API v1 Documentation')
      .setVersion(process.env.SWAGGER_VERSION ?? '1.0')
      .addBearerAuth()
      .addTag('Authentication')
      .addTag('Courses & Enrollments')
      .addTag('Exercises & Submissions')
      .addTag('Plagiarism Detection')
      .addTag('Question Bank & Exams')
      .addTag('Analytics & Dashboard')
      .addTag('Learning Path & AI')
      .addTag('Pair Programming')
      .addTag('Code Battle')
      .addTag('Admin — Sandbox')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    const swaggerPath = process.env.SWAGGER_PATH ?? 'api/docs';
    SwaggerModule.setup(swaggerPath, app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 CodeLearn API running on http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/${process.env.SWAGGER_PATH ?? 'api/docs'}`);
}
bootstrap();
