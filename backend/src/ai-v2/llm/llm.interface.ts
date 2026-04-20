export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  responseFormat?: 'text' | 'json';
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface LlmProvider {
  readonly name: string;
  healthy(): Promise<boolean>;
  generate(messages: ChatMessage[], opts: GenerateOptions): Promise<string>;
  stream(
    messages: ChatMessage[],
    opts: GenerateOptions,
  ): AsyncIterable<string>;
}
