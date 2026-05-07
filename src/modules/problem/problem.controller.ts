import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProblemService } from './problem.service';
import { CreateProblemDto } from './dto/create-problem.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';
import { FilterProblemDto } from './dto/filter-problem.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../user/entities/user.entity';

@ApiTags('Problem')
@Controller('problem')
export class ProblemController {
  constructor(private readonly problemService: ProblemService) {}

  @Get('authors')
  @ApiOperation({ summary: 'Get list of unique authors who created problems' })
  findAllAuthors() {
    return this.problemService.findAllAuthors();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Lecturer creates a new problem (draft/pending)' })
  create(@Body() dto: CreateProblemDto, @CurrentUser() user: User) {
    return this.problemService.create(dto, user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({
    summary: 'Lecturer updates a problem (creates a pending version)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProblemDto,
    @CurrentUser() user: User,
  ) {
    return this.problemService.update(id, dto, user);
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin sees all problems with filters' })
  findAllForAdmin(@Query() query: FilterProblemDto) {
    return this.problemService.findAllForAdmin(query);
  }

  @Get('lecturer/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({
    summary:
      'Lecturer sees standard info of ALL problems but with pagination and filters',
  })
  findAllForLecturer(
    @Query() query: FilterProblemDto,
    @CurrentUser() user: User,
  ) {
    return this.problemService.findAllForLecturer(query, user);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Student sees all public active problems' })
  findAllForStudent(
    @Query() query: FilterProblemDto,
    @CurrentUser() user: User,
  ) {
    return this.problemService.findAllForStudent(query, user);
  }

  @Get(':id/edit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({ summary: 'Get full problem details for editing' })
  findOneForEdit(@Param('id') id: string, @CurrentUser() user: User) {
    return this.problemService.findOneForEdit(id, user);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Get published problem details for students (filtered)',
  })
  findOneForStudent(
    @Param('slug') slug: string,
    @Query('languageId') languageId: string,
    @Query('examId') examId: string,
    @CurrentUser() user: User,
  ) {
    return this.problemService.findOneForStudent(slug, user, languageId ? +languageId : undefined, examId);
  }

  @Patch('admin/versions/:versionId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Admin approves a problem version to make it official',
  })
  approveVersion(@Param('versionId') versionId: string) {
    return this.problemService.approveVersion(versionId);
  }

  @Patch('admin/versions/:versionId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Admin rejects a problem version',
  })
  rejectVersion(@Param('versionId') versionId: string, @Body('reason') reason: string) {
    return this.problemService.rejectVersion(versionId, reason);
  }

  @Post('versions/:versionId/verify-solution')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  @ApiOperation({
    summary: 'Verify solution for a problem version',
  })
  verifySolution(
    @Param('versionId') versionId: string,
    @Body('languageId') languageId: number,
  ) {
    return this.problemService.verifySolution(versionId, languageId);
  }
}
