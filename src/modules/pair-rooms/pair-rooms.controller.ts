import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PairRoomsService } from './pair-rooms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class CreateRoomDto {
  @ApiProperty() @IsNumber() @Type(() => Number) exerciseId: number;
}
class InviteDto {
  @ApiProperty({ type: [Number] }) @IsArray() inviteeIds: number[];
}

@ApiTags('Pair Programming')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller('pair-rooms')
export class PairRoomsController {
  constructor(private readonly pairRoomsService: PairRoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Tao phong pair programming' })
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: User) {
    return this.pairRoomsService.createRoom(dto.exerciseId, user.id);
  }

  @Post(':roomId/invite')
  @ApiOperation({ summary: 'Moi sinh vien khac vao phong' })
  invite(@Param('roomId') roomId: string, @Body() dto: InviteDto, @CurrentUser() user: User) {
    return this.pairRoomsService.inviteToRoom(roomId, dto.inviteeIds, user.id);
  }
}
