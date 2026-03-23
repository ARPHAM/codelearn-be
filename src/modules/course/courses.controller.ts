import {
  Controller, Get, Post, Param, Body, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { ListCoursesDto, EnrollDto } from './dto/courses.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../user/entities/user.entity';

@ApiTags('Courses & Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Lay danh sach khoa hoc theo hoc ky' })
  findAll(@Query() query: ListCoursesDto) {
    return this.coursesService.findAll(query);
  }

  @Get(':id/students')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay danh sach sinh vien trong khoa hoc' })
  getStudents(@Param('id') id: string, @CurrentUser() user: User) {
    return this.coursesService.getStudents(id, user);
  }

  @Post(':id/enroll')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Dang ky khoa hoc cho sinh vien' })
  enroll(@Param('id') id: string, @Body() _dto: EnrollDto, @CurrentUser() user: User) {
    return this.coursesService.enrollStudent(id, user);
  }
}
