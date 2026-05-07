import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    metadata?: any;
  }) {
    const notification = this.notificationRepo.create(data);
    const saved = await this.notificationRepo.save(notification);
    
    // Emit real-time notification
    this.notificationGateway.sendToUser(data.userId, saved);
    
    return saved;
  }

  async findAllForUser(userId: string, page = 1, limit = 10) {
    const [items, total] = await this.notificationRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { userId, isRead: false },
    });

    return {
      items,
      total,
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  async markAllAsRead(userId: string) {
    return this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
  }

  async delete(id: string, userId: string) {
    return this.notificationRepo.delete({ id, userId });
  }
}
