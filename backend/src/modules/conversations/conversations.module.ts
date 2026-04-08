import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationRepository } from './repositories/conversation.repository';
import { ConversationGuard } from './guards/conversation.guard';

@Module({
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationRepository, ConversationGuard],
  exports: [ConversationsService],
})
export class ConversationsModule {}
