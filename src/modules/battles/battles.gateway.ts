import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
// import { WsJwtGuard } from '../../common/guards/ws-jwt.guard';

@WebSocketGateway({
  namespace: 'battles',
  cors: {
    origin: '*',
  },
})
export class BattlesGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_battle')
  handleJoinBattle(
    @MessageBody() data: { battleId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`battle_${data.battleId}`);
    console.log(`Client ${client.id} joined battle ${data.battleId}`);
  }

  @SubscribeMessage('leave_battle')
  handleLeaveBattle(
    @MessageBody() data: { battleId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`battle_${data.battleId}`);
  }

  // Helper method to broadcast battle start
  broadcastBattleStarted(battleId: string, data: any) {
    this.server.to(`battle_${battleId}`).emit('battle_started', data);
  }

  // Helper method to broadcast timer update
  broadcastTimerUpdate(battleId: string, remainingSeconds: number) {
    this.server.to(`battle_${battleId}`).emit('battle_timer_update', { remainingSeconds });
  }

  // Helper method to broadcast battle cancellation
  broadcastBattleCancelled(battleId: string, reason: string) {
    this.server.to(`battle_${battleId}`).emit('battle_cancelled', { reason });
  }

  // Helper method to broadcast progress
  broadcastProgress(battleId: string, data: any) {
    this.server.to(`battle_${battleId}`).emit('code_progress', data);
  }

  // Helper method to broadcast battle end
  broadcastBattleEnd(battleId: string, data: any) {
    this.server.to(`battle_${battleId}`).emit('battle_end', data);
  }

  // Helper method to broadcast match found
  broadcastMatchFound(battleId: string, data: any) {
    this.server.emit('match_found', data);
  }
}
