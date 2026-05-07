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
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exam')
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly examGenService: ExamGenerationService,
    private readonly examRegradeService: ExamRegradeService,
  ) {}

  @Get('ping')
  @ApiOperation({ summary: 'Kiểm tra trạng thái module' })
  ping() {
    return { status: 'ok', module: 'ExamModule' };
  }

  @Get()
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy tất cả đề thi' })
  findAllExams() {
    return this.examService.findAll();
  }

  @Post('create')
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Tạo đề thi mới' })
  create(@Body() dto: any) {
    console.log('[ExamController] Creating exam with data:', dto);
    return this.examService.create(dto);
  }

  @Get('course/:courseId')
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy danh sách đề thi của một lớp học' })
  findAll(@Param('courseId') courseId: string) {
    return this.examService.findAllForCourse(courseId);
  }

  @Get('my-upcoming')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Lấy danh sách các kỳ thi sắp tới của sinh viên' })
  getUpcoming(@CurrentUser() user: User) {
    return this.examService.getUpcomingExams(user.id);
  }

  @Get(':id')
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Chi tiết đề thi' })
  findOne(@Param('id') id: string) {
    return this.examService.findOne(id);
  }

  @Post(':id/submit-approval')
  @Roles(Role.LECTURER)
  @ApiOperation({ summary: 'Giảng viên gửi đề thi cho Admin duyệt (kiểm tra Rule)' })
  submitForApproval(@Param('id') id: string, @CurrentUser() user: User) {
    return this.examService.submitForApproval(id, user);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin duyệt đề thi' })
  approve(@Param('id') id: string) {
    return this.examService.approveExam(id);
  }

  @Post(':id/start')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Bắt đầu kỳ thi (sinh đề riêng cho sinh viên)' })
  start(@Param('id') id: string, @CurrentUser() user: User) {
    return this.examService.startExam(id, user.id);
  }

  @Post(':id/regrade')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin yêu cầu chấm lại toàn bộ bài thi' })
  regrade(@Param('id') id: string) {
    return this.examRegradeService.regradeExam(id);
  }

  @Post(':id/recalculate-scores')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Tính toán lại điểm cho tất cả thí sinh' })
  recalculate(@Param('id') id: string) {
    return this.examService.recalculateAllScores(id);
  }

  @Post(':id/log-violation')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Ghi lại log vi phạm (chuyển tab, rời khỏi trang)' })
  logViolation(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() metadata: any,
  ) {
    return this.examService.logViolation(id, user.id, metadata);
  }

  @Post(':id/finish')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Kết thúc kỳ thi và tính điểm' })
  finish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.examService.finishExam(id, user.id);
  }

  @Get(':id/result')
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy kết quả thi của sinh viên' })
  getResult(@Param('id') id: string, @CurrentUser() user: User) {
    return this.examService.getExamResult(id, user.id);
  }

  @Get(':id/monitoring')
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy dữ liệu giám sát kỳ thi (Admin/Giảng viên)' })
  async monitoring(@Param('id') id: string) {
    return this.examService.getMonitoringData(id);
  }

  @Get(':id/monitoring/:userId')
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lấy dữ liệu log chi tiết của một sinh viên' })
  async studentLogs(
    @Param('id') id: string,
    @Param('userId') userId: string
  ) {
    return this.examService.getStudentLogs(id, userId);
  }
}
