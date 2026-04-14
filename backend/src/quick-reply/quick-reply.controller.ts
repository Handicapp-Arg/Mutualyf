import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { QuickReplyService } from './quick-reply.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionCode } from '../auth/constants/permissions.enum';

@UseGuards(PermissionsGuard)
@Controller('quick-replies')
export class QuickReplyController {
  constructor(private readonly quickReplyService: QuickReplyService) {}

  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Get()
  async findAll() {
    const rows = await this.quickReplyService.findAll();
    return rows.map((r: any) => ({
      ...r,
      keywords: typeof r.keywords === 'string' ? JSON.parse(r.keywords) : r.keywords,
    }));
  }

  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Post()
  async create(@Body() dto: CreateQuickReplyDto) {
    return this.quickReplyService.create(dto);
  }

  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateQuickReplyDto) {
    return this.quickReplyService.update(id, dto);
  }

  @RequirePermissions(PermissionCode.AI_CONFIG_MANAGE)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.quickReplyService.remove(id);
    return { deleted: true };
  }
}
