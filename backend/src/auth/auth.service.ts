import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { email },
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
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
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

  async login(user: { id: number; email: string; fullName: string; role: { id: number; name: string; displayName: string }; permissions: string[] }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
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
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
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

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }
}
