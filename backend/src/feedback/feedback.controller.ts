import { Controller, Post, Get, Body } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async saveFeedback(@Body() feedbackDto: CreateFeedbackDto) {
    return this.feedbackService.saveFeedback(feedbackDto);
  }

  @Get()
  async getAllFeedbacks() {
    return this.feedbackService.getAllFeedbacks();
  }

  @Get('stats')
  async getFeedbackStats() {
    return this.feedbackService.getFeedbackStats();
  }

  @Get('negative')
  async getNegativeFeedbacks() {
    return this.feedbackService.getNegativeFeedbacksForLearning();
  }
}
