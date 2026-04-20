import { Injectable, Logger } from '@nestjs/common';
import { AiConfig } from '../../config/ai.config';
import { withTimeout } from '../../shared/result';
import { Vec } from '../../shared/vector-math';
import { EmbedKind, EmbeddingProvider } from '../embedding.interface';

const PREFIXES: Record<EmbedKind, string> = {
  doc: 'search_document: ',
  query: 'search_query: ',
};

@Injectable()
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'ollama';
  readonly dims: number;
  private readonly log = new Logger(OllamaEmbeddingProvider.name);

  constructor(private readonly cfg: AiConfig) {
    this.dims = cfg.embedDims;
  }

  async healthy(): Promise<boolean> {
    try {
      const res = await withTimeout(
        fetch(`${this.cfg.ollamaHost}/api/tags`),
        2000,
        'ollama-health',
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  async embed(texts: string[], kind: EmbedKind): Promise<Vec[]> {
    const prefix = PREFIXES[kind];
    const input = texts.map((t) => prefix + t);
    const res = await withTimeout(
      fetch(`${this.cfg.ollamaHost}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.cfg.embedModel, input }),
      }),
      15000,
      'ollama-embed',
    );
    if (!res.ok) {
      throw new Error(`ollama embed ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { embeddings: number[][] };
    if (!json.embeddings?.length) {
      throw new Error('ollama returned no embeddings');
    }
    return json.embeddings.map((e) => Float32Array.from(e));
  }
}
