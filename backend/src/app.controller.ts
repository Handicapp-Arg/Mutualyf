import { Controller, Get, Delete, Logger, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import type { Response } from 'express';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('favicon.ico')
  favicon(@Res() res: Response) {
    res.status(204).end();
  }

  /**
   * Health check endpoint
   * GET /api/health
   */
  @Public()
  @Get('health')
  health() {
    this.logger.debug('Health check solicitado');
    return {
      success: true,
      status: 'ok',
      service: 'Chill Backend',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Estadísticas generales del sistema
   * GET /api/stats
   */
  @Get('stats')
  async stats() {
    try {
      this.logger.debug('Calculando estadísticas generales');

      const [
        totalUsers,
        returningUsers,
        usersWithNames,
        totalConversations,
        totalSessions,
      ] = await Promise.all([
        this.prisma.userIdentity.count(),
        this.prisma.userIdentity.count({ where: { visitCount: { gt: 1 } } }),
        this.prisma.userIdentity.count({ where: { userName: { not: null } } }),
        this.prisma.conversation.count(),
        this.prisma.userSession.count(),
      ]);

      const stats = {
        users: {
          total: totalUsers,
          returning: returningUsers,
          new: totalUsers - returningUsers,
          withNames: usersWithNames,
          retentionRate:
            totalUsers > 0
              ? ((returningUsers / totalUsers) * 100).toFixed(2) + '%'
              : '0%',
        },
        conversations: {
          total: totalConversations,
          averagePerUser:
            totalUsers > 0
              ? (totalConversations / totalUsers).toFixed(2)
              : '0',
        },
        sessions: {
          total: totalSessions,
        },
      };

      this.logger.log('Estadísticas calculadas exitosamente');
      return {
        success: true,
        message: 'Estadísticas obtenidas exitosamente',
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error al calcular estadísticas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Borrar todos los datos de la base de datos
   * DELETE /api/reset-database
   */
  @Delete('reset-database')
  @HttpCode(HttpStatus.OK)
  async resetDatabase() {
    try {
      this.logger.warn('Iniciando borrado de toda la base de datos...');

      const [deletedConversations, deletedSessions, deletedUsers] = await Promise.all([
        this.prisma.conversation.deleteMany(),
        this.prisma.userSession.deleteMany(),
        this.prisma.userIdentity.deleteMany(),
      ]);

      this.logger.log('Base de datos limpiada exitosamente');

      return {
        success: true,
        message: 'Base de datos limpiada exitosamente',
        data: {
          deletedConversations: deletedConversations.count,
          deletedSessions: deletedSessions.count,
          deletedUsers: deletedUsers.count,
          total: deletedConversations.count + deletedSessions.count + deletedUsers.count,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error al limpiar base de datos: ${error.message}`);
      throw error;
    }
  }
}
