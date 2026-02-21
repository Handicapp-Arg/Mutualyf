import { Controller, Get, Post, Body, Param, UseGuards, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationGuard } from './guards/conversation.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  async create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }

  // Endpoint para obtener todas las conversaciones
  @Get('list')
  async listAll() {
    return this.conversationsService.findAll();
  }

  @Get('stats')
  async getStats() {
    return this.conversationsService.getStats();
  }

  @Get('session/:sessionId')
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.conversationsService.findBySession(sessionId);
  }

  @Get(':id')
  async findById(@Param('id') id: number) {
    return this.conversationsService.findById(id);
  }
  /**
   * Eliminar todas las conversaciones
   * DELETE /conversations
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAll() {
    return this.conversationsService.deleteAll();
  }
}
