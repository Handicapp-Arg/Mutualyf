import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Seguridad: Helmet para headers HTTP seguros
    app.use(helmet());

    // CORS configurado de forma segura
    app.enableCors({
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',') || []
          : ['http://localhost:5173', 'http://localhost:3002', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Validación automática de DTOs
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Elimina propiedades no definidas en DTO
        forbidNonWhitelisted: true, // Lanza error si hay propiedades extra
        transform: true, // Transforma los payloads a instancias de DTO
        transformOptions: {
          enableImplicitConversion: true,
        },
        disableErrorMessages: process.env.NODE_ENV === 'production',
      }),
    );

    // Manejo centralizado de excepciones
    app.useGlobalFilters(new AllExceptionsFilter());

    // Interceptores globales
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    // Prefijo global para todas las rutas (excepto favicon)
    app.setGlobalPrefix('api', {
      exclude: ['favicon.ico'],
    });

    const port = process.env.PORT || 3001;
    await app.listen(port);

    logger.log(`Backend ejecutándose en http://localhost:${port}`);
    logger.log(`API disponible en http://localhost:${port}/api`);
    logger.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  } catch (error) {
    logger.error('Error al iniciar la aplicación:', error);
    process.exit(1);
  }
}

bootstrap();
