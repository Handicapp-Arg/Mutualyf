import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IConversation } from '../interfaces/conversation.interface';

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<any[]> {
    try {
      // Obtener conversaciones de la base de datos
      const conversations = await this.prisma.conversation.findMany({
        include: {
          userIdentity: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100, // Limitar a las últimas 100 conversaciones
      });

      // Transformar al formato esperado
      return conversations.map((conv) => ({
        id: conv.id.toString(),
        sessionId: conv.sessionId || `session_${conv.id}`,
        userName: conv.userName || conv.userIdentity?.userName || 'Anónimo',
        messages: conv.messages ? JSON.parse(conv.messages as string) : [],
        timestamp: conv.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  async findById(id: number): Promise<IConversation | null> {
    const convo = await this.prisma.conversation.findUnique({ where: { id } });
    if (!convo) return null;
    return {
      id: convo.id,
      userId: convo.userIdentityId ?? 0,
      startedAt: new Date(convo.createdAt),
      endedAt: undefined,
    };
  }

  async findBySessionId(sessionId: string): Promise<any | null> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: { sessionId },
        include: {
          userIdentity: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!conversation) return null;

      return {
        id: conversation.id.toString(),
        sessionId: conversation.sessionId,
        userName: conversation.userName || conversation.userIdentity?.userName,
        messages: conversation.messages
          ? JSON.parse(conversation.messages as string)
          : [],
        timestamp: conversation.createdAt,
      };
    } catch (error) {
      console.error('Error finding conversation by sessionId:', error);
      return null;
    }
  }

  async create(data: any): Promise<any> {
    try {
      // Actualizar o crear conversación (upsert por sessionId)
      const deleted = await this.prisma.conversation.deleteMany({
        where: { sessionId: data.sessionId },
      });

      // Extraer primer y último mensaje para campos legacy
      const userMessages = (data.messages || []).filter((m: any) => m.role === 'user');
      const botMessages = (data.messages || []).filter(
        (m: any) => m.role === 'assistant'
      );
      const lastUserMessage =
        userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
      const lastBotMessage =
        botMessages.length > 0 ? botMessages[botMessages.length - 1].content : '';

      // Crear conversación nueva (reemplaza la anterior si existía)
      const newConversation = await this.prisma.conversation.create({
        data: {
          sessionId: data.sessionId,
          userName: data.userName || 'Anónimo',
          userMessage: lastUserMessage,
          botResponse: lastBotMessage,
          timestamp: (data.timestamp || new Date()).toISOString(),
          messages: JSON.stringify(data.messages || []),
          createdAt: data.timestamp || new Date(),
        },
      });

      return {
        id: newConversation.id.toString(),
        sessionId: newConversation.sessionId,
        userName: newConversation.userName,
        messages: JSON.parse(newConversation.messages as string),
        timestamp: newConversation.createdAt,
      };
    } catch (error) {
      console.error('Error guardando conversación:', error);
      throw error;
    }
  }

  async deleteAll(): Promise<void> {
    await this.prisma.conversation.deleteMany({});
  }
  async update(id: number, data: Partial<IConversation>): Promise<IConversation> {
    const convo = await this.prisma.conversation.update({
      where: { id },
      data: {
        userIdentityId: data.userId,
      },
    });
    return {
      id: convo.id,
      userId: convo.userIdentityId ?? 0,
      startedAt: new Date(convo.createdAt),
      endedAt: undefined,
    };
  }
}
