
import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Delete
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  UpdateConversationFeedbackDto,
} from './dto/conversation.dto';
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) {}

  /**
   * Obtener todos los sessionId únicos
   * GET /api/conversations/sessions
   */
  @Get('sessions')
  async getAllSessions() {
    return this.conversationsService.getAllSessions();
  }

  /**
   * Crear nueva conversación
   * POST /api/conversations
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }

  /**
   * Actualizar feedback de conversación
   * PUT /api/conversations/feedback
   */
  @Put('feedback')
  @HttpCode(HttpStatus.OK)
  async updateFeedback(@Body() dto: UpdateConversationFeedbackDto) {
    return this.conversationsService.updateFeedback(dto);
  }

  /**
   * Obtener conversaciones por sessionId
   * GET /api/conversations/session/:sessionId
   */
  @Get('session/:sessionId')
  @HttpCode(HttpStatus.OK)
  async getBySession(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.conversationsService.getBySession(sessionId, limitNum);
  }

  /**
   * Obtener estadísticas de conversaciones
   * GET /api/conversations/stats
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.conversationsService.getStats();
  }
  /**
   * Eliminar todas las conversaciones
   * DELETE /api/conversations
   */
  /**
   * Eliminar todas las conversaciones
   * DELETE /api/conversations
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAll() {
    return this.conversationsService.deleteAll();
  }

  /**
   * Activar/desactivar control de admin sobre una sesión
   * POST /api/conversations/admin-takeover
   */
  @Post('admin-takeover')
  @HttpCode(HttpStatus.OK)
  async adminTakeover(@Body() body: { sessionId: string; active: boolean }) {
    return this.conversationsService.adminTakeover(body.sessionId, body.active);
  }

  /**
   * Enviar mensaje del admin a una sesión
   * POST /api/conversations/admin-message
   */
  @Post('admin-message')
  @HttpCode(HttpStatus.OK)
  async adminMessage(@Body() body: { sessionId: string; content: string }) {
    return this.conversationsService.sendAdminMessage(body.sessionId, body.content);
  }

  /**
   * Verificar si una sesión está controlada por el admin
   * GET /api/conversations/admin-status/:sessionId
   */
  @Get('admin-status/:sessionId')
  @HttpCode(HttpStatus.OK)
  async adminStatus(@Param('sessionId') sessionId: string) {
    return { adminTakeover: this.conversationsService.isAdminControlled(sessionId) };
  }
}
