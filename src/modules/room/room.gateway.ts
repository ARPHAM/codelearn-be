import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RoomService } from './room.service';
import { RoomRuntimeStore } from './room-runtime.store';

interface RoomState {
  users: Map<string, Set<string>>; // userId -> Set of socketIds
  hostSockets: Set<string>; // Set of HOST socket Ids
  sessionTimeout?: NodeJS.Timeout; // Ephemeral grace period timeout
}

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // In-memory room state: roomId -> RoomState
  private roomState = new Map<string, RoomState>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly roomService: RoomService,
    private readonly runtimeStore: RoomRuntimeStore,
  ) {}

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

      client.data.user = { userId: payload.sub };
      client.data.joinedRooms = new Set<string>();
    } catch (error) {
      // Disconnect socket immediately if invalid
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.user?.userId;
    if (!userId) return;

    const joinedRooms: Set<string> = client.data.joinedRooms;
    if (joinedRooms) {
      for (const roomId of joinedRooms) {
        this.removeSocketFromRoom(roomId, client.id, userId, client);
      }
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    const rawCookie = client.handshake.headers?.cookie || '';
    if (!rawCookie) {
      return null;
    }

    const cookies = this.parseCookie(rawCookie);
    return cookies.accessToken || null;
  }

  private parseCookie(cookieString: string): Record<string, string> {
    return cookieString
      .split(';')
      .map((v) => v.split('='))
      .reduce((acc, v) => {
        const key = decodeURIComponent(v[0].trim());
        const val = decodeURIComponent(v[1]?.trim() || '');
        acc[key] = val;
        return acc;
      }, {} as Record<string, string>);
  }

  private async removeSocketFromRoom(
    roomId: string,
    socketId: string,
    userId: string,
    client: Socket,
  ) {
    const state = this.roomState.get(roomId);
    if (!state) return;

    if (state.hostSockets.has(socketId)) {
      state.hostSockets.delete(socketId);

      if (state.hostSockets.size === 0) {
        const closingAt = Date.now() + 5 * 60 * 1000;
        this.runtimeStore.setClosing(roomId, closingAt);
        
        state.sessionTimeout = setTimeout(async () => {
          await this.roomService.endSession(roomId);
          this.server.to(roomId).emit('room_closed', { roomId });
          this.server.in(roomId).disconnectSockets(true);
        }, 5 * 60 * 1000);

        this.server.to(roomId).emit('room_closing_in_5_minutes', { 
          roomId,
          closingAt
        });
      }
    }

    const userSockets = state.users.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);

      // If user has NO remaining sockets in room:
      if (userSockets.size === 0) {
        state.users.delete(userId);
        
        // SYNC DB BEFORE EMIT: Actually REMOVE participant from DB to free the seat
        try {
          await this.roomService.leaveRoom(roomId, userId);
        } catch (e) {
          // Ignore if already removed
        }
        
        client.to(roomId).emit('user_left', { userId });
      }
    }

    // Clean up empty room entries
    if (state.users.size === 0) {
      this.roomState.delete(roomId);
    }

    client.leave(roomId);
    client.data.joinedRooms?.delete(roomId);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const userId = client.data.user?.userId;
    if (!payload || !payload.roomId || !userId) return;
    
    const { roomId } = payload;
    let participant;

    try {
      // Auto-add user as participant if not already (creates workspace for guests)
      participant = await this.roomService.ensureParticipant(roomId, userId);
    } catch (error) {
      return; // Room not found or full
    }

    client.join(roomId);
    client.data.joinedRooms.add(roomId);

    let state = this.roomState.get(roomId);
    if (!state) {
      state = { users: new Map(), hostSockets: new Set() };
      this.roomState.set(roomId, state);
    }

    await this.roomService.startSession(roomId);

    if (participant.role === 'HOST') {
      state.hostSockets.add(client.id);
      
      this.runtimeStore.clearClosing(roomId);

      if (state.sessionTimeout) {
        clearTimeout(state.sessionTimeout);
        state.sessionTimeout = undefined;
        
        client.to(roomId).emit('room_active', { roomId });
        client.emit('room_active', { roomId });
      }
    }

    let userSockets = state.users.get(userId);
    const isFirstSocket = !userSockets || userSockets.size === 0;

    if (!userSockets) {
      userSockets = new Set<string>();
      state.users.set(userId, userSockets);
    }
    userSockets.add(client.id);

    // If this is the FIRST socket of this user in room:
    // emit "user_joined" to others (exclude sender)
    if (isFirstSocket) {
      client.to(roomId).emit('user_joined', { userId });
    }

    // Always send the full online members list back to the joining client
    const onlineUserIds = Array.from(state.users.keys());
    client.emit('room_members_online', { roomId, userIds: onlineUserIds });
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const userId = client.data.user?.userId;
    if (!payload || !payload.roomId || !userId) return;
    const { roomId } = payload;

    await this.removeSocketFromRoom(roomId, client.id, userId, client);
  }

  @SubscribeMessage('code_change')
  async handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; filePath: string; content: string },
  ) {
    const userId = client.data.user?.userId;
    if (!payload || !payload.roomId || !payload.filePath || !userId) return;
    
    const { roomId, filePath, content } = payload;

    // Validate filePath:
    // - must NOT contain ".."
    // - must NOT start with "/"
    if (filePath.includes('..') || filePath.startsWith('/')) {
      return; // Invalid path
    }

    // Fast boolean check if user is participant of room
    const isParticipant = await this.roomService.isParticipant(roomId, userId);
    if (!isParticipant) return;

    // Broadcast (only to others in the room)
    client.to(roomId).emit('code_update', {
      userId,
      filePath,
      content,
    });
  }

  @SubscribeMessage('file_switch')
  async handleFileSwitch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; filePath: string },
  ) {
    const userId = client.data.user?.userId;
    if (!payload || !payload.roomId || !userId) return;
    
    const { roomId, filePath } = payload;

    // Fast boolean check
    const isParticipant = await this.roomService.isParticipant(roomId, userId);
    if (!isParticipant) return;

    client.to(roomId).emit('file_switched', {
      userId,
      filePath,
    });
  }

  @SubscribeMessage('request_user_code')
  async handleRequestUserCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; targetUserId: string; filePath: string },
  ) {
    const userId = client.data.user?.userId;
    if (!payload?.roomId || !payload?.targetUserId || !userId) return;

    const state = this.roomState.get(payload.roomId);
    if (!state) return;

    const targetSocketIds = state.users.get(payload.targetUserId);
    if (!targetSocketIds) return;

    // Relay the request to all sockets of the target user
    for (const socketId of targetSocketIds) {
      this.server.to(socketId).emit('request_user_code', {
        requesterId: userId,
        roomId: payload.roomId,
        filePath: payload.filePath,
      });
    }
  }

  @SubscribeMessage('respond_user_code')
  async handleRespondUserCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; requesterId: string; filePath: string; content: string },
  ) {
    const userId = client.data.user?.userId;
    if (!payload?.roomId || !payload?.requesterId || !userId) return;

    const state = this.roomState.get(payload.roomId);
    if (!state) return;

    const requesterSocketIds = state.users.get(payload.requesterId);
    if (!requesterSocketIds) return;

    // Relay the snapshot back to all sockets of the requester
    for (const socketId of requesterSocketIds) {
      this.server.to(socketId).emit('user_code_snapshot', {
        userId,
        roomId: payload.roomId,
        filePath: payload.filePath,
        content: payload.content,
      });
    }
  }
}
