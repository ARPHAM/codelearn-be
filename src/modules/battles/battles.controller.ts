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
  @ApiProperty() @IsString() @Type(() => String) opponentId: string;
  @ApiProperty({ enum: [15, 30, 45] }) @IsNumber() duration: number;
  @ApiProperty() @IsString() topic: string;
}

@ApiTags('Code Battle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('battles')
export class BattlesController {
  constructor(private readonly battlesService: BattlesService) {}

  @Get('active')
  @ApiOperation({ summary: 'Lấy danh sách các trận đấu đang chờ đối thủ' })
  getActive() {
    return this.battlesService.getActiveBattles();
  }

  @Post('challenge')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Gửi lời thách đấu tới người chơi khác' })

  challenge(@Body() dto: ChallengeDto, @CurrentUser() user: User) {
    return this.battlesService.challenge(dto, user);
  }

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT, Role.ADMIN)
  @ApiOperation({ summary: 'Chấp nhận lời thách đấu' })

  accept(@Param('id') id: string, @CurrentUser() user: User) {
    return this.battlesService.accept(id, user);
  }

  @Get(':id/result')
  @ApiOperation({ summary: 'Kết quả trận đấu' })
  getResult(@Param('id') id: string) {
    return this.battlesService.getResult(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Hủy trận đấu' })
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.battlesService.cancel(id, user);
  }
}
