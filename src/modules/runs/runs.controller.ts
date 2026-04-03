import { Controller, Post, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { RunsService } from './runs.service';
import { CreateRunDto } from './dto/create-run.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('runs')
@UseGuards(JwtAuthGuard)
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  async executeCode(@Body() createRunDto: CreateRunDto, @CurrentUser() user: User) {
    return this.runsService.executeRun(user.id, createRunDto);
  }

  @Get(':id')
  async getRunResult(@Param('id') id: string) {
    return this.runsService.getRun(id);
  }
}
