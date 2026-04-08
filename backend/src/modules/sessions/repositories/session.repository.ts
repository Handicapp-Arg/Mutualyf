import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ISession } from '../interfaces/session.interface';

@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByToken(token: string): Promise<ISession | null> {
    const session = await this.prisma.userSession.findUnique({ where: { sessionId: token } });
    if (!session) return null;
    return {
      id: session.id,
      userId: session.userIdentityId ?? 0,
      token: session.sessionId,
      createdAt: session.createdAt,
      expiresAt: new Date() // No expiresAt en el modelo
    };
  }

  async create(data: ISession): Promise<ISession> {
    const session = await this.prisma.userSession.create({
      data: {
        sessionId: data.token,
        userIdentityId: data.userId,
        createdAt: data.createdAt,
        // Otros campos requeridos por Prisma deben ir aquí (rellenar con valores por defecto o null)
        userName: '',
        lastSeen: '',
      }
    });
    return {
      id: session.id,
      userId: session.userIdentityId ?? 0,
      token: session.sessionId,
      createdAt: session.createdAt,
      expiresAt: new Date()
    };
  }

  async update(id: number, data: Partial<ISession>): Promise<ISession> {
    const session = await this.prisma.userSession.update({
      where: { id },
      data: {
        userIdentityId: data.userId,
        // Otros campos pueden ser actualizados aquí si es necesario
      }
    });
    return {
      id: session.id,
      userId: session.userIdentityId ?? 0,
      token: session.sessionId,
      createdAt: session.createdAt,
      expiresAt: new Date()
    };
  }
}
