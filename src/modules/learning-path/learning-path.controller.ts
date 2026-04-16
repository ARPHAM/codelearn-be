import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../user/entities/user.entity';
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

@ApiTags('Student Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.ADMIN)
@Controller('student')
export class LearningPathController {
  constructor(private readonly learningPathService: LearningPathService) {}

  @Get('learning-path')
  @ApiOperation({ summary: 'Lấy cây kỹ năng chi tiết của sinh viên' })
  getMyPath(@CurrentUser() user: User) {
    return this.learningPathService.getMyPath(user.id);
  }

  @Post('learning-path/refresh')
  @ApiOperation({ summary: 'AI cập nhật lại lộ trình học (Re-generate)' })
  refreshPath(@CurrentUser() user: User) {
    return this.learningPathService.refreshLearningPath(user.id);
  }

  @Get('learning-path/suggestions')
  @ApiOperation({ summary: 'AI gợi ý bài tập dựa trên điểm yếu' })
  getSuggestions(
    @CurrentUser() user: User,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.learningPathService.getSuggestions(user.id, limit ?? 5);
  }

  @Post('ai/hint')
  @ApiOperation({ summary: 'AI gợi ý hướng giải bài tập' })
  getHint(@Body() dto: AiHintDto, @CurrentUser() user: User) {
    return this.learningPathService.getAiHint(dto, user.id);
  }
}
