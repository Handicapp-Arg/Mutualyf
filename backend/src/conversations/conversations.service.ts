import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/conversation.dto';
import {
  ResourceNotFoundException,
  DatabaseException,
  BusinessException,
} from '../common/exceptions/business.exception';
import { EventsGateway } from '../events/events.gateway';
import { unlink } from 'fs/promises';
import { CloudinaryService } from '../common/cloudinary.service';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private cloudinary: CloudinaryService,
  ) {}

  /**
   * Formatea una conversación de la DB al shape que consume el frontend admin.
   */
  private formatConversation(conv: any) {
    return {
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
    };
  }

  async deleteAll() {
    try {
      await this.prisma.conversation.deleteMany({});
      return { success: true, message: 'Todas las conversaciones han sido eliminadas.' };
    } catch (error) {
      return { success: false, message: 'Error al eliminar conversaciones.' };
    }
  }

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
        data: sessions.map((s) => s.sessionId),
        count: sessions.length,
      };
    } catch (error) {
      this.logger.error(`Error al obtener sesiones: ${error.message}`);
      throw new DatabaseException('getAllSessions', error.message);
    }
  }

  /**
   * Crear o actualizar conversación EN VIVO (upsert por sessionId).
   * Se llama después de cada mensaje del usuario y de cada respuesta del bot,
   * así que la fila va creciendo a medida que la charla avanza.
   */
  async create(data: CreateConversationDto) {
    try {
      this.logger.debug(`Upsert conversación para sessionId: ${data.sessionId}`);
      this.logger.debug(`Total mensajes recibidos: ${data.messages?.length || 0}`);

      if (!data.messages || data.messages.length === 0) {
        throw new BusinessException('La conversación debe tener al menos un mensaje');
      }

      // Último mensaje del usuario y última respuesta del bot (pueden estar vacíos
      // en estados intermedios, ej. justo después de enviar antes de que el bot responda)
      const userMessages = data.messages.filter((m) => m.role === 'user');
      const assistantMessages = data.messages.filter((m) => m.role === 'assistant');
      const userMessage = userMessages[userMessages.length - 1]?.content || '';
      const botResponse = assistantMessages[assistantMessages.length - 1]?.content || '';

      const timestamp = data.timestamp || new Date().toISOString();
      const messagesJson = JSON.stringify(data.messages);

      const conversation = await this.prisma.conversation.upsert({
        where: { sessionId: data.sessionId },
        create: {
          sessionId: data.sessionId,
          userName: data.userName || null,
          userMessage,
          botResponse,
          messages: messagesJson,
          timestamp,
          aiModel: data.aiModel || null,
        },
        update: {
          // Solo sobreescribir userName si llega uno nuevo no vacío
          ...(data.userName ? { userName: data.userName } : {}),
          userMessage,
          botResponse,
          messages: messagesJson,
          timestamp,
          ...(data.aiModel ? { aiModel: data.aiModel } : {}),
        },
      });

      this.logger.log(
        `Conversación upsert OK (${data.messages.length} mensajes, ID: ${conversation.id})`
      );

      // Emitir evento en tiempo real al panel admin
      this.events.emitConversationUpserted(this.formatConversation(conversation));

      // Verificar si la sesión está controlada por admin
      const session = await this.prisma.userSession.findUnique({
        where: { sessionId: data.sessionId },
        select: { adminControlled: true },
      });

      return {
        id: conversation.id,
        message: 'Conversación guardada exitosamente',
        data: conversation,
        adminTakeover: session?.adminControlled ?? false,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error(`Error al guardar conversación: ${error.message}`);
      throw new DatabaseException('guardar conversation', error.message);
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

      const [totalConversations, allConversations] = await Promise.all([
        this.prisma.conversation.count(),
        this.prisma.conversation.findMany({
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      ]);

      // Calcular total de mensajes
      const totalMessages = allConversations.length * 2; // cada conversación = 1 user + 1 bot

      // Formatear conversaciones para el frontend
      const conversations = allConversations.map((conv) => this.formatConversation(conv));

      const result = {
        total: totalConversations,
        totalMessages: totalMessages,
        conversations: conversations,
        totalConversations,
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

  /**
   * Verificar si una sesión está controlada por el admin.
   */
  async isAdminControlled(sessionId: string): Promise<boolean> {
    const session = await this.prisma.userSession.findUnique({
      where: { sessionId },
      select: { adminControlled: true },
    });
    return session?.adminControlled ?? false;
  }

  /**
   * Activar/desactivar control de admin sobre una sesión.
   * Persiste en DB para sobrevivir reinicios del servidor.
   */
  async adminTakeover(sessionId: string, active: boolean) {
    await this.prisma.userSession.updateMany({
      where: { sessionId },
      data: { adminControlled: active },
    });

    if (active) {
      this.logger.log(`Admin took control of session: ${sessionId}`);
    } else {
      this.logger.log(`Admin released session: ${sessionId}`);
    }

    this.events.emitAdminTakeover(sessionId, active);
    return { success: true, sessionId, adminActive: active };
  }

  // ==========================================
  // Chat Attachments
  // ==========================================

  /**
   * Guardar un archivo adjunto y devolver su metadata.
   */
  async createAttachment(
    file: Express.Multer.File,
    sessionId: string,
    uploadedBy: 'user' | 'admin' = 'user',
    description?: string,
  ) {
    try {
      const cleanDescription = description?.trim().slice(0, 500) || null;

      // Subir a Cloudinary
      const { url } = await this.cloudinary.uploadBuffer(
        file.buffer,
        'mutualyf/chat-attachments',
        file.originalname,
      );

      const attachment = await this.prisma.chatAttachment.create({
        data: {
          sessionId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          filePath: url,
          uploadedBy,
          description: cleanDescription,
        },
      });

      this.logger.log(
        `Attachment creado: ${attachment.id} (${file.originalname}) para sesión ${sessionId}`,
      );

      return {
        id: attachment.id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        description: attachment.description,
      };
    } catch (error) {
      // Limpiar archivo si falla el registro en DB
      try { await unlink(file.path); } catch {}
      this.logger.error(`Error creando attachment: ${error.message}`);
      throw new DatabaseException('createAttachment', error.message);
    }
  }

  /**
   * Listado de attachments para el panel admin (más reciente primero).
   */
  async listAttachments(limit = 100) {
    const rows = await this.prisma.chatAttachment.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      fileName: r.fileName,
      fileType: r.fileType,
      fileSize: r.fileSize,
      description: r.description,
      uploadedBy: r.uploadedBy,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Obtener un attachment por ID (para servir el archivo).
   */
  async getAttachmentById(id: number) {
    const attachment = await this.prisma.chatAttachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      throw new ResourceNotFoundException('ChatAttachment', id);
    }
    return attachment;
  }

  /**
   * Subir archivo como admin y emitir mensaje con attachment al usuario.
   */
  async sendAdminAttachment(
    file: Express.Multer.File,
    sessionId: string,
    caption?: string,
  ) {
    const attachment = await this.createAttachment(file, sessionId, 'admin');

    const now = new Date().toISOString();
    const attachmentPayload = {
      id: attachment.id,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
    };

    const adminMessage = {
      role: 'assistant',
      content: caption || '',
      timestamp: now,
      attachment: attachmentPayload,
    };

    // Guardar en la conversación
    const existing = await this.prisma.conversation.findUnique({
      where: { sessionId },
    });

    let messages: any[] = [];
    if (existing) {
      try { messages = JSON.parse(existing.messages || '[]'); } catch { messages = []; }
    }

    messages.push(adminMessage);
    const messagesJson = JSON.stringify(messages);

    const conversation = await this.prisma.conversation.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userMessage: '',
        botResponse: caption || `[Archivo: ${attachment.fileName}]`,
        messages: messagesJson,
        timestamp: now,
      },
      update: {
        botResponse: caption || `[Archivo: ${attachment.fileName}]`,
        messages: messagesJson,
        timestamp: now,
      },
    });

    // Emitir al usuario vía socket
    this.events.emitAdminMessage(sessionId, adminMessage as any);
    this.events.emitConversationUpserted(this.formatConversation(conversation));

    this.logger.log(`Admin envió archivo a sesión: ${sessionId}`);
    return { success: true, message: adminMessage, attachment: attachmentPayload };
  }

  /**
   * Enviar un mensaje del admin a una sesión y guardarlo en la conversación.
   */
  async sendAdminMessage(sessionId: string, content: string) {
    try {
      const now = new Date().toISOString();
      const adminMessage = { role: 'assistant', content, timestamp: now };

      // Buscar la conversación existente
      const existing = await this.prisma.conversation.findUnique({
        where: { sessionId },
      });

      let messages: any[] = [];
      if (existing) {
        try {
          messages = JSON.parse(existing.messages || '[]');
        } catch {
          messages = [];
        }
      }

      // Agregar el mensaje del admin
      messages.push(adminMessage);
      const messagesJson = JSON.stringify(messages);

      // Upsert conversación
      const conversation = await this.prisma.conversation.upsert({
        where: { sessionId },
        create: {
          sessionId,
          userMessage: '',
          botResponse: content,
          messages: messagesJson,
          timestamp: now,
        },
        update: {
          botResponse: content,
          messages: messagesJson,
          timestamp: now,
        },
      });

      // Emitir el mensaje al usuario vía socket
      this.events.emitAdminMessage(sessionId, adminMessage);

      // Emitir conversación actualizada al panel admin
      this.events.emitConversationUpserted(this.formatConversation(conversation));

      this.logger.log(`Admin envió mensaje a sesión: ${sessionId}`);
      return { success: true, message: adminMessage };
    } catch (error) {
      this.logger.error(`Error al enviar mensaje de admin: ${error.message}`);
      throw new DatabaseException('sendAdminMessage', error.message);
    }
  }
}
