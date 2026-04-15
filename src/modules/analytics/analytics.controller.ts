import {
  Controller, Get, Post, Param, Body, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { BroadcastDto } from './dto/analytics.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Analytics & Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('course/:courseId')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Dashboard tổng quan khoá học' })
  getCourseAnalytics(@Param('courseId') courseId: string) {
    return this.analyticsService.getCourseAnalytics(courseId);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Thống kê cá nhân sinh viên' })
  getStudentAnalytics(@Param('studentId') studentId: string) {
    return this.analyticsService.getStudentAnalytics(studentId);
  }

  @Get('lecturer/dashboard')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Dashboard tổng quan giảng viên' })
  getLecturerDashboard() {
    return this.analyticsService.getLecturerDashboard();
  }
}

@ApiTags('Analytics & Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.LECTURER, Role.ADMIN)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('broadcast')
  @ApiOperation({ summary: 'Giảng viên gửi thông báo đến sinh viên' })
  broadcast(@Body() dto: BroadcastDto) {
    return this.analyticsService.broadcastNotification(dto);
  }
}
