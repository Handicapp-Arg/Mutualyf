import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SessionsService } from './sessions.service';

/**
 * Gateway dedicado a presencia de usuarios finales del chat.
 *
 * Flujo:
 *   1. Cliente se conecta con `auth.sessionId` (o query string `sessionId`).
 *   2. Cada 20s emite `presence.ping` → actualiza el Map en memoria.
 *   3. Al desconectarse → marca offline automáticamente.
 *
 * No requiere JWT: la identidad del cliente es su sessionId.
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()),
    credentials: true,
  },
})
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(PresenceGateway.name);

  constructor(private readonly sessions: SessionsService) {}

  private sessionIdOf(client: Socket): string | null {
    return (
      (client.handshake?.auth?.sessionId as string) ||
      (client.handshake?.query?.sessionId as string) ||
      null
    );
  }

  async handleConnection(client: Socket) {
    const sessionId = this.sessionIdOf(client);
    if (!sessionId) return;
    client.data.sessionId = sessionId;
    await this.sessions.ensureSessionExists(sessionId);
    this.sessions.markPresence(sessionId);
  }

  handleDisconnect(client: Socket) {
    const sessionId = client.data?.sessionId as string | undefined;
    if (sessionId) this.sessions.markOffline(sessionId);
  }

  @SubscribeMessage('presence.ping')
  handlePing(client: Socket) {
    const sessionId = client.data?.sessionId as string | undefined;
    if (sessionId) this.sessions.markPresence(sessionId);
    return { ok: true };
  }
}
