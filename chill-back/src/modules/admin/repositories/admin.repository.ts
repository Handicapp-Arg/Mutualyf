import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAdmin } from '../interfaces/admin.interface';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  // No existe modelo Admin en Prisma. Implementar cuando se agregue el modelo.
  async findByEmail(email: string): Promise<IAdmin | null> {
    // throw new Error('Admin model not implemented in Prisma schema');
    return null;
  }

  async create(data: IAdmin): Promise<IAdmin> {
    // throw new Error('Admin model not implemented in Prisma schema');
    return null as any;
  }

  async update(id: number, data: Partial<IAdmin>): Promise<IAdmin> {
    // throw new Error('Admin model not implemented in Prisma schema');
    return null as any;
  }
}
