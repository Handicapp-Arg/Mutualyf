import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import * as path from "path";
import { Hit } from "./rag.types";

export const EMBEDDING_DIM = 768;
const TABLE_VEC = "kb_vec_v1";
const TABLE_FTS = "kb_fts";

/**
 * Único writer sobre la tabla vectorial y FTS.
 * Comparte el archivo .db con Prisma (WAL permite multi-reader).
 * Writes se serializan en cola interna para evitar SQLITE_BUSY.
 */
@Injectable()
export class VectorStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VectorStoreService.name);
  private db!: Database.Database;
  private writeQueue: Promise<void> = Promise.resolve();
  private stmts!: {
    knn: Database.Statement;
    knnCat: Database.Statement;
    fts: Database.Statement;
    ftsCat: Database.Statement;
    delVec: Database.Statement;
    insVec: Database.Statement;
    delFts: Database.Statement;
    insFts: Database.Statement;
  };

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const dbUrl = this.config.get<string>(
      "DATABASE_URL",
      "file:./data/chat.db",
    );
    const file = dbUrl.replace(/^file:/, "");
    const abs = path.isAbsolute(file)
      ? file
      : path.resolve(process.cwd(), "prisma", file);
    this.logger.log(`Opening vector DB at ${abs}`);
    this.db = new Database(abs);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("synchronous = NORMAL");
    sqliteVec.load(this.db);

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLE_VEC} USING vec0(
        chunk_id INTEGER PRIMARY KEY,
        category TEXT partition key,
        embedding FLOAT[${EMBEDDING_DIM}]
      );
    `);

    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${TABLE_FTS} USING fts5(
        chunk_id UNINDEXED,
        content,
        category UNINDEXED,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `);

    this.stmts = {
      knn: this.db.prepare(
        `SELECT chunk_id, distance FROM ${TABLE_VEC} WHERE embedding MATCH ? AND k = ? ORDER BY distance`,
      ),
      knnCat: this.db.prepare(
        `SELECT chunk_id, distance FROM ${TABLE_VEC} WHERE embedding MATCH ? AND category = ? AND k = ? ORDER BY distance`,
      ),
      fts: this.db.prepare(
        `SELECT chunk_id, bm25(${TABLE_FTS}) AS score FROM ${TABLE_FTS} WHERE ${TABLE_FTS} MATCH ? ORDER BY score LIMIT ?`,
      ),
      ftsCat: this.db.prepare(
        `SELECT chunk_id, bm25(${TABLE_FTS}) AS score FROM ${TABLE_FTS} WHERE ${TABLE_FTS} MATCH ? AND category = ? ORDER BY score LIMIT ?`,
      ),
      delVec: this.db.prepare(`DELETE FROM ${TABLE_VEC} WHERE chunk_id = ?`),
      insVec: this.db.prepare(
        `INSERT INTO ${TABLE_VEC}(chunk_id, category, embedding) VALUES (?, ?, ?)`,
      ),
      delFts: this.db.prepare(`DELETE FROM ${TABLE_FTS} WHERE chunk_id = ?`),
      insFts: this.db.prepare(
        `INSERT INTO ${TABLE_FTS}(chunk_id, content, category) VALUES (?, ?, ?)`,
      ),
    };

    this.logger.log("Vector store ready (sqlite-vec + FTS5)");
  }

  onModuleDestroy() {
    try {
      this.db?.close();
    } catch {}
  }

  async upsertChunk(c: {
    id: number;
    category: string;
    content: string;
    embedding: Float32Array;
  }): Promise<void> {
    this.writeQueue = this.writeQueue.then(
      () =>
        new Promise<void>((resolve, reject) => {
          try {
            const buf = Buffer.from(
              c.embedding.buffer,
              c.embedding.byteOffset,
              c.embedding.byteLength,
            );
            const idBig = BigInt(c.id);
            const tx = this.db.transaction(() => {
              this.stmts.delVec.run(idBig);
              this.stmts.insVec.run(idBig, c.category, buf);
              this.stmts.delFts.run(c.id);
              this.stmts.insFts.run(c.id, c.content, c.category);
            });
            tx();
            resolve();
          } catch (e) {
            reject(e);
          }
        }),
    );
    return this.writeQueue;
  }

  async deleteByChunkIds(ids: number[]): Promise<void> {
    if (!ids.length) return;
    this.writeQueue = this.writeQueue.then(
      () =>
        new Promise<void>((resolve, reject) => {
          try {
            const tx = this.db.transaction(() => {
              for (const id of ids) {
                this.stmts.delVec.run(BigInt(id));
                this.stmts.delFts.run(id);
              }
            });
            tx();
            resolve();
          } catch (e) {
            reject(e);
          }
        }),
    );
    return this.writeQueue;
  }

  knn(opts: { embedding: Float32Array; k: number; category?: string }): Hit[] {
    const buf = Buffer.from(
      opts.embedding.buffer,
      opts.embedding.byteOffset,
      opts.embedding.byteLength,
    );
    try {
      const rows = opts.category
        ? (this.stmts.knnCat.all(buf, opts.category, opts.k) as Array<{
            chunk_id: number;
            distance: number;
          }>)
        : (this.stmts.knn.all(buf, opts.k) as Array<{
            chunk_id: number;
            distance: number;
          }>);
      // vec0 devuelve distance (coseno o L2). Lo normalizamos: score = 1/(1+d)
      return rows.map((r) => ({
        chunkId: r.chunk_id,
        score: 1 / (1 + r.distance),
      }));
    } catch (e) {
      this.logger.warn(`knn failed: ${(e as Error).message}`);
      return [];
    }
  }

  fts(opts: { query: string; k: number; category?: string }): Hit[] {
    const andQuery = toFtsQuery(opts.query, "AND");
    if (!andQuery) return [];
    let hits = this.runFts(andQuery, opts.k, opts.category);
    // Fallback OR si AND fue demasiado restrictivo y no hubo matches.
    if (hits.length === 0) {
      const orQuery = toFtsQuery(opts.query, "OR");
      if (orQuery && orQuery !== andQuery) {
        hits = this.runFts(orQuery, opts.k, opts.category);
      }
    }
    return hits;
  }

  private runFts(query: string, k: number, category?: string): Hit[] {
    try {
      const rows = category
        ? (this.stmts.ftsCat.all(query, category, k) as Array<{
            chunk_id: number;
            score: number;
          }>)
        : (this.stmts.fts.all(query, k) as Array<{
            chunk_id: number;
            score: number;
          }>);
      // bm25 devuelve scores negativos (menor = mejor). Invertimos.
      return rows.map((r) => ({ chunkId: r.chunk_id, score: -r.score }));
    } catch (e) {
      this.logger.warn(`fts failed: ${(e as Error).message}`);
      return [];
    }
  }
}

// Stopwords ES — quitarlas mejora BM25 (no aportan señal y dominan en doc frequency).
const STOPWORDS_ES = new Set([
  "a",
  "al",
  "algo",
  "algun",
  "alguna",
  "algunas",
  "alguno",
  "algunos",
  "ante",
  "ası",
  "asi",
  "cada",
  "como",
  "con",
  "cual",
  "cuales",
  "cuando",
  "cuanto",
  "de",
  "del",
  "desde",
  "donde",
  "dos",
  "el",
  "ella",
  "ellas",
  "ellos",
  "en",
  "entre",
  "era",
  "eran",
  "es",
  "esa",
  "esas",
  "ese",
  "eso",
  "esos",
  "esta",
  "estaba",
  "estan",
  "estar",
  "esta",
  "estas",
  "este",
  "esto",
  "estos",
  "fue",
  "fueron",
  "ha",
  "han",
  "hace",
  "hacer",
  "hasta",
  "hay",
  "la",
  "las",
  "le",
  "les",
  "lo",
  "los",
  "mas",
  "me",
  "mi",
  "mis",
  "mucho",
  "muy",
  "no",
  "nos",
  "nuestra",
  "nuestro",
  "o",
  "otra",
  "otras",
  "otro",
  "otros",
  "para",
  "pero",
  "por",
  "porque",
  "que",
  "quien",
  "sea",
  "segun",
  "ser",
  "si",
  "sin",
  "sobre",
  "soy",
  "su",
  "sus",
  "tambien",
  "te",
  "tiene",
  "tienen",
  "todo",
  "todos",
  "tu",
  "tus",
  "un",
  "una",
  "unas",
  "uno",
  "unos",
  "y",
  "ya",
  "yo",
]);

/**
 * Convierte una query natural a sintaxis FTS5.
 * Estrategia: AND entre tokens significativos + prefix matching para tokens 4+ chars.
 * AND es más restrictivo que OR (mejora precisión y deja BM25 ranking decente).
 * Si AND devuelve 0 resultados, el caller puede degradar a OR — pero en general
 * con corpus chico y queries específicas, AND da mejores resultados.
 *
 * Si no hay tokens significativos tras filtrar stopwords, devuelve OR de los originales
 * (fallback para queries muy cortas como "horario").
 */
function toFtsQuery(raw: string, op: "AND" | "OR" = "AND"): string {
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

  // Prefix matching para tokens largos (>=4 chars) → captura plurales/conjugaciones.
  // Tokens cortos van exactos para evitar matchear ruido (ej: "pa*" matchearía pago, papa, etc).
  // Tokens son [a-z0-9]+ por el filtro previo, safe como bareword FTS5.
  const formatted = tokens.map((t) => (t.length >= 4 ? `${t}*` : t));

  return formatted.join(` ${op} `);
}
