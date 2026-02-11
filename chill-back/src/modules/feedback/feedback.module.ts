import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackRepository } from './repositories/feedback.repository';
import { FeedbackGuard } from './guards/feedback.guard';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, FeedbackRepository, FeedbackGuard],
  exports: [FeedbackService],
})
export class FeedbackModule {}
