import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionRepository } from './repositories/session.repository';
import { SessionGuard } from './guards/session.guard';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SessionRepository, SessionGuard],
  exports: [SessionsService],
})
export class SessionsModule {}
