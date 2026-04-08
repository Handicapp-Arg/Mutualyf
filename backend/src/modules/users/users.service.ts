import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async findByFingerprint(fingerprint: string) {
    try {
      const user = await this.userRepository.findByFingerprint(fingerprint);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  async create(dto: CreateUserDto) {
    try {
      return await this.userRepository.create(dto as any);
    } catch (error) {
      throw new BadRequestException('Error creating user');
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    try {
      return await this.userRepository.update(id, dto as any);
    } catch (error) {
      throw new BadRequestException('Error updating user');
    }
  }
}
