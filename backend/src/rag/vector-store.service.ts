import {
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Hit } from "./rag.types";

export const EMBEDDING_DIM = 768;

/**
 * Vector store usando PostgreSQL con pgvector para KNN
 * y tsvector/tsquery para full-text search.
 *
 * Requiere la extensión pgvector instalada en PostgreSQL:
 *   CREATE EXTENSION IF NOT EXISTS vector;
 */
@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // Crear extensión pgvector si no existe
      await this.prisma.$executeRawUnsafe(
        `CREATE EXTENSION IF NOT EXISTS vector;`,
      );

      // Crear tabla de vectores si no existe
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS kb_vectors (
          chunk_id INTEGER PRIMARY KEY,
          embedding vector(${EMBEDDING_DIM}),
          content TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT ''
        );
      `);

      // Crear índice IVFFlat para búsqueda rápida (si hay suficientes filas)
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS kb_vectors_embedding_idx
        ON kb_vectors USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 10);
      `).catch(() => {
        // IVFFlat requiere al menos 1 fila para crear el índice,
        // si falla lo ignoramos y se creará después
        this.logger.debug("IVFFlat index deferred (table may be empty)");
      });

      // Crear índice GIN para full-text search
      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS kb_vectors_fts_idx
        ON kb_vectors USING gin (to_tsvector('spanish', content));
      `);

      this.logger.log("Vector store ready (pgvector + tsvector)");
    } catch (e) {
      this.logger.error(`Vector store init failed: ${(e as Error).message}`);
    }
  }

  /**
   * Recrea las tablas de vectores desde cero.
   */
  async recreateIndices(): Promise<void> {
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS kb_vectors;`);
    await this.onModuleInit();
    this.logger.warn("Recreated kb_vectors (data wiped)");
  }

  /**
   * Inserta o actualiza un chunk con su embedding.
   */
  async upsertChunk(c: {
    id: number;
    category: string;
    content: string;
    embedding: Float32Array;
  }): Promise<void> {
    const embStr = `[${Array.from(c.embedding).join(",")}]`;
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO kb_vectors (chunk_id, embedding, content, category)
       VALUES ($1, $2::vector, $3, $4)
       ON CONFLICT (chunk_id) DO UPDATE SET
         embedding = EXCLUDED.embedding,
         content = EXCLUDED.content,
         category = EXCLUDED.category`,
      c.id,
      embStr,
      c.content,
      c.category,
    );
  }

  /**
   * Elimina chunks por IDs.
   */
  async deleteByChunkIds(ids: number[]): Promise<void> {
    if (!ids.length) return;
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM kb_vectors WHERE chunk_id IN (${placeholders})`,
      ...ids,
    );
  }

  /**
   * Búsqueda KNN por similitud coseno.
   */
  knn(opts: { embedding: Float32Array; k: number; category?: string }): Hit[] {
    // pgvector requiere queries async, pero mantenemos la interfaz sync
    // devolviendo vacío — el caller debe usar knnAsync
    this.logger.warn("knn() sync not supported with pgvector, use knnAsync()");
    return [];
  }

  /**
   * Búsqueda KNN async por similitud coseno.
   */
  async knnAsync(opts: {
    embedding: Float32Array;
    k: number;
    category?: string;
  }): Promise<Hit[]> {
    const embStr = `[${Array.from(opts.embedding).join(",")}]`;
    try {
      let rows: Array<{ chunk_id: number; distance: number }>;

      if (opts.category) {
        rows = await this.prisma.$queryRawUnsafe(
          `SELECT chunk_id, embedding <=> $1::vector AS distance
           FROM kb_vectors
           WHERE category = $2
           ORDER BY distance
           LIMIT $3`,
          embStr,
          opts.category,
          opts.k,
        );
      } else {
        rows = await this.prisma.$queryRawUnsafe(
          `SELECT chunk_id, embedding <=> $1::vector AS distance
           FROM kb_vectors
           ORDER BY distance
           LIMIT $2`,
          embStr,
          opts.k,
        );
      }

      return rows.map((r) => ({
        chunkId: r.chunk_id,
        score: 1 / (1 + r.distance),
      }));
    } catch (e) {
      this.logger.warn(`knnAsync failed: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * Full-text search usando tsvector/tsquery de PostgreSQL.
   */
  fts(opts: { query: string; k: number; category?: string }): Hit[] {
    this.logger.warn("fts() sync not supported with pgvector, use ftsAsync()");
    return [];
  }

  /**
   * Full-text search async.
   */
  async ftsAsync(opts: {
    query: string;
    k: number;
    category?: string;
  }): Promise<Hit[]> {
    const tsQuery = toTsQuery(opts.query);
    if (!tsQuery) return [];

    try {
      let rows: Array<{ chunk_id: number; rank: number }>;

      if (opts.category) {
        rows = await this.prisma.$queryRawUnsafe(
          `SELECT chunk_id, ts_rank(to_tsvector('spanish', content), to_tsquery('spanish', $1)) AS rank
           FROM kb_vectors
           WHERE to_tsvector('spanish', content) @@ to_tsquery('spanish', $1)
             AND category = $2
           ORDER BY rank DESC
           LIMIT $3`,
          tsQuery,
          opts.category,
          opts.k,
        );
      } else {
        rows = await this.prisma.$queryRawUnsafe(
          `SELECT chunk_id, ts_rank(to_tsvector('spanish', content), to_tsquery('spanish', $1)) AS rank
           FROM kb_vectors
           WHERE to_tsvector('spanish', content) @@ to_tsquery('spanish', $1)
           ORDER BY rank DESC
           LIMIT $2`,
          tsQuery,
          opts.k,
        );
      }

      return rows.map((r) => ({ chunkId: r.chunk_id, score: r.rank }));
    } catch (e) {
      this.logger.warn(`ftsAsync failed: ${(e as Error).message}`);
      return [];
    }
  }
}

// Stopwords ES
const STOPWORDS_ES = new Set([
  "a", "al", "algo", "algun", "alguna", "algunas", "alguno", "algunos",
  "ante", "asi", "cada", "como", "con", "cual", "cuales", "cuando",
  "cuanto", "de", "del", "desde", "donde", "dos", "el", "ella", "ellas",
  "ellos", "en", "entre", "era", "eran", "es", "esa", "esas", "ese",
  "eso", "esos", "esta", "estaba", "estan", "estar", "estas", "este",
  "esto", "estos", "fue", "fueron", "ha", "han", "hace", "hacer",
  "hasta", "hay", "la", "las", "le", "les", "lo", "los", "mas", "me",
  "mi", "mis", "mucho", "muy", "no", "nos", "nuestra", "nuestro", "o",
  "otra", "otras", "otro", "otros", "para", "pero", "por", "porque",
  "que", "quien", "sea", "segun", "ser", "si", "sin", "sobre", "soy",
  "su", "sus", "tambien", "te", "tiene", "tienen", "todo", "todos",
  "tu", "tus", "un", "una", "unas", "uno", "unos", "y", "ya", "yo",
]);

/**
 * Convierte query natural a tsquery de PostgreSQL.
 * Usa operador & (AND) entre tokens significativos con prefix matching (:*).
 */
function toTsQuery(raw: string): string {
  const allTokens = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 12);

  const significant = allTokens.filter((t) => !STOPWORDS_ES.has(t));
  const tokens = significant.length > 0 ? significant : allTokens;
  if (!tokens.length) return "";

  // Prefix matching con :* para capturar variaciones
  return tokens.map((t) => `${t}:*`).join(" & ");
}
