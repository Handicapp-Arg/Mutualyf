import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IConversation } from '../interfaces/conversation.interface';

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<IConversation | null> {
    const convo = await this.prisma.conversation.findUnique({ where: { id } });
    if (!convo) return null;
    return {
      id: convo.id,
      userId: convo.userIdentityId ?? 0,
      startedAt: new Date(convo.createdAt),
      endedAt: undefined // No endedAt in schema
    };
  }

  async create(data: IConversation): Promise<IConversation> {
    const convo = await this.prisma.conversation.create({
      data: {
        userIdentityId: data.userId,
        createdAt: data.startedAt,
        // Otros campos requeridos por Prisma deben ir aquí (rellenar con valores por defecto o null)
        sessionId: '',
        userMessage: '',
        botResponse: '',
        timestamp: '',
      }
    });
    return {
      id: convo.id,
      userId: convo.userIdentityId ?? 0,
      startedAt: new Date(convo.createdAt),
      endedAt: undefined
    };
  }

  async update(id: number, data: Partial<IConversation>): Promise<IConversation> {
    const convo = await this.prisma.conversation.update({
      where: { id },
      data: {
        userIdentityId: data.userId,
        // No endedAt en el modelo, solo actualizamos lo que existe
      }
    });
    return {
      id: convo.id,
      userId: convo.userIdentityId ?? 0,
      startedAt: new Date(convo.createdAt),
      endedAt: undefined
    };
  }
}
