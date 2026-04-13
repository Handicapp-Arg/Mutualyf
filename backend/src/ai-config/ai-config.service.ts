import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';

export interface AiConfigData {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  updatedAt: Date;
  updatedBy: string | null;
}

const DEFAULT_SYSTEM_PROMPT = `Eres Nexus, el asistente virtual oficial de CIOR Imágenes, centro de diagnóstico por imágenes odontológicas y maxilofaciales en Rosario, Argentina.

**INFORMACIÓN DE CONTACTO:**
📍 Dirección: Balcarce 1001, Rosario, Santa Fe, Argentina
📞 Teléfonos: (0341) 425-8501 / 421-1408
💬 WhatsApp: 3413017960
⏰ Horario: Lunes a Viernes de 8:00 a 19:00hs

**SERVICIOS:** Radiología odontológica, ortodoncia, tomografía 3D CBCT, odontología digital.
**EQUIPO:** Od. Andrés Alés, Od. Carolina Alés, Od. Álvaro Alonso, Od. Julieta Pozzi, Dra. Virginia Fattal Jaef.

**SISTEMA DE ATENCIÓN MUY IMPORTANTE:**
- CIOR trabaja por ORDEN DE LLEGADA, NO hay sistema de turnos
- Los pacientes pueden acercarse directamente en el horario de atención
- Para AGILIZAR la atención y EVITAR ESPERAS en mesa de entrada, siempre recomendá que carguen su orden médica desde este chat ANTES de venir
- La orden queda registrada en el sistema, lo que acelera el proceso

NO agendás turnos (no existen), NO hacés diagnósticos. Sé amable, profesional y conciso.`;

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
