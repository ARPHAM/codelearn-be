import {
  Controller, Get, Post, Param, Body, Query, UseGuards, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BattlesService } from './battles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../user/entities/user.entity';
import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class ChallengeDto {
  @ApiProperty() @IsNumber() @Type(() => Number) opponentId: number;
  @ApiProperty({ enum: [15, 30, 45] }) @IsNumber() duration: number;
  @ApiProperty() @IsString() topic: string;
}

@ApiTags('Code Battle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Post('battles/challenge')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Gui loi thach dau' })
  challenge(@Body() dto: ChallengeDto, @CurrentUser() user: User) {
    return this.battlesService.challenge(dto, user);
  }

  @Post('battles/:id/accept')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Chap nhan loi thach dau' })
  accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.battlesService.accept(id, user);
  }

  @Get('battles/:id/result')
  @ApiOperation({ summary: 'Ket qua tran dau' })
  getResult(@Param('id', ParseIntPipe) id: number) {
    return this.battlesService.getResult(id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Bang xep hang' })
  leaderboard(@Query() query: any) {
    return this.battlesService.getLeaderboard(query);
  }
}
