import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { SessionsModule } from './sessions/sessions.module';
import { AppController } from './app.controller';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AiController } from './ai/ai.controller';
import { GeminiService } from './ai/gemini.service';
import { OllamaService } from './ai/ollama.service';
import { EventsModule } from './events/events.module';
import { validateEnv } from './config/validation';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { RolesModule } from './roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Autenticación y RBAC
    AuthModule,
    AdminUsersModule,
    RolesModule,

    // Módulos de funcionalidad
    EventsModule,
    PrismaModule,
    UsersModule,
    ConversationsModule,
    SessionsModule,
    UploadsModule,
  ],
  controllers: [AppController, AiController],
  providers: [
    GeminiService,
    OllamaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
