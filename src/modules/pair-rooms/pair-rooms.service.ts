import { Injectable } from '@nestjs/common';

@Injectable()
export class PairRoomsService {
  async createRoom(exerciseId: number, ownerId: string) {
    const roomId = Math.random().toString(36).slice(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    return {
      roomId,
      joinLink: 'https://codelearn.vn/pair/' + roomId,
      expiresAt,
    };
  }

  async inviteToRoom(roomId: string, inviteeIds: string[], ownerId: string) {
    return { invited: inviteeIds.length, message: 'Loi moi da gui' };
  }
}
