import { Vec } from '../shared/vector-math';

export type EmbedKind = 'doc' | 'query';

export interface EmbeddingProvider {
  readonly name: string;
  readonly dims: number;
  embed(texts: string[], kind: EmbedKind): Promise<Vec[]>;
  healthy(): Promise<boolean>;
}
