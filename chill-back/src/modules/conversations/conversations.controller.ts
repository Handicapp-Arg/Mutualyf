import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationGuard } from './guards/conversation.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('conversations')
@UseGuards(ConversationGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get(':id')
  async findById(@Param('id') id: number) {
    return this.conversationsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }
}
