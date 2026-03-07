import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class AiHintDto {
  @ApiProperty() @IsNumber() @Type(() => Number) exerciseId: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() submissionId?: number;
  @ApiProperty() @IsString() userCode: string;
  @ApiProperty() @IsString() question: string;
  @ApiProperty() @IsString() language: string;
}

@ApiTags('Learning Path & AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller()
export class LearningPathController {
  constructor(private readonly learningPathService: LearningPathService) {}

  @Get('learning-path/me')
  @ApiOperation({ summary: 'Lay lo trinh hoc ca nhan' })
  getMyPath(@CurrentUser() user: User) {
    return this.learningPathService.getMyPath(user.id);
  }

  @Get('ai/suggest')
  @ApiOperation({ summary: 'AI goi y bai tap tiep theo' })
  getSuggestions(@CurrentUser() user: User, @Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.learningPathService.getSuggestions(user.id, limit ?? 5);
  }

  @Post('ai/hint')
  @ApiOperation({ summary: 'Yeu cau AI giai thich loi hoac goi y huong giai' })
  getHint(@Body() dto: AiHintDto, @CurrentUser() user: User) {
    return this.learningPathService.getAiHint(dto, user.id);
  }
}
