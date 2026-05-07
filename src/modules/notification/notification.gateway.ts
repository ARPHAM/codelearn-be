import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { PresenceService, UserStatus } from '../user/presence.service';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly presenceService: PresenceService,
  ) {}

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status?: UserStatus },
  ) {
    const userId = client.data.userId;
    if (userId) {
      const status = data.status || UserStatus.ONLINE;
      await this.presenceService.updateStatus(userId, status);
    }
  }

  @SubscribeMessage('get_statuses')
  async handleGetStatuses(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userIds: string[] },
  ) {
    const statuses = await this.presenceService.getAllStatuses(data.userIds);
    client.emit('statuses_updated', statuses);
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        throw new WsException('Unauthorized');
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      if (!payload || !payload.sub) {
        throw new WsException('Unauthorized');
      }

      const userId = payload.sub;
      client.data.userId = userId;
      
      // Join a private room for this user
      await client.join(`user_${userId}`);
      console.log(`[NotificationGateway] User ${userId} connected and joined room user_${userId}`);
    } catch (error) {
      console.log(`[NotificationGateway] Connection rejected: ${error.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      console.log(`[NotificationGateway] User ${userId} disconnected`);
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // Try to get token from handshake auth or query or cookies
    const auth = client.handshake.auth?.token;
    if (auth) return auth;

    const queryToken = client.handshake.query?.token as string;
    if (queryToken) return queryToken;

    const rawCookie = client.handshake.headers?.cookie || '';
    if (!rawCookie) return null;

    const cookies = this.parseCookie(rawCookie);
    return cookies.accessToken || null;
  }

  private parseCookie(cookieString: string): Record<string, string> {
    return cookieString
      .split(';')
      .map((v) => v.split('='))
      .reduce(
        (acc, v) => {
          const key = decodeURIComponent(v[0].trim());
          const val = decodeURIComponent(v[1]?.trim() || '');
          acc[key] = val;
          return acc;
        },
        {} as Record<string, string>,
      );
  }

  sendToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification_received', notification);
  }
}
