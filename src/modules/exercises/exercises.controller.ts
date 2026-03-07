import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto, UpdateExerciseDto, ListExercisesDto } from './dto/exercises.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Exercises & Submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Lay danh sach bai tap theo khoa hoc' })
  findAll(@Query() query: ListExercisesDto) {
    return this.exercisesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiet bai tap' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exercisesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Giang vien tao bai tap moi' })
  create(@Body() dto: CreateExerciseDto, @CurrentUser() user: User) {
    return this.exercisesService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Cap nhat bai tap' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExerciseDto, @CurrentUser() user: User) {
    return this.exercisesService.update(id, dto, user);
  }
}
