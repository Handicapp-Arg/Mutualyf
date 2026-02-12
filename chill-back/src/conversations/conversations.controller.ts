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
}
