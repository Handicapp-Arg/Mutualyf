import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QuickReplyService } from './quick-reply.service';
import { QuickReplyController } from './quick-reply.controller';

@Module({
  imports: [PrismaModule],
  controllers: [QuickReplyController],
  providers: [QuickReplyService],
  exports: [QuickReplyService],
})
export class QuickReplyModule {}
