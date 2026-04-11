import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      // Permitir conexiones sin token (usuarios de chat anónimo)
      return true;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub, isActive: true },
        include: {
          role: {
            include: {
              permissions: {
                where: { granted: true },
                include: { permission: true },
              },
            },
          },
        },
      });

      if (!user) {
        throw new WsException('Usuario no encontrado');
      }

      client.data = {
        ...client.data,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role.name,
          permissions: user.role.permissions.map((rp) => rp.permission.code),
        },
      };

      return true;
    } catch {
      // Token inválido - permitir como usuario anónimo (chat)
      return true;
    }
  }
}
