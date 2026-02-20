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
      console.log('🔵 === INICIO GUARDADO ===');
      console.log('SessionId recibido:', data.sessionId);
      console.log('Total mensajes recibidos:', data.messages?.length || 0);

      // ELIMINAR todas las conversaciones con este sessionId (limpiar duplicados)
      const deleted = await this.prisma.conversation.deleteMany({
        where: { sessionId: data.sessionId },
      });

      if (deleted.count > 0) {
        console.log(
          `🗑️ Eliminadas ${deleted.count} conversaciones duplicadas con este sessionId`
        );
      }

      console.log('➕ CREANDO conversación NUEVA (única por sesión)');

      // Tomar el último mensaje del usuario y del bot (si existen)
      const userMessages = (data.messages || []).filter((m: any) => m.role === 'user');
      const botMessages = (data.messages || []).filter((m: any) => m.role === 'assistant');
      const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
      const lastBotMessage = botMessages.length > 0 ? botMessages[botMessages.length - 1].content : '';

      // Guardar todos los mensajes en el campo messages
      const newConversation = await this.prisma.conversation.create({
        data: {
          sessionId: data.sessionId,
          userName: data.userName,
          userMessage: lastUserMessage,
          botResponse: lastBotMessage,
          timestamp: (data.timestamp || new Date()).toISOString(),
          messages: JSON.stringify(data.messages || []),
          createdAt: data.timestamp || new Date(),
        },
      });

      const savedMessages = JSON.parse(newConversation.messages as string);
      console.log('✅ Conversación CREADA con', savedMessages.length, 'mensajes');
      console.log('🔵 === FIN GUARDADO ===\n');

      return {
        id: newConversation.id.toString(),
        sessionId: newConversation.sessionId,
        userName: newConversation.userName,
        messages: savedMessages,
        timestamp: newConversation.createdAt,
      };
    } catch (error) {
      console.error('❌ ERROR en create:', error);
      throw error;
    }
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
