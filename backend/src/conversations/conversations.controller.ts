
import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  UpdateConversationFeedbackDto,
} from './dto/conversation.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionCode } from '../auth/constants/permissions.enum';

@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.CONVERSATIONS_READ)
  @Get('sessions')
  async getAllSessions() {
    return this.conversationsService.getAllSessions();
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateConversationDto) {
    return this.conversationsService.create(dto);
  }

  @Public()
  @Put('feedback')
  @HttpCode(HttpStatus.OK)
  async updateFeedback(@Body() dto: UpdateConversationFeedbackDto) {
    return this.conversationsService.updateFeedback(dto);
  }

  @Public()
  @Get('session/:sessionId')
  @HttpCode(HttpStatus.OK)
  async getBySession(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.conversationsService.getBySession(sessionId, limitNum);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.CONVERSATIONS_READ)
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.conversationsService.getStats();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.CONVERSATIONS_DELETE)
  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteAll() {
    return this.conversationsService.deleteAll();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.CONVERSATIONS_TAKEOVER)
  @Post('admin-takeover')
  @HttpCode(HttpStatus.OK)
  async adminTakeover(@Body() body: { sessionId: string; active: boolean }) {
    return this.conversationsService.adminTakeover(body.sessionId, body.active);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.CONVERSATIONS_TAKEOVER)
  @Post('admin-message')
  @HttpCode(HttpStatus.OK)
  async adminMessage(@Body() body: { sessionId: string; content: string }) {
    return this.conversationsService.sendAdminMessage(body.sessionId, body.content);
  }

  @Public()
  @Get('admin-status/:sessionId')
  @HttpCode(HttpStatus.OK)
  async adminStatus(@Param('sessionId') sessionId: string) {
    return { adminTakeover: await this.conversationsService.isAdminControlled(sessionId) };
  }
}
