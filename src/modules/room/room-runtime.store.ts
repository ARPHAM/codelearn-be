import { Injectable } from '@nestjs/common';

interface RoomRuntimeState {
  closingAt?: number;
}

@Injectable()
export class RoomRuntimeStore {
  private store = new Map<string, RoomRuntimeState>();

  setClosing(roomId: string, closingAt: number) {
    const state = this.store.get(roomId) || {};
    state.closingAt = closingAt;
    this.store.set(roomId, state);
  }

  clearClosing(roomId: string) {
    const state = this.store.get(roomId);
    if (state && state.closingAt) {
      delete state.closingAt;
      if (Object.keys(state).length === 0) {
        this.store.delete(roomId);
      }
    }
  }

  getClosingAt(roomId: string): number | undefined {
    return this.store.get(roomId)?.closingAt;
  }
}
