import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/**
 * Gateway de eventos en tiempo real para el panel de admin.
 *
 * Eventos emitidos:
 *  - `conversation.upserted` → payload: conversación completa (con messages)
 *  - `session.live`          → payload: snapshot del array de sesiones en vivo
 *
 * El cliente (admin) se conecta y queda escuchando ambos eventos.
 * No usamos rooms/namespaces porque por ahora solo hay un consumidor (admin).
 */
@Injectable()
@WebSocketGateway({
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()),
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token = client.handshake?.auth?.token;
    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        client.data = { user: payload };
        this.logger.debug(`Admin conectado: ${client.id} (${payload.email})`);
      } catch {
        this.logger.debug(`Cliente conectado con token inválido: ${client.id}`);
      }
    } else {
      this.logger.debug(`Cliente conectado (anónimo): ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Emitir actualización de conversación a todos los admins conectados.
   */
  emitConversationUpserted(conversation: unknown): void {
    this.server?.emit('conversation.upserted', conversation);
  }

  /**
   * Emitir snapshot completo de sesiones en vivo.
   */
  emitLiveSessions(sessions: unknown[]): void {
    this.server?.emit('session.live', sessions);
  }

  /**
   * Emitir mensaje de admin a una sesión específica.
   */
  emitAdminMessage(sessionId: string, message: { role: string; content: string; timestamp: string; attachment?: any }): void {
    this.server?.emit('admin.message', { sessionId, message });
  }

  /**
   * Emitir cambio de estado de takeover de admin.
   */
  emitAdminTakeover(sessionId: string, active: boolean): void {
    this.server?.emit('admin.takeover', { sessionId, active });
  }
}
