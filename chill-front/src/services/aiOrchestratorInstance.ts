import { AIServiceOrchestrator } from './aiOrchestrator';
import { env } from '../config/env';

// Instancia singleton para toda la app
export const orchestrator = new AIServiceOrchestrator({
  systemInstruction: '', // Puedes personalizar el prompt base aquí
});

export default orchestrator;
