import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export enum UserStatus {
  ONLINE = 'ONLINE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

@Injectable()
export class PresenceService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async updateStatus(userId: string, status: UserStatus) {
    // Keep status for 15 seconds (heartbeat is every 10s)
    await this.cacheManager.set(`user_presence_${userId}`, status, 15000);
  }

  async getStatus(userId: string): Promise<UserStatus> {
    const status = await this.cacheManager.get<UserStatus>(`user_presence_${userId}`);
    return status || UserStatus.OFFLINE;
  }

  async getAllStatuses(userIds: string[]): Promise<Record<string, UserStatus>> {
    const results: Record<string, UserStatus> = {};
    for (const id of userIds) {
      results[id] = await this.getStatus(id);
    }
    return results;
  }
}
