import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('sandbox/jobs') @ApiOperation({ summary: 'Liet ke container jobs dang chay' })
  listJobs() { return this.adminService.listJobs(); }

  @Delete('sandbox/jobs/:jobId') @ApiOperation({ summary: 'Kill container job' })
  killJob(@Param('jobId') jobId: string) { return this.adminService.killJob(jobId); }

  @Get('sandbox/config') @ApiOperation({ summary: 'Lay cau hinh tai nguyen sandbox' })
  getSandboxConfig() { return this.adminService.getSandboxConfig(); }

  @Put('sandbox/config') @ApiOperation({ summary: 'Cap nhat gioi han tai nguyen sandbox' })
  updateSandboxConfig(@Body() dto: any) { return this.adminService.updateSandboxConfig(dto); }

  @Get('audit-logs') @ApiOperation({ summary: 'Truy van log hanh dong he thong' })
  getAuditLogs(@Query() query: any) { return this.adminService.getAuditLogs(query); }

  @Get('audit-logs/:id') @ApiOperation({ summary: 'Chi tiet 1 log entry' })
  getAuditLog(@Param('id') id: string) { return this.adminService.getAuditLog(+id); }

  @Get('languages') @ApiOperation({ summary: 'Danh sach ngon ngu lap trinh ho tro' })
  listLanguages() { return this.adminService.listLanguages(); }

  @Post('languages') @ApiOperation({ summary: 'Them ngon ngu lap trinh moi' })
  addLanguage(@Body() dto: any) { return this.adminService.addLanguage(dto); }

  @Patch('languages/:id') @ApiOperation({ summary: 'Bat/tat hoac cap nhat cau hinh ngon ngu' })
  updateLanguage(@Param('id') id: string, @Body() dto: any) { return this.adminService.updateLanguage(+id, dto); }

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
