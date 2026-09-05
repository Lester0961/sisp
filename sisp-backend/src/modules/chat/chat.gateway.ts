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
  ) {}

  handleConnection(client: Socket): void {
    const token = client.handshake.auth?.token;
    const secret = this.config.get<string>('JWT_SECRET');
    if (!token || !secret) {
      client.disconnect(true);
      return;
    }
    try {
      client.data.user = this.jwtService.verify(token, { secret });
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

  private socketUser(client: Socket): { sub: string; role: string } {
    const user = client.data.user;
    if (!user) throw new WsException('Authentication required');
    return user;
  }

  private room(sessionId: string): string {
    return `advisor-session:${sessionId}`;
  }
}
