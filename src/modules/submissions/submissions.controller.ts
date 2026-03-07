import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, UpdateScoreDto, ListSubmissionsDto } from './dto/submissions.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Exercises & Submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('submissions')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Nop code, he thong tu chay trong Docker sandbox' })
  submit(@Body() dto: CreateSubmissionDto, @CurrentUser() user: User) {
    return this.submissionsService.submit(dto, user);
  }

  @Get('submissions/:id/result')
  @ApiOperation({ summary: 'Lay ket qua cham bai' })
  getResult(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.submissionsService.getResult(id, user);
  }

  @Get('exercises/:id/submissions')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lay tat ca submissions cua mot bai (Giang vien)' })
  getByExercise(@Param('id', ParseIntPipe) id: number, @Query() query: ListSubmissionsDto) {
    return this.submissionsService.getByExercise(id, query);
  }

  @Patch('submissions/:id/score')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Giang vien sua diem thu cong' })
  updateScore(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateScoreDto, @CurrentUser() user: User) {
    return this.submissionsService.updateScore(id, dto, user);
  }
}
