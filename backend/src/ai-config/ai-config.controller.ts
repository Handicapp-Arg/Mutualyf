import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionCode } from '../auth/constants/permissions.enum';
import { Public } from '../auth/decorators/public.decorator';

@Controller('ai-config')
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Get()
  async getConfig() {
    return this.aiConfigService.getConfig();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Put()
  async updateConfig(@Body() dto: UpdateAiConfigDto, @Request() req: any) {
    return this.aiConfigService.updateConfig(dto, req.user.email);
  }

  @Public()
  @Get('system-prompt')
  async getSystemPrompt() {
    const config = this.aiConfigService.getConfig();
    return { systemPrompt: config.systemPrompt };
  }
}
