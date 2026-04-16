import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService } from './embeddings.service';
import { VectorStoreService } from './vector-store.service';
import { chunkText, estimateTokens } from './chunker';
import { sanitizeChunk } from './sanitizer';
import { Category, CATEGORIES } from './rag.types';
import { RagConfig } from './rag.config';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emb: EmbeddingsService,
    private readonly vec: VectorStoreService,
    private readonly cfg: RagConfig,
  ) {}

  async ingestText(input: {
    title: string;
    source: string;
    category: string;
    content: string;
  }): Promise<{ docId: number; chunks: number; skipped?: boolean; reason?: string }> {
    if (!CATEGORIES.includes(input.category as Category)) {
      throw new BadRequestException(`Invalid category. Allowed: ${CATEGORIES.join(', ')}`);
    }
    const cleanContent = input.content.trim();
    if (cleanContent.length < 40) {
      throw new BadRequestException('Content too short (min 40 chars)');
    }
    if (cleanContent.length > 2_000_000) {
      throw new BadRequestException('Content too large (max 2MB)');
    }

    const hash = createHash('sha256').update(cleanContent).digest('hex');

    // Dedup por hash
    const existing = await this.prisma.knowledgeDoc.findUnique({ where: { hash } });
    if (existing) {
      return { docId: existing.id, chunks: 0, skipped: true, reason: 'hash-exists' };
    }

    // Versioning: archivar docs previos con mismo source
    await this.prisma.knowledgeDoc.updateMany({
      where: { source: input.source, status: 'active' },
      data: { status: 'archived', archivedAt: new Date() },
    });

    const prevVersion = await this.prisma.knowledgeDoc.findFirst({
      where: { source: input.source },
      orderBy: { version: 'desc' },
    });
    const version = (prevVersion?.version ?? 0) + 1;

    const rawChunks = chunkText(cleanContent, {
      chunkSize: this.cfg.chunkSize,
      chunkOverlap: this.cfg.chunkOverlap,
    });
    const tokensTotal = rawChunks.reduce((s, c) => s + estimateTokens(c), 0);

    const doc = await this.prisma.knowledgeDoc.create({
      data: {
        title: input.title,
        source: input.source,
        category: input.category,
        hash,
        version,
        tokensTotal,
      },
    });

    // Sanitizar y persistir chunks
    const chunkRows = await this.prisma.$transaction(
      rawChunks.map((c, i) =>
        this.prisma.knowledgeChunk.create({
          data: {
            docId: doc.id,
            ord: i,
            content: c,
            contentClean: sanitizeChunk(c),
            tokens: estimateTokens(c),
            category: input.category,
            embModel: this.emb.model,
          },
        }),
      ),
    );

    // Embed en batches + insert vectorial
    for (let i = 0; i < chunkRows.length; i += this.cfg.embedBatchSize) {
      const batch = chunkRows.slice(i, i + this.cfg.embedBatchSize);
      const embeddings = await this.emb.embed(batch.map(c => c.contentClean));
      await Promise.all(
        batch.map((c, j) =>
          this.vec.upsertChunk({
            id: c.id,
            category: c.category,
            content: c.contentClean,
            embedding: embeddings[j],
          }),
        ),
      );
    }

    this.logger.log(`ingested doc=${doc.id} "${input.title}" chunks=${chunkRows.length} tokens=${tokensTotal}`);
    return { docId: doc.id, chunks: chunkRows.length };
  }

  async archiveDoc(docId: number): Promise<void> {
    const doc = await this.prisma.knowledgeDoc.findUnique({
      where: { id: docId },
      include: { chunks: { select: { id: true } } },
    });
    if (!doc) throw new BadRequestException('Doc not found');
    await this.vec.deleteByChunkIds(doc.chunks.map(c => c.id));
    await this.prisma.knowledgeDoc.update({
      where: { id: docId },
      data: { status: 'archived', archivedAt: new Date() },
    });
    this.logger.log(`archived doc=${docId}`);
  }

  async listDocs() {
    return this.prisma.knowledgeDoc.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });
  }

  /**
   * Rebuilds the vector+FTS index from existing chunks in DB.
   * Útil si cambió el modelo de embedding o el índice se corrompió.
   */
  async rebuildIndex(): Promise<{ rebuilt: number }> {
    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { doc: { status: 'active' } },
    });
    let done = 0;
    for (let i = 0; i < chunks.length; i += this.cfg.embedBatchSize) {
      const batch = chunks.slice(i, i + this.cfg.embedBatchSize);
      const emb = await this.emb.embed(batch.map(c => c.contentClean));
      await Promise.all(batch.map((c, j) =>
        this.vec.upsertChunk({ id: c.id, category: c.category, content: c.contentClean, embedding: emb[j] }),
      ));
      done += batch.length;
    }
    this.logger.log(`rebuilt index with ${done} chunks`);
    return { rebuilt: done };
  }
}
