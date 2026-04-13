import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AiConfigService } from './ai-config.service';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionCode } from '../auth/constants/permissions.enum';

@UseGuards(PermissionsGuard)
@Controller('ai-config')
export class AiConfigController {
  constructor(private readonly aiConfigService: AiConfigService) {}

  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Get()
  async getConfig() {
    return this.aiConfigService.getConfig();
  }

  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Put()
  async updateConfig(@Body() dto: UpdateAiConfigDto, @Request() req: any) {
    return this.aiConfigService.updateConfig(dto, req.user.email);
  }
}
