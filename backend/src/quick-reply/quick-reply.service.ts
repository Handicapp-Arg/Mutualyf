import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

interface CachedQuickReply {
  id: number;
  keywords: string[];
  response: string;
  priority: number;
  isActive: boolean;
}

@Injectable()
export class QuickReplyService implements OnModuleInit {
  private cache: CachedQuickReply[] = [];
  private readonly logger = new Logger(QuickReplyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshCache();
    this.logger.log(`Quick replies loaded: ${this.cache.length} active entries`);
  }

  /**
   * Match a user message against cached quick replies.
   * Uses word-boundary matching to avoid false positives
   * (e.g. "hora" won't match "ahora").
   * Multi-word keywords use simple .includes() since they're
   * already specific enough.
   */
  match(message: string): string | null {
    const normalized = this.normalize(message);

    for (const entry of this.cache) {
      const matched = entry.keywords.some((kw) => {
        const normalizedKw = this.normalize(kw);
        if (normalizedKw.includes(' ')) {
          return normalized.includes(normalizedKw);
        }
        const regex = new RegExp(`\\b${normalizedKw}\\b`);
        return regex.test(normalized);
      });
      if (matched) return entry.response;
    }

    return null;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  async findAll() {
    return this.prisma.quickReply.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  async create(dto: CreateQuickReplyDto) {
    const record = await this.prisma.quickReply.create({
      data: {
        keywords: JSON.stringify(dto.keywords),
        response: dto.response,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    await this.refreshCache();
    return this.formatRecord(record);
  }

  async update(id: number, dto: UpdateQuickReplyDto) {
    await this.ensureExists(id);

    const record = await this.prisma.quickReply.update({
      where: { id },
      data: {
        ...(dto.keywords !== undefined && { keywords: JSON.stringify(dto.keywords) }),
        ...(dto.response !== undefined && { response: dto.response }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    await this.refreshCache();
    return this.formatRecord(record);
  }

  async remove(id: number) {
    await this.ensureExists(id);
    await this.prisma.quickReply.delete({ where: { id } });
    await this.refreshCache();
  }

  private async refreshCache() {
    const rows = await this.prisma.quickReply.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    this.cache = rows.map((r) => ({
      id: r.id,
      keywords: this.parseKeywords(r.keywords),
      response: r.response,
      priority: r.priority,
      isActive: r.isActive,
    }));
  }

  private parseKeywords(raw: string): string[] {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private formatRecord(record: any) {
    return {
      ...record,
      keywords: this.parseKeywords(record.keywords),
    };
  }

  private async ensureExists(id: number) {
    const exists = await this.prisma.quickReply.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException(`Quick reply #${id} not found`);
  }
}
