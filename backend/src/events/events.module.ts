import { Global, Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

/**
 * Módulo global de eventos en tiempo real (WebSockets).
 * Se marca como @Global() para que cualquier servicio pueda inyectar
 * EventsGateway sin tener que importar este módulo en cada feature.
 */
@Global()
@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
