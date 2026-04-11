import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, UpdatePermissionMatrixDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        _count: { select: { users: true, permissions: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return role;
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
      },
    });
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    return this.prisma.role.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    if (role.isSystem) {
      throw new BadRequestException('No se puede eliminar un rol del sistema');
    }

    if (role._count.users > 0) {
      throw new BadRequestException('No se puede eliminar un rol que tiene usuarios asignados');
    }

    await this.prisma.role.delete({ where: { id } });
    return { message: 'Rol eliminado correctamente' };
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async getPermissionMatrix() {
    const [roles, permissions, grants] = await Promise.all([
      this.prisma.role.findMany({
        select: { id: true, name: true, displayName: true, isSystem: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.rolePermission.findMany(),
    ]);

    return { roles, permissions, grants };
  }

  async updatePermissionMatrix(dto: UpdatePermissionMatrixDto) {
    const operations = dto.grants.map((grant) =>
      this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: grant.roleId,
            permissionId: grant.permissionId,
          },
        },
        update: { granted: grant.granted },
        create: {
          roleId: grant.roleId,
          permissionId: grant.permissionId,
          granted: grant.granted,
        },
      }),
    );

    await this.prisma.$transaction(operations);
    return { message: 'Matriz de permisos actualizada correctamente' };
  }
}
