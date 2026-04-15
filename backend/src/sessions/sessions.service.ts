import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/session.dto';
import {
  DatabaseException,
  ResourceNotFoundException,
} from '../common/exceptions/business.exception';
import { EventsGateway } from '../events/events.gateway';

const ONLINE_WINDOW_MS = 60_000;
const BROADCAST_THROTTLE_MS = 1_000;
const FLUSH_INTERVAL_MS = 60_000;
const CLEANUP_INTERVAL_MS = 15_000;

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionsService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;
  private flushInterval: NodeJS.Timeout | null = null;

  /** Presencia en memoria: sessionId → timestamp ms del último heartbeat. */
  private readonly presence = new Map<string, number>();

  /** Throttle del broadcast para no spamear el socket admin con heartbeats concurrentes. */
  private lastBroadcastAt = 0;
  private pendingBroadcast: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  onModuleInit() {
    this.cleanupInterval = setInterval(() => {
      this.pruneStalePresence();
      this.broadcastLiveSessions();
    }, CLEANUP_INTERVAL_MS);

    // Flush batch del presence Map a la DB cada 60s (lastSeen persistente).
    this.flushInterval = setInterval(() => {
      this.flushPresenceToDb().catch((e) =>
        this.logger.warn(`flushPresence error: ${e.message}`),
      );
    }, FLUSH_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.flushInterval) clearInterval(this.flushInterval);
    if (this.pendingBroadcast) clearTimeout(this.pendingBroadcast);
  }

  /**
   * Asegura que exista un registro UserSession en la DB para este sessionId.
   * Se llama una sola vez al conectar (handleConnection), no en cada ping.
   */
  async ensureSessionExists(sessionId: string) {
    try {
      await this.prisma.userSession.upsert({
        where: { sessionId },
        create: { sessionId, lastSeen: new Date() },
        update: {},
      });
    } catch (error) {
      this.logger.warn(`ensureSessionExists error: ${error.message}`);
    }
  }

  /**
   * Actualiza presencia en memoria (fast path, sin DB).
   * Usado por el heartbeat WebSocket y el endpoint HTTP legacy.
   */
  markPresence(sessionId: string) {
    this.presence.set(sessionId, Date.now());
    this.broadcastLiveSessions();
  }

  markOffline(sessionId: string) {
    this.presence.delete(sessionId);
    this.broadcastLiveSessions();
  }

  /** Limpia del Map los sessionIds que ya superaron la ventana online. */
  private pruneStalePresence() {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    for (const [sid, ts] of this.presence) {
      if (ts < cutoff) this.presence.delete(sid);
    }
  }

  /** Throttled: deja pasar 1 broadcast cada BROADCAST_THROTTLE_MS. */
  private broadcastLiveSessions() {
    const now = Date.now();
    const sinceLast = now - this.lastBroadcastAt;

    if (sinceLast >= BROADCAST_THROTTLE_MS) {
      this.lastBroadcastAt = now;
      this.doBroadcast();
      return;
    }

    if (!this.pendingBroadcast) {
      this.pendingBroadcast = setTimeout(() => {
        this.pendingBroadcast = null;
        this.lastBroadcastAt = Date.now();
        this.doBroadcast();
      }, BROADCAST_THROTTLE_MS - sinceLast);
    }
  }

  private async doBroadcast() {
    try {
      const live = await this.getLiveSessionsFromMap();
      this.events.emitLiveSessions(live);
    } catch (error) {
      this.logger.warn(`No se pudo broadcast de sesiones vivas: ${error.message}`);
    }
  }

  /**
   * Arma la lista de sesiones en vivo a partir del Map + joinea la data
   * persistente (userName, userIdentityId) desde la DB en una sola query.
   */
  private async getLiveSessionsFromMap() {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    const liveIds: string[] = [];
    for (const [sid, ts] of this.presence) {
      if (ts >= cutoff) liveIds.push(sid);
    }
    if (liveIds.length === 0) return [];

    const rows = await this.prisma.userSession.findMany({
      where: { sessionId: { in: liveIds } },
    });

    return rows
      .map((r) => ({
        ...r,
        lastSeen: new Date(this.presence.get(r.sessionId) ?? r.lastSeen.getTime()),
      }))
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  /** Persiste a DB los lastSeen del Map en un solo round-trip. */
  private async flushPresenceToDb() {
    if (this.presence.size === 0) return;

    const snapshot = Array.from(this.presence.entries());
    await Promise.all(
      snapshot.map(([sessionId, ts]) =>
        this.prisma.userSession.updateMany({
          where: { sessionId },
          data: { lastSeen: new Date(ts) },
        }),
      ),
    );
  }

  /**
   * Crear o actualizar sesión de usuario con lookup/propagation completo.
   */
  async createOrUpdate(data: CreateSessionDto) {
    try {
      let userIdentityId: number | null = null;
      let userIdentity: any = null;

      if (data.fingerprint) {
        userIdentity = await this.prisma.userIdentity.findUnique({
          where: { fingerprint: data.fingerprint },
        });
        if (userIdentity) userIdentityId = userIdentity.id;
      } else if (data.ipAddress) {
        userIdentity = await this.prisma.userIdentity.findFirst({
          where: { ipAddress: data.ipAddress },
          orderBy: { lastVisit: 'desc' },
        });
        if (userIdentity) userIdentityId = userIdentity.id;
      }

      const finalUserName = data.userName || userIdentity?.userName || null;

      const session = await this.prisma.userSession.upsert({
        where: { sessionId: data.sessionId },
        create: {
          sessionId: data.sessionId,
          userName: finalUserName,
          lastSeen: data.lastSeen,
          ...(userIdentityId ? { userIdentity: { connect: { id: userIdentityId } } } : {}),
        },
        update: {
          userName: finalUserName,
          lastSeen: data.lastSeen,
          ...(userIdentityId ? { userIdentity: { connect: { id: userIdentityId } } } : {}),
        },
      });

      if (userIdentityId && finalUserName) {
        await this.prisma.userSession.updateMany({
          where: { userIdentityId },
          data: { userName: finalUserName },
        });
        if (!userIdentity?.userName) {
          await this.prisma.userIdentity.update({
            where: { id: userIdentityId },
            data: { userName: finalUserName },
          });
        }
      }

      this.presence.set(data.sessionId, data.lastSeen.getTime());
      this.broadcastLiveSessions();

      return { message: 'Sesión actualizada exitosamente', data: session };
    } catch (error) {
      this.logger.error(`Error al procesar sesión: ${error.message}`);
      throw new DatabaseException('createOrUpdate session', error.message);
    }
  }

  async findById(sessionId: string) {
    try {
      const session = await this.prisma.userSession.findUnique({
        where: { sessionId },
      });
      if (!session) throw new ResourceNotFoundException('Sesión', sessionId);
      return { message: 'Sesión encontrada', data: session };
    } catch (error) {
      if (error instanceof ResourceNotFoundException) throw error;
      this.logger.error(`Error al buscar sesión: ${error.message}`);
      throw new DatabaseException('findById session', error.message);
    }
  }

  /**
   * Heartbeat ligero: actualiza solo presencia en memoria.
   * @deprecated Preferir heartbeat por WebSocket (PresenceGateway).
   *   Mantener como fallback para clientes sin socket.
   */
  async heartbeat(sessionId: string, userName?: string) {
    this.presence.set(sessionId, Date.now());

    // Si viene userName, asegurar la fila (1 query, solo si hay nombre nuevo).
    if (userName) {
      await this.prisma.userSession.upsert({
        where: { sessionId },
        create: { sessionId, userName, lastSeen: new Date() },
        update: { userName },
      });
    }

    this.broadcastLiveSessions();
    return { message: 'ok', data: { sessionId, lastSeen: new Date() } };
  }

  async endSession(sessionId: string) {
    try {
      this.presence.delete(sessionId);
      await this.prisma.userSession.updateMany({
        where: { sessionId },
        data: { lastSeen: new Date(0) },
      });
      this.broadcastLiveSessions();
      return { message: 'ok', data: { sessionId } };
    } catch (error) {
      this.logger.error(`Error en endSession: ${error.message}`);
      throw new DatabaseException('endSession', error.message);
    }
  }

  /** Sesiones en vivo (< 60s). Lee del Map en memoria. */
  async getLiveSessions() {
    try {
      const data = await this.getLiveSessionsFromMap();
      return { message: 'Sesiones en vivo obtenidas', data, count: data.length };
    } catch (error) {
      this.logger.error(`Error al obtener sesiones en vivo: ${error.message}`);
      throw new DatabaseException('getLiveSessions', error.message);
    }
  }

  async getActiveSessions() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeSessions = await this.prisma.userSession.findMany({
        where: { lastSeen: { gte: oneDayAgo } },
        orderBy: { lastSeen: 'desc' },
      });
      return {
        message: 'Sesiones activas obtenidas exitosamente',
        data: activeSessions,
        count: activeSessions.length,
      };
    } catch (error) {
      this.logger.error(`Error al obtener sesiones activas: ${error.message}`);
      throw new DatabaseException('getActiveSessions', error.message);
    }
  }

  async getStats() {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [totalSessions, activeToday, activeThisWeek] = await Promise.all([
        this.prisma.userSession.count(),
        this.prisma.userSession.count({ where: { lastSeen: { gte: oneDayAgo } } }),
        this.prisma.userSession.count({ where: { lastSeen: { gte: oneWeekAgo } } }),
      ]);

      const stats = {
        totalSessions,
        activeToday,
        activeThisWeek,
        activityRateToday:
          totalSessions > 0
            ? ((activeToday / totalSessions) * 100).toFixed(2) + '%'
            : '0%',
      };
      return { message: 'Estadísticas obtenidas exitosamente', data: stats };
    } catch (error) {
      this.logger.error(`Error al calcular estadísticas: ${error.message}`);
      throw new DatabaseException('getStats', error.message);
    }
  }
}
