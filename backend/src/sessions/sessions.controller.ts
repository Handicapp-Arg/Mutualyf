import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/session.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Crear o actualizar sesión
   * POST /api/sessions
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async createOrUpdate(@Body() dto: CreateSessionDto) {
    return this.sessionsService.createOrUpdate(dto);
  }

  /**
   * Obtener sesión por ID
   * GET /api/sessions/:sessionId
   */
  @Get(':sessionId')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('sessionId') sessionId: string) {
    return this.sessionsService.findById(sessionId);
  }

  /**
   * Heartbeat ligero (chat abierto)
   * POST /api/sessions/heartbeat
   */
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Body() body: { sessionId: string; userName?: string }) {
    return this.sessionsService.heartbeat(body.sessionId, body.userName);
  }

  /**
   * Marcar sesión como cerrada (chat cerrado)
   * POST /api/sessions/end
   */
  @Post('end')
  @HttpCode(HttpStatus.OK)
  async endSession(@Body() body: { sessionId: string }) {
    return this.sessionsService.endSession(body.sessionId);
  }

  /**
   * Obtener sesiones EN VIVO (últimos 60 segundos)
   * GET /api/sessions/live/list
   */
  @Get('live/list')
  @HttpCode(HttpStatus.OK)
  async getLiveSessions() {
    return this.sessionsService.getLiveSessions();
  }

  /**
   * Obtener sesiones activas
   * GET /api/sessions/active/list
   */
  @Get('active/list')
  @HttpCode(HttpStatus.OK)
  async getActiveSessions() {
    return this.sessionsService.getActiveSessions();
  }

  /**
   * Obtener estadísticas de sesiones
   * GET /api/sessions/stats/summary
   */
  @Get('stats/summary')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return this.sessionsService.getStats();
  }
}
