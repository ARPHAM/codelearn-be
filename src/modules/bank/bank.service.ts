import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionBank } from './entities/question-bank.entity';
import { BankItem } from './entities/bank-item.entity';
import { CreateBankDto, AddBankItemDto } from './dto/bank.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(QuestionBank)
    private bankRepo: Repository<QuestionBank>,
    @InjectRepository(BankItem)
    private itemRepo: Repository<BankItem>,
  ) {}

  async createBank(dto: CreateBankDto, user: User) {
    const bank = this.bankRepo.create({
      ...dto,
      createdBy: { id: user.id },
    });
    return this.bankRepo.save(bank);
  }

  async findAll(user: User) {
    return this.bankRepo.find({
      where: { createdBy: { id: user.id } },
    });
  }

  async findOne(id: number) {
    const bank = await this.bankRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!bank) throw new NotFoundException('Ngan hang cau hoi khong ton tai');
    
    const items = await this.itemRepo.find({
      where: { bank: { id } },
      relations: ['problem'],
    });
    
    return { ...bank, items };
  }

  async addItem(bankId: number, dto: AddBankItemDto) {
    const item = this.itemRepo.create({
      bank: { id: bankId },
      problem: { id: dto.problemId as any },
      note: dto.note,
    });
    return this.itemRepo.save(item);
  }

  async deleteItem(itemId: number) {
    const item = await this.itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item khong ton tai');
    return this.itemRepo.remove(item);
  }
}
