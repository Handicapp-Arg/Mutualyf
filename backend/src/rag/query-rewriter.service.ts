import { Injectable, Logger } from '@nestjs/common';
import { GroqService } from '../ai/groq.service';
import { ChatMsg } from './rag.types';
import { RouterService } from './router.service';
import { RagConfig } from './rag.config';

@Injectable()
export class QueryRewriterService {
  private readonly logger = new Logger(QueryRewriterService.name);

  constructor(
    private readonly groq: GroqService,
    private readonly router: RouterService,
    private readonly cfg: RagConfig,
  ) {}

  async rewrite(history: ChatMsg[], msg: string): Promise<string> {
    if (!this.cfg.enableRewriter) return msg;
    if (!this.router.needsRewrite(msg, history.length > 0)) return msg;

    const last = history.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `Reescribí el mensaje del usuario como pregunta STANDALONE (sin contexto, clara, <= 20 palabras). Devolvé SOLO la pregunta, sin comillas ni explicación.

HISTORIAL:
${last}

MENSAJE: ${msg}

PREGUNTA STANDALONE:`;

    try {
      const res = await Promise.race([
        this.groq.generateResponse([], prompt, 'Sos un reescritor de consultas. Respondé solo con la pregunta reescrita.', 0.1, 60),
        new Promise<string>((_, rej) => setTimeout(() => rej(new Error('rewrite-timeout')), this.cfg.rewriterTimeoutMs)),
      ]);
      const cleaned = (res || '')
        .trim()
        .replace(/^["'`]+|["'`]+$/g, '')
        .split('\n')[0]
        .slice(0, 200);
      if (cleaned) return cleaned;
      return this.heuristicRewrite(history, msg);
    } catch (e) {
      this.logger.debug(`rewrite llm failed (${(e as Error).message}), using heuristic`);
      return this.heuristicRewrite(history, msg);
    }
  }

  /**
   * Fallback sin LLM: concatena los últimos turnos del historial con el mensaje.
   * No es tan bueno como una reescritura real, pero le da al retrieval el
   * contexto necesario para encontrar chunks relevantes en follow-ups cortos.
   */
  private heuristicRewrite(history: ChatMsg[], msg: string): string {
    const lastUser = [...history].reverse().find(m => m.role === 'user');
    if (!lastUser) return msg;
    return `${lastUser.content} ${msg}`.slice(0, 300);
  }
}
