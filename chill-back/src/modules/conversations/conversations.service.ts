import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConversationRepository } from './repositories/conversation.repository';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly conversationRepository: ConversationRepository) {}

  async findById(id: number) {
    try {
      const conversation = await this.conversationRepository.findById(id);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }
      return conversation;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching conversation');
    }
  }

  async create(dto: CreateConversationDto) {
    try {
      return await this.conversationRepository.create(dto as any);
    } catch (error) {
      throw new BadRequestException('Error creating conversation');
    }
  }

  async update(id: number, dto: UpdateConversationDto) {
    try {
      return await this.conversationRepository.update(id, dto as any);
    } catch (error) {
      throw new BadRequestException('Error updating conversation');
    }
  }
}
