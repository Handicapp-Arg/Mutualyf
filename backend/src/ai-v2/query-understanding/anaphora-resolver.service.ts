import { Injectable, Logger } from '@nestjs/common';
import { LlmOrchestrator } from '../llm/llm-orchestrator.service';
import { ChatMessage } from '../llm/llm.interface';

@Injectable()
export class AnaphoraResolverService {
  private readonly log = new Logger(AnaphoraResolverService.name);

  async resolve(query: string, history: ChatMessage[]): Promise<string> {
    if (history.length === 0) return query;

    const recent = history.slice(-6);
    const transcript = recent
      .map((m) => `${m.role}: ${m.content.trim()}`)
      .join('\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You rewrite a user message into a standalone question, using prior turns to ' +
          'resolve pronouns and implicit references. Preserve the original language. ' +
          'Return only the rewritten question, nothing else, max 25 words. ' +
          'If the message is already self-contained, return it unchanged.',
      },
      {
        role: 'user',
        content: `History:\n${transcript}\n\nCurrent message: ${query}\n\nSelf-contained question:`,
      },
    ];

    try {
      const out = await this.llm.generate(messages, {
        temperature: 0.1,
        maxTokens: 80,
        timeoutMs: 2500,
      });
      const cleaned = out.trim().replace(/^["']|["']$/g, '');
      return cleaned || query;
    } catch (e) {
      this.log.warn(`anaphora resolve failed: ${String(e)}`);
      return query;
    }
  }

  constructor(private readonly llm: LlmOrchestrator) {}
}
