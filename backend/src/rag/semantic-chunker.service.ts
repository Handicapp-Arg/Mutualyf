import { Injectable, Logger } from "@nestjs/common";
import { chunkText } from "./chunker";
import { RagConfig } from "./rag.config";

@Injectable()
export class SemanticChunkerService {
  private readonly logger = new Logger(SemanticChunkerService.name);

  constructor(private readonly cfg: RagConfig) {}

  async split(content: string, _category: string, title: string): Promise<string[]> {
    const text = content.replace(/\r\n/g, "\n").trim();
    if (!text) return [];

    const chunks = chunkText(text, {
      chunkSize: this.cfg.chunkSize,
      chunkOverlap: this.cfg.chunkOverlap,
    });

    this.logger.log(`"${title}" → ${chunks.length} chunk(s)`);
    return chunks;
  }
}
