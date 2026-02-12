import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminRepository } from './repositories/admin.repository';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async findByEmail(email: string) {
    try {
      const admin = await this.adminRepository.findByEmail(email);
      if (!admin) {
        throw new NotFoundException('Admin not found');
      }
      return admin;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching admin');
    }
  }

  async create(dto: CreateAdminDto) {
    try {
      // Aquí podrías validar si el admin ya existe, etc.
      return await this.adminRepository.create(dto as any);
    } catch (error) {
      throw new BadRequestException('Error creating admin');
    }
  }

  async update(id: number, dto: UpdateAdminDto) {
    try {
      return await this.adminRepository.update(id, dto as any);
    } catch (error) {
      throw new BadRequestException('Error updating admin');
    }
  }
}
