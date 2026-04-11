import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: {
        id: user.role.id,
        name: user.role.name,
        displayName: user.role.displayName,
      },
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
  }
}
