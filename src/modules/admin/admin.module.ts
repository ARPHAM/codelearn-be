import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../user/entities/user.entity';
import { Language } from '../problem/entities/language.entity';
import { LanguagesService } from './languages.service';
import { LanguagesController } from './languages.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Language])],
  controllers: [AdminController, LanguagesController],
  providers: [AdminService, LanguagesService],
  exports: [LanguagesService],
})
export class AdminModule {}
