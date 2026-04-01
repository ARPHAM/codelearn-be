import { Controller, Post, Body, Param, Get, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoomService } from './room.service';
import { CreateRoomDto, JoinRoomDto } from './dtos/room.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('Rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new meeting room' })
  async createRoom(@CurrentUser() user: User, @Body() dto: CreateRoomDto) {
    const room = await this.roomService.createRoom(user.id, dto);
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      createdBy: room.createdBy,
      createdAt: room.createdAt,
    };
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a meeting room with a shared workspace' })
  joinRoom(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: JoinRoomDto,
  ) {
    return this.roomService.joinRoom(id, user.id, dto);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a meeting room' })
  leaveRoom(@Param('id') id: string, @CurrentUser() user: User) {
    return this.roomService.leaveRoom(id, user.id);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Get list of participants in a room' })
  getParticipants(@Param('id') id: string) {
    return this.roomService.getParticipants(id);
  }

  @Get(':id/session')
  @ApiOperation({ summary: 'Get current session state of a room' })
  getSession(@Param('id') id: string, @CurrentUser() user: User) {
    return this.roomService.getRoomSession(id, user.id);
  }
}
