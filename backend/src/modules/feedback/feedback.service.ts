import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { FeedbackRepository } from './repositories/feedback.repository';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly feedbackRepository: FeedbackRepository) {}

  async findById(id: number) {
    try {
      const feedback = await this.feedbackRepository.findById(id);
      if (!feedback) {
        throw new NotFoundException('Feedback not found');
      }
      return feedback;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching feedback');
    }
  }

  async create(dto: CreateFeedbackDto) {
    try {
      return await this.feedbackRepository.create(dto as any);
    } catch (error) {
      throw new BadRequestException('Error creating feedback');
    }
  }

  async update(id: number, dto: UpdateFeedbackDto) {
    try {
      return await this.feedbackRepository.update(id, dto as any);
    } catch (error) {
      throw new BadRequestException('Error updating feedback');
    }
  }
}
