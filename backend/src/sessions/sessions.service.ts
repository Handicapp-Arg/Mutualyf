import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/session.dto';
import {
  DatabaseException,
  ResourceNotFoundException,
} from '../common/exceptions/business.exception';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class SessionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionsService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  /**
   * Broadcast periódico cada 15s para limpiar sesiones expiradas en el admin.
   * Cubre el caso donde un usuario cierra el navegador sin que el endSession llegue.
   */
  onModuleInit() {
    this.cleanupInterval = setInterval(() => {
      this.broadcastLiveSessions();
    }, 15000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Helper privado: consulta sesiones en vivo y las emite por WebSocket.
   * Llamarse después de cualquier mutación que afecte el conjunto vivo.
   */
  private async broadcastLiveSessions(): Promise<void> {
    try {
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const live = await this.prisma.userSession.findMany({
        where: { lastSeen: { gte: sixtySecondsAgo } },
        orderBy: { lastSeen: 'desc' },
      });
      this.events.emitLiveSessions(live);
    } catch (error) {
      this.logger.warn(`No se pudo broadcast de sesiones vivas: ${error.message}`);
    }
  }

  /**
   * Crear o actualizar sesión de usuario
   * Si la sesión existe, actualiza lastSeen y userName (si se proporciona)
   * Si no existe, crea una nueva sesión
   * Ahora incluye relación con UserIdentity via fingerprint o IP
   * Y propaga el nombre a sesiones anteriores del mismo usuario
   */
  async createOrUpdate(data: CreateSessionDto) {
    try {
      this.logger.debug(`Procesando sesión: ${data.sessionId}`);

      // Buscar UserIdentity para relacionar (por fingerprint o IP)
      let userIdentityId: number | null = null;
      let userIdentity: any = null;
      
      if (data.fingerprint) {
        userIdentity = await this.prisma.userIdentity.findUnique({
          where: { fingerprint: data.fingerprint },
        });
        if (userIdentity) {
          userIdentityId = userIdentity.id;
          this.logger.debug(`Relacionando sesión con UserIdentity ID: ${userIdentityId}`);
        }
      } else if (data.ipAddress) {
        userIdentity = await this.prisma.userIdentity.findFirst({
          where: { ipAddress: data.ipAddress },
          orderBy: { lastVisit: 'desc' },
        });
        if (userIdentity) {
          userIdentityId = userIdentity.id;
          this.logger.debug(`Relacionando sesión con UserIdentity ID: ${userIdentityId} (por IP)`);
        }
      }

      // Determinar el nombre final (prioridad: nuevo > existente en Identity)
      const finalUserName = data.userName || userIdentity?.userName || null;

      // Crear/actualizar la sesión (incluye relación con UserIdentity si existe)
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

      if (userIdentityId) {
        
        // 🔄 Si esta sesión tiene nombre, propagarlo a TODAS las sesiones del mismo usuario
        if (finalUserName) {
          const propagated = await this.prisma.userSession.updateMany({
            where: { userIdentityId: userIdentityId },
            data: { userName: finalUserName },
          });
          
          // También actualizar UserIdentity si no tenía nombre
          if (!userIdentity?.userName) {
            await this.prisma.userIdentity.update({
              where: { id: userIdentityId },
              data: { userName: finalUserName },
            });
            this.logger.log(`Nombre "${finalUserName}" guardado en UserIdentity`);
          }
          
          this.logger.log(`Nombre "${finalUserName}" propagado a ${propagated.count} sesiones`);
        }
      }

      this.logger.log(`Sesión actualizada: ${session.sessionId} (UserIdentity: ${userIdentityId || 'ninguno'})`);
      return {
        message: 'Sesión actualizada exitosamente',
        data: session,
      };
    } catch (error) {
      this.logger.error(`Error al procesar sesión: ${error.message}`);
      throw new DatabaseException('createOrUpdate session', error.message);
    }
  }

  /**
   * Obtener información de una sesión por ID
   * @throws ResourceNotFoundException si la sesión no existe
   */
  async findById(sessionId: string) {
    try {
      this.logger.debug(`Buscando sesión: ${sessionId}`);

      const session = await this.prisma.userSession.findUnique({
        where: { sessionId },
      });

      if (!session) {
        throw new ResourceNotFoundException('Sesión', sessionId);
      }

      this.logger.log(`Sesión encontrada: ${session.sessionId}`);
      return {
        message: 'Sesión encontrada',
        data: session,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        throw error;
      }

      this.logger.error(`Error al buscar sesión: ${error.message}`);
      throw new DatabaseException('findById session', error.message);
    }
  }

  /**
   * Heartbeat ligero: solo actualiza lastSeen (y crea la fila si no existe).
   * No corre lookup/propagation de UserIdentity. Pensado para llamarse cada
   * pocos segundos desde el frontend mientras el chat esté abierto.
   */
  async heartbeat(sessionId: string, userName?: string) {
    try {
      const now = new Date().toISOString();
      const session = await this.prisma.userSession.upsert({
        where: { sessionId },
        create: {
          sessionId,
          userName: userName || null,
          lastSeen: now,
        },
        update: {
          lastSeen: now,
          ...(userName ? { userName } : {}),
        },
      });

      // Broadcast en tiempo real (no bloqueante)
      this.broadcastLiveSessions();

      return { message: 'ok', data: { sessionId: session.sessionId, lastSeen: session.lastSeen } };
    } catch (error) {
      this.logger.error(`Error en heartbeat: ${error.message}`);
      throw new DatabaseException('heartbeat', error.message);
    }
  }

  /**
   * Marcar una sesión como cerrada: pone lastSeen muy en el pasado para
   * que deje de aparecer en getLiveSessions inmediatamente.
   */
  async endSession(sessionId: string) {
    try {
      const past = new Date(0).toISOString();
      await this.prisma.userSession.updateMany({
        where: { sessionId },
        data: { lastSeen: past },
      });

      // Broadcast inmediato al admin para que el chat desaparezca al instante
      this.broadcastLiveSessions();

      return { message: 'ok', data: { sessionId } };
    } catch (error) {
      this.logger.error(`Error en endSession: ${error.message}`);
      throw new DatabaseException('endSession', error.message);
    }
  }

  /**
   * Obtener sesiones EN VIVO (vistas en los últimos 60 segundos).
   * Estas son los chats que están abiertos y enviando heartbeats ahora mismo.
   */
  async getLiveSessions() {
    try {
      const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const liveSessions = await this.prisma.userSession.findMany({
        where: {
          lastSeen: { gte: sixtySecondsAgo },
        },
        orderBy: { lastSeen: 'desc' },
      });
      return {
        message: 'Sesiones en vivo obtenidas',
        data: liveSessions,
        count: liveSessions.length,
      };
    } catch (error) {
      this.logger.error(`Error al obtener sesiones en vivo: ${error.message}`);
      throw new DatabaseException('getLiveSessions', error.message);
    }
  }

  /**
   * Obtener sesiones activas (últimas 24 horas)
   */
  async getActiveSessions() {
    try {
      this.logger.debug('Obteniendo sesiones activas');

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const activeSessions = await this.prisma.userSession.findMany({
        where: {
          lastSeen: {
            gte: oneDayAgo,
          },
        },
        orderBy: {
          lastSeen: 'desc',
        },
      });

      this.logger.log(`Se encontraron ${activeSessions.length} sesiones activas`);
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

  /**
   * Obtener estadísticas de sesiones
   */
  async getStats() {
    try {
      this.logger.debug('Calculando estadísticas de sesiones');

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        totalSessions,
        activeToday,
        activeThisWeek,
      ] = await Promise.all([
        this.prisma.userSession.count(),
        this.prisma.userSession.count({
          where: { lastSeen: { gte: oneDayAgo } },
        }),
        this.prisma.userSession.count({
          where: { lastSeen: { gte: oneWeekAgo } },
        }),
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

      this.logger.log(`Estadísticas calculadas: ${JSON.stringify(stats)}`);
      return {
        message: 'Estadísticas obtenidas exitosamente',
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Error al calcular estadísticas: ${error.message}`);
      throw new DatabaseException('getStats', error.message);
    }
  }
}
