import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';

export interface AiConfigFields {
  botName: string;
  orgName: string;
  contactPhone: string;
  tone: string;
  specialtyMapping: string;
  customRules: string;
  temperature: number;
  maxTokens: number;
  quickButtons: string;
  updatedAt: Date;
  updatedBy: string | null;
}

@Injectable()
export class AiConfigService implements OnModuleInit {
  private cachedConfig!: AiConfigFields;
  private readonly logger = new Logger(AiConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadFromDb();
    this.logger.log('AI config loaded into memory cache');
  }

  getConfig(): AiConfigFields {
    return this.cachedConfig;
  }

  /**
   * Ensambla el system prompt a partir de los campos estructurados.
   * El grounding RAG se agrega en RagService — acá solo va la identidad y reglas de negocio.
   */
  assemblePrompt(): string {
    const c = this.cachedConfig;
    const parts: string[] = [];

    parts.push(`Sos ${c.botName}, el asistente virtual de ${c.orgName}.`);

    if (c.tone.trim()) {
      parts.push(`\nTONO: ${c.tone.trim()}`);
    }

    if (c.contactPhone.trim()) {
      parts.push(
        `\nTELÉFONO DE CONTACTO: ${c.contactPhone.trim()} — usalo solo para urgencias médicas evidentes o gestiones complejas que requieran una persona. No lo uses como escape ante preguntas que no tenés en el contexto.`,
      );
    }

    if (c.specialtyMapping.trim()) {
      parts.push(`\nMAPEO DE SÍNTOMAS A ESPECIALIDADES:\n${c.specialtyMapping.trim()}`);
    }

    if (c.customRules.trim()) {
      parts.push(`\nREGLAS ADICIONALES:\n${c.customRules.trim()}`);
    }

    return parts.join('\n');
  }

  async updateConfig(dto: UpdateAiConfigDto, updatedBy: string): Promise<AiConfigFields> {
    const updated = await this.prisma.aiConfig.update({
      where: { key: 'default' },
      data: {
        ...(dto.botName !== undefined && { botName: dto.botName }),
        ...(dto.orgName !== undefined && { orgName: dto.orgName }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
        ...(dto.tone !== undefined && { tone: dto.tone }),
        ...(dto.specialtyMapping !== undefined && { specialtyMapping: dto.specialtyMapping }),
        ...(dto.customRules !== undefined && { customRules: dto.customRules }),
        ...(dto.temperature !== undefined && { temperature: dto.temperature }),
        ...(dto.maxTokens !== undefined && { maxTokens: dto.maxTokens }),
        ...(dto.quickButtons !== undefined && { quickButtons: dto.quickButtons }),
        updatedBy,
      },
    });

    this.cachedConfig = this.mapRow(updated);
    this.logger.log(`AI config updated by ${updatedBy}`);
    return this.cachedConfig;
  }

  private async loadFromDb() {
    let row = await this.prisma.aiConfig.findUnique({ where: { key: 'default' } });

    if (!row) {
      row = await this.prisma.aiConfig.create({
        data: {
          key: 'default',
          botName: 'MutuaBot',
          orgName: 'MutuaLyF (Mutual Provincial de Luz y Fuerza de Santa Fe), mutual de salud del sindicato Luz y Fuerza, creada en 1999',
          contactPhone: '0800 777 4413',
          tone: 'Español rioplatense, cálido, natural, conversacional. Respuestas cortas (2-4 oraciones salvo que el tema pida detalle). Sin muletillas robóticas ni emojis salvo que ayuden.',
          specialtyMapping: [
            '- Dolor de pecho, palpitaciones, presión alta → CARDIOLOGÍA',
            '- Rodilla, cadera, espalda, columna, fracturas → TRAUMATOLOGÍA',
            '- Ansiedad, depresión, tristeza, pánico → PSICOLOGÍA / PSIQUIATRÍA',
            '- Vista, visión borrosa → OFTALMOLOGÍA',
            '- Oído, garganta, nariz → OTORRINOLARINGOLOGÍA',
            '- Piel, hongos, manchas → DERMATOLOGÍA',
            '- Fiebre, malestar general, control → CLÍNICA MÉDICA',
            '- Embarazo, ginecología → OBSTETRICIA / GINECOLOGÍA',
            '- Caries, dolor de muela → ODONTOLOGÍA',
            '- Dificultad para respirar, asma → NEUMOLOGÍA',
            '- Tiroides, diabetes → ENDOCRINOLOGÍA',
            '- Niños, vacunas → PEDIATRÍA',
          ].join('\n'),
          customRules: [
            '- No agendás turnos directamente — indicá la vía concreta (app MiMutuaLyF o el canal que aparezca en el contexto).',
            '- Las recetas y órdenes médicas son exclusivamente digitales.',
          ].join('\n'),
          temperature: 0.7,
          maxTokens: 800,
        },
      });
      this.logger.log('AiConfig row created with values iniciales');
    }

    this.cachedConfig = this.mapRow(row);
  }

  private mapRow(row: any): AiConfigFields {
    return {
      botName: row.botName,
      orgName: row.orgName,
      contactPhone: row.contactPhone,
      tone: row.tone,
      specialtyMapping: row.specialtyMapping,
      customRules: row.customRules,
      temperature: row.temperature,
      maxTokens: row.maxTokens,
      quickButtons: row.quickButtons,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }
}
