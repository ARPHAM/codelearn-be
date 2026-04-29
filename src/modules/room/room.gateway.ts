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
import {
  WorkspaceService,
  WorkspaceEventType,
} from '../workspace/workspace.service';
import { OnModuleInit } from '@nestjs/common';

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
export class RoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer()
  server: Server;

  // In-memory room state: roomId -> RoomState
  public readonly roomState = new Map<string, RoomState>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly roomService: RoomService,
    private readonly runtimeStore: RoomRuntimeStore,
    private readonly workspaceService: WorkspaceService,
  ) {}

  onModuleInit() {
    // Subscribe to workspace file events to broadcast them to the room
    this.workspaceService.fileEvents.subscribe(async (event) => {
      const roomId = await this.roomService.getRoomIdByWorkspace(
        event.workspaceId,
      );
      if (roomId) {
        let socketEvent: string;
        switch (event.type) {
          case WorkspaceEventType.FILE_CREATED:
            socketEvent = 'file_created';
            break;
          case WorkspaceEventType.FILE_DELETED:
            socketEvent = 'file_deleted';
            break;
          case WorkspaceEventType.FILE_UPDATED:
            socketEvent = event.payload.isRename ? 'file_renamed' : 'file_updated';
            break;
          default:
            return;
        }

        this.server.to(roomId).emit(socketEvent, {
          userId: event.userId,
          workspaceId: event.workspaceId,
          ...event.payload,
        });
      }
    });
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

        state.sessionTimeout = setTimeout(
          async () => {
            // DOUBLE CHECK: Did a host reconnect in the meantime?
            const currentState = this.roomState.get(roomId);
            if (currentState && currentState.hostSockets.size > 0) {
              console.log(`[RoomGateway] Room ${roomId} is active again, canceling deletion`);
              return;
            }

            console.log(`[RoomGateway] Deleting room ${roomId} due to host inactivity`);
            try {
              await this.roomService.deleteRoom(roomId);
              this.server.to(roomId).emit('room_closed', { roomId });
              this.server.in(roomId).disconnectSockets(true);
              this.roomState.delete(roomId);
            } catch (err) {
              console.error(`[RoomGateway] Failed to delete room ${roomId}:`, err.message);
            }
          },
          5 * 60 * 1000,
        );

        this.server.to(roomId).emit('room_closing_in_5_minutes', {
          roomId,
          closingAt,
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

    // Clean up empty room entries - ONLY IF NO TIMEOUT IS RUNNING
    if (state.users.size === 0 && !state.sessionTimeout) {
      this.roomState.delete(roomId);
    }

    client.leave(roomId);
    client.data.joinedRooms?.delete(roomId);

    // Notify lobby about the participant count change
    this.broadcastRoomUpdateToLobby(roomId);
  }

  @SubscribeMessage('join_lobby')
  handleJoinLobby(@ConnectedSocket() client: Socket) {
    client.join('lobby');
    console.log(`[RoomGateway] Client ${client.id} joined lobby room`);
    return { status: 'joined_lobby' };
  }

  @SubscribeMessage('leave_lobby')
  handleLeaveLobby(@ConnectedSocket() client: Socket) {
    client.leave('lobby');
    return { status: 'left_lobby' };
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
      client.emit('error', { message: error.message || 'Failed to join room' });
      return; // Room not found or full
    }

    let state = this.roomState.get(roomId);
    if (!state) {
      state = { users: new Map(), hostSockets: new Set() };
      this.roomState.set(roomId, state);
    }

    client.join(roomId);
    client.data.joinedRooms.add(roomId);

    // Track online status immediately for everyone
    let userSockets = state.users.get(userId);
    const isFirstSocket = !userSockets || userSockets.size === 0;
    if (!userSockets) {
      userSockets = new Set<string>();
      state.users.set(userId, userSockets);
    }
    userSockets.add(client.id);

    // NEW: Handle Approval Workflow
    if (participant.status === 'PENDING') {
      client.emit('participant_pending', { userId, roomId });
      // Notify all host sockets in the room
      this.server.to(roomId).emit('join_request', { 
          userId, 
          user: participant.user || { id: userId } 
      });
      
      // Still notify others and send list even if pending
      if (isFirstSocket) {
        client.to(roomId).emit('user_joined', { userId });
      }
      const onlineUserIds = Array.from(state.users.keys());
      client.emit('room_members_online', { roomId, userIds: onlineUserIds });
      return;
    }

    // CRITICAL: Block non-host users if no host is online (for already JOINED users)
    if (participant.role !== 'HOST') {
      if (state.hostSockets.size === 0) {
        client.emit('error', {
          message:
            'Room is strictly managed by host. Please wait for host to join online.',
          code: 'HOST_OFFLINE',
        });
        return;
      }
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

    // If this is the FIRST socket of this user in room:
    if (isFirstSocket) {
      client.to(roomId).emit('user_joined', { userId });
    }

    // Always send the full online members list back to the joining client
    const onlineUserIds = Array.from(state.users.keys());
    client.emit('room_members_online', { roomId, userIds: onlineUserIds });

    // Notify lobby about the participant count change
    this.broadcastRoomUpdateToLobby(roomId);
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
    @MessageBody()
    payload: { roomId: string; filePath: string; content: string },
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
    const participant = await this.roomService.getParticipant(roomId, userId);
    if (!participant) return;

    // Persist to the SENDER'S own workspace
    try {
      if (participant.workspaceId) {
        await this.workspaceService.updateFileByPath(
          participant.workspaceId,
          userId,
          filePath,
          content,
        );
      }
    } catch (err) {
      console.error(`[RoomGateway] Failed to persist code change: ${err.message}`);
    }

    // Broadcast (only to others in the room)
    client.to(roomId).emit('code_update', {
      userId,
      filePath,
      content,
    });
  }

  @SubscribeMessage('cursor_move')
  async handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const userId = client.data.user?.userId;
    if (!payload?.roomId || !userId) return;

    // Fast boolean check
    const isParticipant = await this.roomService.isParticipant(
      payload.roomId,
      userId,
    );
    if (!isParticipant) return;

    // Broadcast to others in the room
    client.to(payload.roomId).emit('cursor_moved', {
      ...payload,
      userId,
    });
  }

  @SubscribeMessage('selection_move')
  async handleSelectionMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    const userId = client.data.user?.userId;
    if (!payload?.roomId || !userId) return;

    // Fast boolean check
    const isParticipant = await this.roomService.isParticipant(
      payload.roomId,
      userId,
    );
    if (!isParticipant) return;

    // Broadcast to others in the room
    client.to(payload.roomId).emit('selection_moved', {
      ...payload,
      userId,
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
    @MessageBody()
    payload: { roomId: string; targetUserId: string; filePath: string },
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
    @MessageBody()
    payload: {
      roomId: string;
      requesterId: string;
      filePath: string;
      content: string;
    },
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

  @SubscribeMessage('select_problem')
  async handleSelectProblem(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; problemSlug: string },
  ) {
    const userId = client.data.user?.userId;
    if (!payload || !payload.roomId || !payload.problemSlug || !userId) return;

    // Check if user is HOST
    const participant = await this.roomService.getParticipant(
      payload.roomId,
      userId,
    );
    if (!participant || participant.role !== 'HOST') return;

    // Update room in DB
    await this.roomService.updateRoomProblem(payload.roomId, payload.problemSlug);

    // Broadcast to all (including sender to confirm)
    this.server.to(payload.roomId).emit('problem_selected', {
      problemSlug: payload.problemSlug,
    });
  }

  notifyApproved(roomId: string, userId: string) {
    this.server.to(roomId).emit('participant_approved', { userId });
  }

  private async broadcastRoomUpdateToLobby(roomId: string) {
    try {
      const room = await this.roomService.findRoomById(roomId);
      const participants = await this.roomService.getParticipants(roomId);
      
      // Map creator info as we do in service
      const creator = await this.roomService['roomRepo'].manager.getRepository('User').findOne({ 
        where: { id: room.createdBy },
        select: ['id', 'fullName', 'email', 'avatarUrl' as any]
      });

      const lobbySize = this.server.sockets.adapter.rooms.get('lobby')?.size || 0;
      console.log(`[RoomGateway] Broadcasting room ${roomId} update to ${lobbySize} clients in lobby`);

      this.server.to('lobby').emit('room_updated', {
        id: room.id,
        participantsCount: participants.length,
        createdBy: creator,
        status: room.status,
        name: room.name
      });
    } catch (err) {
      console.error(`[RoomGateway] Error broadcasting to lobby:`, err.message);
    }
  }
}
