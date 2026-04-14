import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/session.dto';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionCode } from '../auth/constants/permissions.enum';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async createOrUpdate(@Body() dto: CreateSessionDto) {
    return this.sessionsService.createOrUpdate(dto);
  }

  @Public()
  @Get(':sessionId')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('sessionId') sessionId: string) {
    return this.sessionsService.findById(sessionId);
  }

  /** @deprecated Preferir heartbeat por WebSocket (PresenceGateway). */
  @Public()
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() body: { sessionId: string; userName?: string }) {
    return this.sessionsService.heartbeat(body.sessionId, body.userName);
  }

  @Public()
  @Post('end')
  @HttpCode(HttpStatus.OK)
  async endSession(@Body() body: { sessionId: string }) {
    return this.sessionsService.endSession(body.sessionId);
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.SESSIONS_LIVE)
  @Get('live/list')
  @HttpCode(HttpStatus.OK)
  async getLiveSessions() {
    return this.sessionsService.getLiveSessions();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.SESSIONS_READ)
  @Get('active/list')
  @HttpCode(HttpStatus.OK)
  async getActiveSessions() {
    return this.sessionsService.getActiveSessions();
  }

  @UseGuards(PermissionsGuard)
  @RequirePermissions(PermissionCode.SESSIONS_READ)
  @Get('stats/summary')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.sessionsService.getStats();
  }
}
