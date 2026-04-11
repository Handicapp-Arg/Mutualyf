import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionCode } from '../auth/constants/permissions.enum';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Public()
  @Post()
  async saveFeedback(@Body() feedbackDto: CreateFeedbackDto) {
    return this.feedbackService.saveFeedback(feedbackDto);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.FEEDBACK_READ)
  @Get()
  async getAllFeedbacks() {
    return this.feedbackService.getAllFeedbacks();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.FEEDBACK_READ)
  @Get('stats')
  async getFeedbackStats() {
    return this.feedbackService.getFeedbackStats();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.FEEDBACK_READ)
  @Get('negative')
  async getNegativeFeedbacks() {
    return this.feedbackService.getNegativeFeedbacksForLearning();
  }
}
