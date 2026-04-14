import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      this.logger.error('Error al conectar con la base de datos:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Desconexión de base de datos exitosa');
    } catch (error) {
      this.logger.error('Error al desconectar de la base de datos:', error);
    }
  }

  /**
   * Método helper para realizar operaciones con manejo de errores
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 3,
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Intento ${i + 1}/${retries} falló. Reintentando...`,
        );
        
        // Esperar antes de reintentar (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    this.logger.error('Todos los intentos fallaron');
    throw lastError;
  }
}
