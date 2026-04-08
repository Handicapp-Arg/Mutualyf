import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IFeedback } from '../interfaces/feedback.interface';

@Injectable()
export class FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<IFeedback | null> {
    const fb = await this.prisma.feedback.findUnique({ where: { id } });
    if (!fb) return null;
    return {
      id: fb.id,
      userId: 0, // No userId en el modelo
      conversationId: 0, // No conversationId en el modelo
      rating: fb.feedback === 'positive' ? 1 : 0, // Mapear string a número
      comment: fb.userMessage ?? undefined,
      createdAt: fb.createdAt,
    };
  }

  async create(data: IFeedback): Promise<IFeedback> {
    const fb = await this.prisma.feedback.create({
      data: {
        feedback: data.rating > 0 ? 'positive' : 'negative',
        userMessage: data.comment ?? '',
        // Otros campos requeridos por Prisma deben ir aquí (rellenar con valores por defecto o null)
        botResponse: '',
        userSessionId: '',
        ip: '',
        userName: '',
        createdAt: data.createdAt,
      }
    });
    return {
      id: fb.id,
      userId: 0,
      conversationId: 0,
      rating: fb.feedback === 'positive' ? 1 : 0,
      comment: fb.userMessage ?? undefined,
      createdAt: fb.createdAt,
    };
  }

  async update(id: number, data: Partial<IFeedback>): Promise<IFeedback> {
    const fb = await this.prisma.feedback.update({
      where: { id },
      data: {
        feedback: data.rating !== undefined ? (data.rating > 0 ? 'positive' : 'negative') : undefined,
        userMessage: data.comment,
        // Otros campos pueden ser actualizados aquí si es necesario
      }
    });
    return {
      id: fb.id,
      userId: 0,
      conversationId: 0,
      rating: fb.feedback === 'positive' ? 1 : 0,
      comment: fb.userMessage ?? undefined,
      createdAt: fb.createdAt,
    };
  }
}
