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
