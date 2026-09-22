import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService } from '../auth/session.service';
import { ChatSessionService } from './chat-session.service';

@WebSocketGateway({
  namespace: '/advisor-chat',
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessionService: ChatSessionService,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;
    const secret = this.config.get<string>('JWT_SECRET');
    if (!token || !secret) {
      client.disconnect(true);
      return;
    }
    try {
      const payload: any = this.jwtService.verify(token, { secret });
      if (payload.purpose !== 'access' || !payload.sid) {
        throw new Error('invalid token purpose');
      }
      await this.sessions.assertActive(payload.sid, payload.sub);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });
      if (!user || !user.isActive || user.mustChangePassword) {
        throw new Error('account not permitted for realtime sessions');
      }
      client.data.user = { sub: user.id, role: user.role?.name ?? payload.role, sid: payload.sid };
    } catch {
      this.logger.warn('Rejected an unauthenticated academic advisor socket connection');
      client.disconnect(true);
    }
  }

  @SubscribeMessage('session:join')
  async joinSession(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string }) {
    const user = this.socketUser(client);
    await this.sessionService.getAuthorizedSession(body.sessionId, user.sub, user.role);
    await client.join(this.room(body.sessionId));
    return { event: 'session:joined', data: { sessionId: body.sessionId } };
  }

  @SubscribeMessage('message:send')
  async sendMessage(@ConnectedSocket() client: Socket, @MessageBody() body: { sessionId: string; content: string }) {
    const user = this.socketUser(client);
    const content = body.content?.trim();
    if (!content || content.length > 2000) {
      throw new WsException('Message must contain between 1 and 2000 characters');
    }
    const message = await this.sessionService.sendMessage(body.sessionId, user.sub, content, user.role);
    this.emitMessage(body.sessionId, message);
    return { event: 'message:accepted', data: { id: message.id } };
  }

  emitMessage(sessionId: string, message: unknown): void {
    this.server?.to(this.room(sessionId)).emit('message:new', message);
  }

  emitSessionUpdated(sessionId: string, session: unknown): void {
    this.server?.to(this.room(sessionId)).emit('session:updated', session);
  }

  async revokeUserFromSession(sessionId: string, userId: string): Promise<void> {
    if (!this.server) return;
    const sockets = await this.server.in(this.room(sessionId)).fetchSockets();
    await Promise.all(
      sockets
        .filter((socket) => socket.data.user?.sub === userId)
        .map((socket) => socket.leave(this.room(sessionId))),
    );
  }

  private socketUser(client: Socket): { sub: string; role: string } {
    const user = client.data.user;
    if (!user) throw new WsException('Authentication required');
    return user;
  }

  private room(sessionId: string): string {
    return `advisor-session:${sessionId}`;
  }
}
