import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ChatMessage } from '../llm/llm.interface';
import { RagService } from './rag.service';

interface ChatDto {
  sessionId?: string;
  message: string;
  history?: ChatMessage[];
  systemPersona?: string;
}

@Controller('api/v2')
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (data: unknown) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const ev of this.rag.chat({
        sessionId: dto.sessionId,
        message: dto.message,
        history: dto.history ?? [],
        systemPersona: dto.systemPersona,
      })) {
        send(ev);
        if (ev.type === 'done' || ev.type === 'error') break;
      }
    } catch (e) {
      send({ type: 'error', content: String(e) });
    } finally {
      res.end();
    }
  }
}
