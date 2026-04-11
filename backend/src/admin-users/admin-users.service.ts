import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/create-admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.adminUser.findMany({
      include: {
        role: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(({ passwordHash, ...user }) => user);
  }

  async findById(id: number) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id },
      include: {
        role: { select: { id: true, name: true, displayName: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async create(dto: CreateAdminUserDto) {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new BadRequestException('Rol no encontrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.adminUser.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        roleId: dto.roleId,
      },
      include: {
        role: { select: { id: true, name: true, displayName: true } },
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async update(id: number, dto: UpdateAdminUserDto) {
    const user = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.adminUser.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Ya existe un usuario con ese email');
      }
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role) {
        throw new BadRequestException('Rol no encontrado');
      }
    }

    const data: any = {};
    if (dto.email) data.email = dto.email;
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.roleId) data.roleId = dto.roleId;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data,
      include: {
        role: { select: { id: true, name: true, displayName: true } },
      },
    });

    const { passwordHash, ...result } = updated;
    return result;
  }

  async toggleActive(id: number, requestUserId: number) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (id === requestUserId) {
      throw new BadRequestException('No puede desactivar su propia cuenta');
    }

    // No permitir desactivar si es el último admin activo
    if (user.isActive && user.role.name === 'admin') {
      const activeAdmins = await this.prisma.adminUser.count({
        where: {
          isActive: true,
          role: { name: 'admin' },
        },
      });

      if (activeAdmins <= 1) {
        throw new BadRequestException('No se puede desactivar el último administrador activo');
      }
    }

    const updated = await this.prisma.adminUser.update({
      where: { id },
      data: { isActive: !user.isActive },
      include: {
        role: { select: { id: true, name: true, displayName: true } },
      },
    });

    const { passwordHash, ...result } = updated;
    return result;
  }
}
