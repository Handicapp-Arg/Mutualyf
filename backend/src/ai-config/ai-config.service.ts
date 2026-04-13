import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { DEFAULT_SYSTEM_PROMPT } from '../ai/ai.constants';

export interface AiConfigData {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  updatedAt: Date;
  updatedBy: string | null;
}

@Injectable()
export class AiConfigService implements OnModuleInit {
  private cachedConfig!: AiConfigData;
  private readonly logger = new Logger(AiConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadFromDb();
    this.logger.log('AI config loaded into memory cache');
  }

  getConfig(): AiConfigData {
    return this.cachedConfig;
  }

  async updateConfig(dto: UpdateAiConfigDto, updatedBy: string): Promise<AiConfigData> {
    const updated = await this.prisma.aiConfig.update({
      where: { key: 'default' },
      data: {
        ...(dto.systemPrompt !== undefined && { systemPrompt: dto.systemPrompt }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.maxTokens !== undefined && { maxTokens: dto.maxTokens }),
        updatedBy,
      },
    });

    this.cachedConfig = {
      systemPrompt: updated.systemPrompt,
      temperature: updated.temperature,
      maxTokens: updated.maxTokens,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
    };

    this.logger.log(`AI config updated by ${updatedBy}`);
    return this.cachedConfig;
  }

  private async loadFromDb() {
    let row = await this.prisma.aiConfig.findUnique({ where: { key: 'default' } });

    if (!row) {
      row = await this.prisma.aiConfig.create({
        data: {
          key: 'default',
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 800,
        },
      });
    }

    this.cachedConfig = {
      systemPrompt: row.systemPrompt,
      temperature: row.temperature,
      maxTokens: row.maxTokens,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }
}
