import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionCode } from '../auth/constants/permissions.enum';
@Controller('ai-config')
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  /** Endpoint público: devuelve solo los quick buttons para el chat */
  @Public()
  @Get('public/quick-buttons')
  async getQuickButtons() {
    const config = this.aiConfigService.getConfig();
    try {
      return JSON.parse(config.quickButtons);
    } catch {
      return [];
    }
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Get()
  async getConfig() {
    return this.aiConfigService.getConfig();
  }

  /** Devuelve el prompt final ensamblado tal como lo recibe el LLM (sin los chunks RAG) */
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Get('preview-prompt')
  async previewPrompt() {
    const assembled = this.aiConfigService.assemblePrompt();
    const grounding = this.aiConfigService.getConfig().ragGrounding;
    const full = grounding.trim() ? `${assembled}\n\n${grounding}` : assembled;
    return { prompt: full, chars: full.length };
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Put()
  async updateConfig(@Body() dto: UpdateAiConfigDto, @Request() req: any) {
    return this.aiConfigService.updateConfig(dto, req.user.email);
  }
}
