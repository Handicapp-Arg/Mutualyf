import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserIdentityDto } from './dto/user-identity.dto';
import {
  ResourceNotFoundException,
  DatabaseException,
} from '../common/exceptions/business.exception';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Buscar usuario por fingerprint
   * Retorna null si no se encuentra (no lanza excepción)
   */
  async findByFingerprint(fingerprint: string) {
    try {
      this.logger.debug(`Buscando usuario por fingerprint: ${fingerprint}`);

      const user = await this.prisma.userIdentity.findUnique({
        where: { fingerprint },
      });

      if (!user) {
        this.logger.debug(`Usuario no encontrado con fingerprint: ${fingerprint} (usuario nuevo)`);
        return null;
      }

      this.logger.log(`Usuario encontrado: ${user.id} - ${user.userName || 'Sin nombre'}`);
      return user;
    } catch (error) {
      this.logger.error(`Error al buscar usuario por fingerprint: ${error.message}`);
      throw new DatabaseException('findByFingerprint', error.message);
    }
  }

  /**
   * Buscar usuario por IP (retorna el más reciente)
   * Retorna null si no se encuentra (no lanza excepción)
   */
  async findByIp(ipAddress: string) {
    try {
      this.logger.debug(`Buscando usuario por IP: ${ipAddress}`);

      const user = await this.prisma.userIdentity.findFirst({
        where: { ipAddress },
        orderBy: { lastVisit: 'desc' },
      });

      if (!user) {
        this.logger.debug(`Usuario no encontrado con IP: ${ipAddress} (usuario nuevo)`);
        return null;
      }

      this.logger.log(`Usuario encontrado por IP: ${user.id} - ${user.userName || 'Sin nombre'}`);
      return user;
    } catch (error) {
      this.logger.error(`Error al buscar usuario por IP: ${error.message}`);
      throw new DatabaseException('findByIp', error.message);
    }
  }

  /**
   * Crear o actualizar identidad de usuario
   * Si existe, incrementa visitCount y actualiza datos
   * Si no existe, crea nuevo registro con visitCount = 1
   * Propaga el nombre a todas las sesiones relacionadas
   */
  async createOrUpdate(data: CreateUserIdentityDto) {
    try {
      this.logger.debug(`Procesando identidad para fingerprint: ${data.fingerprint}`);

      const existing = await this.prisma.userIdentity.findUnique({
        where: { fingerprint: data.fingerprint },
      });

      if (existing) {
        this.logger.log(`Actualizando usuario existente: ${existing.id}`);
        
        // Determinar el nombre a usar (nuevo o existente)
        const finalUserName = data.userName || existing.userName;

        const updated = await this.prisma.userIdentity.update({
          where: { fingerprint: data.fingerprint },
          data: {
            ipAddress: data.ipAddress,
            userName: finalUserName,
            userAgent: data.userAgent,
            timezone: data.timezone,
            language: data.language,
            lastVisit: data.lastVisit,
            visitCount: { increment: 1 },
          },
        });

        // 🔄 PROPAGAR nombre a todas las sesiones del mismo usuario
        if (finalUserName) {
          const propagatedSessions = await this.prisma.userSession.updateMany({
            where: { userIdentityId: updated.id },
            data: { userName: finalUserName },
          });
          this.logger.log(`Nombre propagado a ${propagatedSessions.count} sesiones`);
        }

        this.logger.log(
          `Usuario actualizado exitosamente. Visitas: ${updated.visitCount}`,
        );
        return {
          message: 'Usuario actualizado exitosamente',
          data: updated,
        };
      }

      this.logger.log(`Creando nuevo usuario con fingerprint: ${data.fingerprint}`);

      const created = await this.prisma.userIdentity.create({
        data: {
          ...data,
          visitCount: 1,
        },
      });

      this.logger.log(`Nuevo usuario creado: ${created.id}`);
      return {
        message: 'Usuario creado exitosamente',
        data: created,
      };
    } catch (error) {
      this.logger.error(`Error al crear/actualizar usuario: ${error.message}`);

      // Manejar errores específicos de Prisma
      if (error.code === 'P2002') {
        throw new DatabaseException(
          'Violación de restricción única en la base de datos',
          error.meta,
        );
      }

      throw new DatabaseException('createOrUpdate', error.message);
    }
  }

  /**
   * Actualizar nombre de usuario
   * Propaga el nombre a todas las sesiones relacionadas
   * @throws ResourceNotFoundException si el usuario no existe
   */
  async updateName(fingerprint: string, userName: string) {
    try {
      this.logger.log(`Actualizando nombre para fingerprint: ${fingerprint}`);

      const updated = await this.prisma.userIdentity.update({
        where: { fingerprint },
        data: { userName },
      });

      // 🔄 PROPAGAR nombre a todas las sesiones del mismo usuario
      const propagatedSessions = await this.prisma.userSession.updateMany({
        where: { userIdentityId: updated.id },
        data: { userName },
      });
      
      this.logger.log(
        `Nombre actualizado para usuario ${updated.id}. ` +
        `Propagado a ${propagatedSessions.count} sesiones.`
      );

      return {
        message: 'Nombre de usuario actualizado exitosamente',
        data: updated,
        propagatedSessions: propagatedSessions.count,
      };
    } catch (error) {
      // Manejar error si el usuario no existe
      if (error.code === 'P2025') {
        throw new ResourceNotFoundException('Usuario', fingerprint);
      }

      this.logger.error(`Error al actualizar nombre: ${error.message}`);
      throw new DatabaseException('updateName', error.message);
    }
  }

  /**
   * Obtener estadísticas generales de usuarios
   */
  async getStats() {
    try {
      this.logger.debug('Calculando estadísticas de usuarios');

      const [totalUsers, returningUsers, usersWithNames] = await Promise.all([
        this.prisma.userIdentity.count(),
        this.prisma.userIdentity.count({
          where: { visitCount: { gt: 1 } },
        }),
        this.prisma.userIdentity.count({
          where: { userName: { not: null } },
        }),
      ]);

      const stats = {
        totalUsers,
        returningUsers,
        usersWithNames,
        newUsers: totalUsers - returningUsers,
        percentageWithNames: totalUsers > 0 
          ? ((usersWithNames / totalUsers) * 100).toFixed(2) + '%'
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
