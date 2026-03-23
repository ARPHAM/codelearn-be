import { Controller, Post, Body, Req, UseGuards, Get, Param } from '@nestjs/common';
import { RunsService } from './runs.service';
import { CreateRunDto } from './dto/create-run.dto';
// Note: Assuming standard JWT guard exists for authenticated requests
// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('runs')
// @UseGuards(JwtAuthGuard)
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  async executeCode(@Body() createRunDto: CreateRunDto, @Req() req: any) {
    // Assuming req.user exists from JwtAuthGuard
    const userId = req.user?.id || 1; // Fallback for testing
    return this.runsService.executeRun(userId, createRunDto);
  }

  @Get(':id')
  async getRunResult(@Param('id') id: string) {
    return this.runsService.getRun(id);
  }
}
