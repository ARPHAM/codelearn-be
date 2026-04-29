import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy bảng xếp hạng người dùng' })
  getLeaderboard(
    @Query('period') period: string = 'ALL_TIME',
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
    @Query('type') type: string = 'RATING',
    @CurrentUser() user: User,
  ) {
    return this.leaderboardService.getLeaderboard(period, type, limit, user);
  }
}
