import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BankService } from './bank.service';
import { CreateBankDto, AddBankItemDto } from './dto/bank.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('Question Bank')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.LECTURER, Role.ADMIN)
@Controller('bank')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post()
  @ApiOperation({ summary: 'Tao mot ngan hang cau hoi moi' })
  create(@Body() dto: CreateBankDto, @CurrentUser() user: User) {
    return this.bankService.createBank(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lay tat ca ngan hang cau hoi minh quan ly' })
  findAll(@CurrentUser() user: User) {
    return this.bankService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lay chi tiet mot ngan hang kem cac items/problems',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bankService.findOne(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Them cau hoi vao ngan hang' })
  addItem(@Param('id', ParseIntPipe) id: number, @Body() dto: AddBankItemDto) {
    return this.bankService.addItem(id, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Xoa cau hoi khoi ngan hang' })
  deleteItem(@Param('itemId', ParseIntPipe) itemId: number) {
    return this.bankService.deleteItem(itemId);
  }
}
