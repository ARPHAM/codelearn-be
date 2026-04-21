import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Users')
@Controller('user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('lecturers')
  @Roles(Role.ADMIN, Role.LECTURER)
  @ApiOperation({ summary: 'Lấy danh sách giảng viên (dành cho bộ lọc)' })
  findAllLecturers() {
    return this.userService.findAllLecturers();
  }
}
