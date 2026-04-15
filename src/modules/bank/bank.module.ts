import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankService } from './bank.service';
import { BankController } from './bank.controller';
import { QuestionBank } from './entities/question-bank.entity';
import { BankItem } from './entities/bank-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuestionBank, BankItem])],
  controllers: [BankController],
  providers: [BankService],
  exports: [BankService],
})
export class BankModule {}
