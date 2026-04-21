import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CourseService } from './course.service';
import { ListCoursesDto, EnrollDto } from './dto/course.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../user/entities/user.entity';

@ApiTags('Course')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  @ApiOperation({ summary: 'Lay danh sach khoa hoc theo hoc ky' })
  findAll(@Query() query: ListCoursesDto) {
    return this.courseService.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Lay danh sach khoa hoc cua toi (Giang vien/Sinh vien)' })
  getMyCourses(@CurrentUser() user: User) {
    return this.courseService.getMyCourses(user);
  }

  @Get(':id/students')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay danh sach sinh vien trong khoa hoc' })
  getStudents(@Param('id') id: string, @CurrentUser() user: User) {
    return this.courseService.getStudents(id, user);
  }

  @Post(':id/enroll')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Dang ky khoa hoc cho sinh vien' })
  enroll(
    @Param('id') id: string,
    @Body() _dto: EnrollDto,
    @CurrentUser() user: User,
  ) {
    return this.courseService.enrollStudent(id, user);
  }
}
