import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
export class ExecutionGateway {
  @WebSocketServer()
  server: Server;

  sendResult(submissionId: number, result: any) {
    this.server.emit(`submission-${submissionId}`, result);
  }
}
