import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IConversation } from '../interfaces/conversation.interface';

@Injectable()
export class ConversationRepository {
  // Almacenamiento temporal en memoria (para desarrollo)
  private conversations: any[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<any[]> {
    // Retornar conversaciones en memoria
    return this.conversations;
  }

  async findById(id: number): Promise<IConversation | null> {
    const convo = await this.prisma.conversation.findUnique({ where: { id } });
    if (!convo) return null;
    return {
      id: convo.id,
      userId: convo.userIdentityId ?? 0,
      startedAt: new Date(convo.createdAt),
      endedAt: undefined,
    };
  }

  async findBySessionId(sessionId: string): Promise<any | null> {
    // Buscar en memoria
    const conversation = this.conversations.find((conv) => conv.sessionId === sessionId);
    return conversation || null;
  }

  async create(data: any): Promise<any> {
    // Guardar en memoria
    const newConversation = {
      id: `conv_${Date.now()}`,
      sessionId: data.sessionId,
      messages: data.messages || [],
      timestamp: data.timestamp || new Date(),
    };
    this.conversations.push(newConversation);
    return newConversation;
  }

  async update(id: number, data: Partial<IConversation>): Promise<IConversation> {
    const convo = await this.prisma.conversation.update({
      where: { id },
      data: {
        userIdentityId: data.userId,
      },
    });
    return {
      id: convo.id,
      userId: convo.userIdentityId ?? 0,
      startedAt: new Date(convo.createdAt),
      endedAt: undefined,
    };
  }
}
