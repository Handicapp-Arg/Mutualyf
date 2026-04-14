import type { Response } from 'express';

/** Set SSE headers and flush them immediately */
export function setupSSE(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

/** Send text as chunked SSE events (4 words per chunk for streaming visual) */
export function writeSSEChunked(res: Response, text: string) {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 4) {
    const chunk = words.slice(i, i + 4).join(' ');
    res.write(`data: ${JSON.stringify({ content: (i > 0 ? ' ' : '') + chunk })}\n\n`);
  }
}
