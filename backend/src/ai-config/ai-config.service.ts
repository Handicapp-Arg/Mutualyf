import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { BASE_SYSTEM_PROMPT } from '../ai/ai.constants';

export interface AiConfigData {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  quickButtons: string;
  updatedAt: Date;
  updatedBy: string | null;
}

@Injectable()
export class AiConfigService implements OnModuleInit {
  private cachedConfig!: AiConfigData;
  private readonly logger = new Logger(AiConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.loadFromDb();
      this.logger.log('AI config loaded into memory cache');
    } catch (error) {
      this.logger.warn(
        'Could not load AI config from DB, using defaults. Run prisma migrate deploy to create the table.',
      );
      this.cachedConfig = {
        systemPrompt: BASE_SYSTEM_PROMPT,
        temperature: 0.7,
        maxTokens: 800,
        quickButtons: '[]',
        updatedAt: new Date(),
        updatedBy: null,
      };
    }
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
        ...(dto.quickButtons !== undefined && { quickButtons: dto.quickButtons }),
        updatedBy,
      },
    });

    this.cachedConfig = {
      systemPrompt: updated.systemPrompt,
      temperature: updated.temperature,
      maxTokens: updated.maxTokens,
      quickButtons: updated.quickButtons,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
    };

    this.logger.log(`AI config updated by ${updatedBy}`);
    return this.cachedConfig;
  }

  private async loadFromDb() {
    let row = await this.prisma.aiConfig.findUnique({ where: { key: 'default' } });

    if (!row) {
      // Primera vez: sembrar fila con valores iniciales. El admin los edita después.
      row = await this.prisma.aiConfig.create({
        data: {
          key: 'default',
          systemPrompt: BASE_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 800,
          quickButtons: '[]',
        },
      });
      this.logger.log('AiConfig row created with initial values');
    }

    this.cachedConfig = {
      systemPrompt: row.systemPrompt,
      temperature: row.temperature,
      maxTokens: row.maxTokens,
      quickButtons: row.quickButtons,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }
}
