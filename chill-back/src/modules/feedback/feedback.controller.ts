import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackGuard } from './guards/feedback.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Controller('feedback')
@UseGuards(FeedbackGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get(':id')
  async findById(@Param('id') id: number) {
    return this.feedbackService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(dto);
  }
}
