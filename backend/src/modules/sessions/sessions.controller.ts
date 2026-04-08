import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionGuard } from './guards/session.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Controller('sessions')
@UseGuards(SessionGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get(':token')
  async findByToken(@Param('token') token: string) {
    return this.sessionsService.findByToken(token);
  }

  @Post()
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.create(dto);
  }
}
