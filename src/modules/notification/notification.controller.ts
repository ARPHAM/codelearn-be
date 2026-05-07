import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của người dùng hiện tại' })
  findAll(
    @CurrentUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.notificationService.findAllForUser(user.id, +page, +limit);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  markAllRead(@CurrentUser() user: User) {
    return this.notificationService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu một thông báo là đã đọc' })
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationService.markAsRead(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một thông báo' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.notificationService.delete(id, user.id);
  }
}
