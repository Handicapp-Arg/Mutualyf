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
   * Crear nueva conversación
   * Valida que el mensaje no esté vacío y que el sessionId sea válido
   */
  async create(data: CreateConversationDto) {
    try {
      this.logger.debug(`Creando conversación para sessionId: ${data.sessionId}`);

      // Validación de negocio adicional
      if (data.userMessage.trim().length === 0) {
        throw new BusinessException('El mensaje del usuario no puede estar vacío');
      }

      if (data.botResponse.trim().length === 0) {
        throw new BusinessException('La respuesta del bot no puede estar vacía');
      }

      const conversation = await this.prisma.conversation.create({
        data: {
          sessionId: data.sessionId,
          userMessage: data.userMessage,
          botResponse: data.botResponse,
          timestamp: data.timestamp,
          aiModel: data.aiModel || null,
          userFeedback: data.userFeedback ?? null,
        },
      });

      this.logger.log(`Conversación creada exitosamente: ${conversation.id}`);
      return {
        message: 'Conversación guardada exitosamente',
        data: conversation,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error(`Error al crear conversación: ${error.message}`);
      throw new DatabaseException('create conversation', error.message);
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
      ]);

      const stats = {
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

      this.logger.log(`Estadísticas calculadas: ${JSON.stringify(stats)}`);
      return {
        message: 'Estadísticas obtenidas exitosamente',
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Error al calcular estadísticas: ${error.message}`);
      throw new DatabaseException('getStats', error.message);
    }
  }
}
