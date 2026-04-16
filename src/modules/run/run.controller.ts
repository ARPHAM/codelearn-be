import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { RunService } from './run.service';
import { CreateRunDto } from './dto/create-run.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('run')
@UseGuards(JwtAuthGuard)
export class RunController {
  constructor(private readonly runService: RunService) {}

  @Post()
  async executeCode(
    @Body() createRunDto: CreateRunDto,
    @CurrentUser() user: User,
  ) {
    return this.runService.executeRun(user.id, createRunDto);
  }

  @Get(':id')
  async getRunResult(@Param('id') id: string) {
    return this.runService.getRun(id);
  }
}
