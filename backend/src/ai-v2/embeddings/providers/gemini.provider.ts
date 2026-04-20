import { Injectable } from '@nestjs/common';
import { AiConfig } from '../../config/ai.config';
import { withTimeout } from '../../shared/result';
import { Vec } from '../../shared/vector-math';
import { EmbedKind, EmbeddingProvider } from '../embedding.interface';

@Injectable()
export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'gemini';
  readonly dims: number;

  constructor(private readonly cfg: AiConfig) {
    this.dims = cfg.embedDims;
  }

  async healthy(): Promise<boolean> {
    return Boolean(this.cfg.geminiKey);
  }

  async embed(texts: string[], kind: EmbedKind): Promise<Vec[]> {
    if (!this.cfg.geminiKey) throw new Error('gemini key not configured');
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${this.cfg.geminiEmbedModel}:batchEmbedContents?key=${this.cfg.geminiKey}`;
    const taskType =
      kind === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';

    const body = {
      requests: texts.map((t) => ({
        model: `models/${this.cfg.geminiEmbedModel}`,
        content: { parts: [{ text: t }] },
        taskType,
        outputDimensionality: this.dims,
      })),
    };

    const res = await withTimeout(
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      8000,
      'gemini-embed',
    );
    if (!res.ok) {
      throw new Error(`gemini embed ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as {
      embeddings: { values: number[] }[];
    };
    return json.embeddings.map((e) => Float32Array.from(e.values));
  }
}
