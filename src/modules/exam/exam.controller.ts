import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { ExamGenerationService } from './exam-generation.service';
import { ExamRegradeService } from './exam-regrade.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('Exam & Placement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exam')
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly examGenService: ExamGenerationService,
    private readonly examRegradeService: ExamRegradeService,
  ) {}

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Lấy danh sách đề thi của một lớp học' })
  findAll(@Param('courseId') courseId: string) {
    return this.examService.findAllForCourse(courseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đề thi' })
  findOne(@Param('id') id: string) {
    return this.examService.findOne(id);
  }

  @Post(':id/submit-approval')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER)
  @ApiOperation({ summary: 'Giảng viên gửi đề thi cho Admin duyệt (kiểm tra Rule)' })
  submitForApproval(@Param('id') id: string, @CurrentUser() user: User) {
    return this.examService.submitForApproval(id, user);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin duyệt đề thi' })
  approve(@Param('id') id: string) {
    return this.examService.approveExam(id);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Sinh viên bắt đầu thi (Hệ thống bốc đề riêng)' })
  start(@Param('id') id: string, @CurrentUser() user: User) {
    return this.examGenService.generateForUser(id, user.id);
  }

  @Post(':id/regrade')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin yêu cầu chấm lại toàn bộ bài thi' })
  regrade(@Param('id') id: string) {
    return this.examRegradeService.regradeExam(id);
  }
}
