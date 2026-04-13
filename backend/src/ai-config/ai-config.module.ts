import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiConfigService } from './ai-config.service';
import { AiConfigController } from './ai-config.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AiConfigController],
  providers: [AiConfigService],
  exports: [AiConfigService],
})
export class AiConfigModule {}
