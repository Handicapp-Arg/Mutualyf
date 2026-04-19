import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import { existsSync } from 'fs';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/conversation.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionCode } from '../auth/constants/permissions.enum';

const CHAT_FILE_LIMITS = {
  fileSize: 10 * 1024 * 1024, // 10MB
};

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

  // ==========================================
  // Chat Attachments
  // ==========================================

  /**
   * Subir archivo adjunto desde el chat del usuario (público).
   */
  @Public()
  @Post('attachment')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: CHAT_FILE_LIMITS }),
  )
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') sessionId: string,
    @Body('description') description?: string,
  ) {
    return this.conversationsService.createAttachment(file, sessionId, 'user', description);
  }

  /**
   * Listar todos los attachments para el panel admin.
   */
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.CONVERSATIONS_READ)
  @Get('attachments')
  async listAttachments(@Query('limit') limit?: string) {
    const limitNum = limit ? Math.min(parseInt(limit, 10) || 100, 500) : 100;
    return this.conversationsService.listAttachments(limitNum);
  }

  /**
   * Subir archivo adjunto desde el admin y emitirlo al usuario vía socket.
   */
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.CONVERSATIONS_TAKEOVER)
  @Post('admin-attachment')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: CHAT_FILE_LIMITS }),
  )
  async uploadAdminAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body('sessionId') sessionId: string,
    @Body('caption') caption?: string,
  ) {
    return this.conversationsService.sendAdminAttachment(file, sessionId, caption);
  }

  /**
   * Servir un archivo adjunto por ID.
   */
  @Public()
  @Get('attachment/:id')
  async serveAttachment(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.conversationsService.getAttachmentById(parseInt(id));

    // Cloudinary URL → redirect
    if (attachment.filePath.startsWith('http')) {
      return res.redirect(attachment.filePath);
    }

    // Compatibilidad con archivos locales viejos
    const absolutePath = join(process.cwd(), attachment.filePath);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    res.setHeader('Content-Type', attachment.fileType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    return res.sendFile(absolutePath);
  }
}
