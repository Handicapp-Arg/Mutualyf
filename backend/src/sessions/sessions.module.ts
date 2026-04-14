import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PresenceGateway } from './presence.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SessionsController],
  providers: [SessionsService, PresenceGateway],
})
export class SessionsModule {}
