import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { SessionsModule } from './sessions/sessions.module';
import { AppController } from './app.controller';
import { FeedbackModule } from './feedback/feedback.module';
import { AdminModule } from './admin/admin.module';
import { AiController } from './ai/ai.controller';
import { GeminiService } from './ai/gemini.service';

@Module({
  imports: [
    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate Limiting: Limita peticiones para prevenir abuso
    // Por defecto: 10 peticiones por 60 segundos por IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 segundos
        limit: 100, // 100 peticiones por minuto
      },
    ]),

    // Módulos de funcionalidad
    PrismaModule,
    UsersModule,
    ConversationsModule,
    SessionsModule,
    FeedbackModule,
    AdminModule,
  ],
  controllers: [AppController, AiController],
  providers: [
    GeminiService,
    // Aplicar rate limiting globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
