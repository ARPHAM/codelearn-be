import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CourseService } from './course.service';
import {
  ListCoursesDto,
  EnrollDto,
  CreateClassDto,
  AssignClassUsersDto,
} from './dto/course.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../user/entities/user.entity';

@ApiTags('Course')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay danh sach khoa hoc theo hoc ky' })
  findAll(@Query() query: ListCoursesDto) {
    return this.courseService.findAll(query);
  }

  @Get('me')
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay danh sach khoa hoc cua toi (Giang vien/Sinh vien)' })
  getMyCourses(@CurrentUser() user: User) {
    return this.courseService.getMyCourses(user);
  }

  @Get('semesters')
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay danh sach cac hoc ky' })
  getSemesters() {
    return this.courseService.findAllSemesters();
  }

  @Get(':id')
  @Roles(Role.STUDENT, Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay chi tiet khoa hoc' })
  findOne(@Param('id') id: string) {
    return this.courseService.findOne(id);
  }

  @Get(':id/users')
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay danh sách người dùng trong khóa học (Giảng viên/Sinh viên)' })
  getCourseUsers(
    @Param('id') id: string, 
    @CurrentUser() user: User,
    @Query('role') role?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.courseService.getCourseUsers(id, user, { role, page, limit });
  }

  @Post(':id/enroll')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Dang ky khoa hoc cho sinh vien' })
  enroll(
    @Param('id') id: string,
    @Body() _dto: EnrollDto,
    @CurrentUser() user: User,
  ) {
    return this.courseService.enrollStudent(id, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin tạo lớp học mới' })
  create(@Body() dto: CreateClassDto) {
    return this.courseService.create(dto);
  }

  @Post(':id/users')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin gán giảng viên/sinh viên vào lớp' })
  assignUsers(@Param('id') id: string, @Body() dto: AssignClassUsersDto) {
    return this.courseService.assignUsers(id, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin cập nhật thông tin lớp học' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateClassDto>) {
    return this.courseService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin xóa lớp học' })
  delete(@Param('id') id: string) {
    return this.courseService.delete(id);
  }

  @Delete(':id/users/:userId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin gỡ người dùng khỏi lớp học' })
  removeUser(@Param('id') id: string, @Param('userId') userId: string) {
    return this.courseService.removeUser(id, userId);
  }
}
