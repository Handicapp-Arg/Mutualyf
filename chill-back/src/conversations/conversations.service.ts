

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateConversationDto,
  UpdateConversationFeedbackDto,
} from './dto/conversation.dto';
import {
  ResourceNotFoundException,
  DatabaseException,
  BusinessException,
} from '../common/exceptions/business.exception';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todos los sessionId únicos
   */
  async getAllSessions() {
    try {
      const sessions = await this.prisma.conversation.findMany({
        select: { sessionId: true },
        distinct: ['sessionId'],
        orderBy: { sessionId: 'asc' },
      });
      return {
        message: 'Sesiones obtenidas exitosamente',
        data: sessions.map(s => s.sessionId),
        count: sessions.length,
      };
    } catch (error) {
      this.logger.error(`Error al obtener sesiones: ${error.message}`);
      throw new DatabaseException('getAllSessions', error.message);
    }
  }

  /**
   * Crear nueva conversación
   * Valida que el mensaje no esté vacío y que el sessionId sea válido
   */
  async create(data: CreateConversationDto) {
    try {
      this.logger.debug(`Upsert conversación para sessionId: ${data.sessionId}`);

      // Extraer último mensaje del usuario y última respuesta del bot
      const userMessages = data.messages.filter((m) => m.role === 'user');
      const assistantMessages = data.messages.filter((m) => m.role === 'assistant');

      const userMessage = userMessages[userMessages.length - 1]?.content || '';
      const botResponse = assistantMessages[assistantMessages.length - 1]?.content || '';

      // Validación de negocio adicional
      if (userMessage.trim().length === 0) {
        throw new BusinessException('El mensaje del usuario no puede estar vacío');
      }

      if (botResponse.trim().length === 0) {
        throw new BusinessException('La respuesta del bot no puede estar vacía');
      }

      // Upsert: si existe, actualiza; si no, crea
      const conversation = await this.prisma.conversation.upsert({
        where: { sessionId: data.sessionId },
        update: {
          userName: data.userName || null,
          userMessage: userMessage,
          botResponse: botResponse,
          messages: JSON.stringify(data.messages),
          timestamp: data.timestamp || new Date().toISOString(),
          aiModel: data.aiModel || null,
          userFeedback: data.userFeedback ?? null,
        },
        create: {
          sessionId: data.sessionId,
          userName: data.userName || null,
          userMessage: userMessage,
          botResponse: botResponse,
          messages: JSON.stringify(data.messages),
          timestamp: data.timestamp || new Date().toISOString(),
          aiModel: data.aiModel || null,
          userFeedback: data.userFeedback ?? null,
        },
      });

      this.logger.log(`Conversación upserted exitosamente: ${conversation.id}`);
      return {
        id: conversation.id,
        message: 'Conversación guardada exitosamente',
        data: conversation,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error(`Error al upsert conversación: ${error.message}`);
      throw new DatabaseException('upsert conversation', error.message);
    }
  }

  /**
   * Actualizar feedback de una conversación específica
   * @throws ResourceNotFoundException si la conversación no existe
   */
  async updateFeedback(dto: UpdateConversationFeedbackDto) {
    try {
      this.logger.debug(`Actualizando feedback para conversación: ${dto.id}`);

      const updated = await this.prisma.conversation.update({
        where: { id: dto.id },
        data: { userFeedback: dto.userFeedback },
      });

      this.logger.log(`Feedback actualizado para conversación: ${updated.id}`);
      return {
        message: 'Feedback actualizado exitosamente',
        data: updated,
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ResourceNotFoundException('Conversación', dto.id);
      }

      this.logger.error(`Error al actualizar feedback: ${error.message}`);
      throw new DatabaseException('updateFeedback', error.message);
    }
  }

  /**
   * Obtener historial de conversaciones por sessionId
   * @param sessionId - ID de la sesión
   * @param limit - Número máximo de conversaciones a retornar (default: 50)
   */
  async getBySession(sessionId: string, limit: number = 50) {
    try {
      this.logger.debug(`Obteniendo conversaciones para sessionId: ${sessionId}`);

      const conversations = await this.prisma.conversation.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      this.logger.log(`Se encontraron ${conversations.length} conversaciones`);
      return {
        message: 'Conversaciones obtenidas exitosamente',
        data: conversations,
        count: conversations.length,
      };
    } catch (error) {
      this.logger.error(`Error al obtener conversaciones: ${error.message}`);
      throw new DatabaseException('getBySession', error.message);
    }
  }

  /**
   * Obtener estadísticas de conversaciones
   */
  async getStats() {
    try {
      this.logger.debug('Calculando estadísticas de conversaciones');

      const [
        totalConversations,
        conversationsWithFeedback,
        positiveFeedback,
        negativeFeedback,
        allConversations,
      ] = await Promise.all([
        this.prisma.conversation.count(),
        this.prisma.conversation.count({
          where: { userFeedback: { not: null } },
        }),
        this.prisma.conversation.count({
          where: { userFeedback: true },
        }),
        this.prisma.conversation.count({
          where: { userFeedback: false },
        }),
        this.prisma.conversation.findMany({
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      ]);

      // Calcular total de mensajes
      const totalMessages = allConversations.length * 2; // cada conversación = 1 user + 1 bot

      // Formatear conversaciones para el frontend
      const conversations = allConversations.map((conv) => ({
        id: conv.id.toString(),
        sessionId: conv.sessionId,
        userName: conv.userName || 'Anónimo',
        messages: (() => {
          try {
            return JSON.parse(conv.messages || '[]');
          } catch {
            return [];
          }
        })(),
        timestamp: conv.timestamp,
      }));

      const result = {
        total: totalConversations,
        totalMessages: totalMessages,
        conversations: conversations,
        totalConversations,
        conversationsWithFeedback,
        positiveFeedback,
        negativeFeedback,
        feedbackRate:
          totalConversations > 0
            ? ((conversationsWithFeedback / totalConversations) * 100).toFixed(2) + '%'
            : '0%',
        satisfactionRate:
          conversationsWithFeedback > 0
            ? ((positiveFeedback / conversationsWithFeedback) * 100).toFixed(2) + '%'
            : '0%',
      };

      this.logger.log(
        `Estadísticas calculadas: ${JSON.stringify({ total: result.total, conversations: result.conversations.length })}`
      );
      return result;
    } catch (error) {
      this.logger.error(`Error al calcular estadísticas: ${error.message}`);
      throw new DatabaseException('getStats', error.message);
    }
  }
}
