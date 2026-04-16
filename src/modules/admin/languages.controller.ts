import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LanguagesService } from './languages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Languages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả ngôn ngữ hỗ trợ (dành cho sinh viên)',
  })
  findAll() {
    return this.languagesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một ngôn ngữ' })
  findOne(@Param('id') id: string) {
    return this.languagesService.findOne(+id);
  }
}
