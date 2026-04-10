import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async saveFeedback(feedbackDto: CreateFeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        feedback: feedbackDto.feedback,
        userMessage: feedbackDto.userMessage || null,
        botResponse: feedbackDto.botResponse || null,
        userSessionId: feedbackDto.userSession?.id || null,
        ip: feedbackDto.userSession?.ip || null,
        userName: feedbackDto.userSession?.name || null,
        timestamp: feedbackDto.timestamp ? new Date(feedbackDto.timestamp) : new Date(),
      },
    });
  }

  async getAllFeedbacks() {
    return this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFeedbackStats() {
    const total = await this.prisma.feedback.count();
    const positive = await this.prisma.feedback.count({ where: { feedback: 'positive' } });
    const negative = await this.prisma.feedback.count({ where: { feedback: 'negative' } });

    const recentFeedbacks = await this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      total,
      positive,
      negative,
      positiveRate: total > 0 ? ((positive / total) * 100).toFixed(2) + '%' : '0%',
      negativeRate: total > 0 ? ((negative / total) * 100).toFixed(2) + '%' : '0%',
      recentFeedbacks,
    };
  }

  async getNegativeFeedbacksForLearning() {
    // Obtener feedbacks negativos para analizar y mejorar
    return this.prisma.feedback.findMany({
      where: { feedback: 'negative' },
      orderBy: { createdAt: 'desc' },
    });
  }
}
