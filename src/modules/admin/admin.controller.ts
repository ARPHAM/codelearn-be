import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { LanguagesService } from './languages.service';
import { SystemSettingsService } from './system-settings.service';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly languagesService: LanguagesService,
    private readonly systemSettingsService: SystemSettingsService,
    private readonly healthService: HealthService,
  ) {}

  @Get('sandbox/jobs') @ApiOperation({ summary: 'Liet ke container jobs dang chay' })
  listJobs() { return this.adminService.listJobs(); }

  @Delete('sandbox/jobs/:jobId') @ApiOperation({ summary: 'Kill container job' })
  killJob(@Param('jobId') jobId: string) { return this.adminService.killJob(jobId); }

  @Get('settings') @ApiOperation({ summary: 'Lay toan bo cau hinh he thong' })
  getSettings() { return this.systemSettingsService.findAllGrouped(); }

  @Patch('settings') @ApiOperation({ summary: 'Cap nhat nhieu tham so cau hinh' })
  updateSettings(@Body() dto: any, @CurrentUser() user: any) { 
    return this.systemSettingsService.updateSettings(dto, user.id); 
  }

  @Get('health/infrastructure') @ApiOperation({ summary: 'Trang thai Docker va tai nguyen' })
  getInfrastructureHealth() { return this.healthService.getInfrastructureHealth(); }

  @Get('audit-logs') @ApiOperation({ summary: 'Truy van log hanh dong he thong' })
  getAuditLogs(@Query() query: any) { return this.adminService.getAuditLogs(query); }

  @Get('audit-logs/:id') @ApiOperation({ summary: 'Chi tiet 1 log entry' })
  getAuditLog(@Param('id') id: string) { return this.adminService.getAuditLog(+id); }

  @Get('languages') @ApiOperation({ summary: 'Danh sach ngon ngu lap trinh ho tro (Admin)' })
  listLanguages() { return this.languagesService.findAll(); }

  @Post('languages') @ApiOperation({ summary: 'Them ngon ngu lap trinh moi' })
  addLanguage(@Body() dto: any) { return this.languagesService.create(dto); }

  @Patch('languages/:id') @ApiOperation({ summary: 'Cap nhat cau hinh ngon ngu' })
  updateLanguage(@Param('id') id: string, @Body() dto: any) { return this.languagesService.update(+id, dto); }

  @Delete('languages/:id') @ApiOperation({ summary: 'Xoa ngon ngu lap trinh' })
  removeLanguage(@Param('id') id: string) { return this.languagesService.remove(+id); }

  @Get('users/lecturers')
  @ApiOperation({ summary: 'Liet ke tat ca giang vien' })
  listLecturers(@Query() query: any) { 
    return this.adminService.listLecturers(query); 
  }

  @Get('users/students') 
  @ApiOperation({ summary: 'Liet ke tat ca sinh vien' })
  listStudents(@Query() query: any) { 
    return this.adminService.listStudents(query); 
  }
}
