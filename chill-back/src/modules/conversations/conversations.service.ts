import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConversationRepository } from './repositories/conversation.repository';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly conversationRepository: ConversationRepository) {}

  async findAll() {
    try {
      return await this.conversationRepository.findAll();
    } catch (error) {
      console.error('Error fetching all conversations:', error);
      return [];
    }
  }

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

  async findBySession(sessionId: string) {
    try {
      // Buscar conversación por sessionId
      const conversation = await this.conversationRepository.findBySessionId(sessionId);
      if (!conversation) {
        return { messages: [] };
      }
      return conversation;
    } catch (error) {
      console.error('Error finding conversation by session:', error);
      return { messages: [] };
    }
  }

  async create(dto: CreateConversationDto) {
    try {
      return await this.conversationRepository.create(dto as any);
    } catch (error) {
      throw new BadRequestException('Error creating conversation');
    }
  }

  async getStats() {
    try {
      const all = await this.conversationRepository.findAll();
      console.log('📊 getStats - Total conversaciones:', all.length);
      all.forEach((conv, idx) => {
        console.log(`Conversación ${idx + 1}:`, {
          id: conv.id,
          sessionId: conv.sessionId,
          userName: conv.userName,
          messages: Array.isArray(conv.messages) ? conv.messages.length : 'NO ES ARRAY',
        });
      });

      return {
        total: all.length,
        totalMessages: all.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0),
        conversations: all, // Incluir todas las conversaciones
      };
    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return { total: 0, totalMessages: 0, conversations: [] };
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
