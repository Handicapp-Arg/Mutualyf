import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SessionRepository } from './repositories/session.repository';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async findByToken(token: string) {
    try {
      const session = await this.sessionRepository.findByToken(token);
      if (!session) {
        throw new NotFoundException('Session not found');
      }
      return session;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching session');
    }
  }

  async create(dto: CreateSessionDto) {
    try {
      return await this.sessionRepository.create(dto as any);
    } catch (error) {
      throw new BadRequestException('Error creating session');
    }
  }

  async update(id: number, dto: UpdateSessionDto) {
    try {
      return await this.sessionRepository.update(id, dto as any);
    } catch (error) {
      throw new BadRequestException('Error updating session');
    }
  }
}
