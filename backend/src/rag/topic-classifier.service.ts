import { Injectable, Logger } from "@nestjs/common";
import { LRUCache } from "lru-cache";
import { PrismaService } from "../prisma/prisma.service";
import { EmbeddingsService } from "./embeddings.service";
import { GroqService } from "../ai/groq.service";
import { RagConfig } from "./rag.config";
import { normalizeText } from "./text-utils";
import { INTENT_ANCHORS, IntentKind } from "./intent-anchors";

export type TopicDecision = "RELEVANT" | "AMBIGUOUS" | "OFF_TOPIC";

export interface TopicResult {
  decision: TopicDecision;
  /** cosine similarity 0..1 al mejor prototipo/centroide */
  score: number;
  bestCategory: string | null;
  source:
    | "cache"
    | "bypass"
    | "centroid"
    | "llm"
    | "empty-kb"
    | "intent-meta"
    | "intent-chitchat";
  latencyMs: number;
  /** se expone para reutilizar aguas abajo en el retrieval (evita doble embed) */
  queryEmbedding?: Float32Array;
  reason: string;
  /** cuando el match no es por dominio sino por intent conversacional */
  intentKind?: IntentKind;
}

interface Centroid {
  category: string;
  vector: Float32Array;
  chunkCount: number;
}

interface IntentPrototype {
  kind: "meta" | "chitchat";
  utterance: string;
  vector: Float32Array;
}

/**
 * Clasificador semántico de relevancia al dominio.
 *
 * Reemplaza al keyword matching hardcodeado. Pipeline:
 *   1. Cache (LRU) — hit: O(μs)
 *   2. Bypass para follow-ups con history (RAG resuelve contexto)
 *   3. Cosine similarity vs centroides de cada categoría del KB
 *        - score ≥ T_HIGH → RELEVANT
 *        - score <  T_LOW  → OFF_TOPIC
 *        - zona gris       → LLM judge (Groq 8B, ~100 tokens)
 *
 * Los centroides son promedios L2-normalizados de los embeddings activos en
 * cada categoría. Se recomputan en boot y tras cada ingest. No hay lista
 * hardcodeada: el "qué es relevante" se deriva del corpus.
 */
@Injectable()
export class TopicClassifierService {
  private readonly logger = new Logger(TopicClassifierService.name);
  private readonly cache: LRUCache<string, TopicResult>;
  private centroids: Centroid[] = [];
  private intentPrototypes: IntentPrototype[] = [];
  private lastRebuild = 0;
  private rebuildInFlight: Promise<void> | null = null;
  private intentRebuildInFlight: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emb: EmbeddingsService,
    private readonly groq: GroqService,
    private readonly cfg: RagConfig,
  ) {
    this.cache = new LRUCache<string, TopicResult>({
      max: this.cfg.topicCacheMax,
      ttl: this.cfg.topicCacheTtlMs,
    });
  }

  get centroidCount(): number {
    return this.centroids.length;
  }

  get intentPrototypeCount(): number {
    return this.intentPrototypes.length;
  }

  get lastRebuildAt(): number {
    return this.lastRebuild;
  }

  /**
   * Pre-computa embeddings de los anchors de intent (seed + extensiones de DB
   * en categorías `_intent_meta` / `_intent_chitchat`). Llama en boot y cuando
   * se ingestan/borran docs de esas categorías.
   */
  async rebuildIntentPrototypes(): Promise<void> {
    if (this.intentRebuildInFlight) return this.intentRebuildInFlight;
    this.intentRebuildInFlight = this.doRebuildIntents().finally(() => {
      this.intentRebuildInFlight = null;
    });
    return this.intentRebuildInFlight;
  }

  private async doRebuildIntents(): Promise<void> {
    const t0 = Date.now();
    try {
      const seed: Array<{ kind: "meta" | "chitchat"; utterance: string }> =
        INTENT_ANCHORS.map((a) => ({ kind: a.kind, utterance: a.utterance }));

      // Extensiones admin via DB (opcional — si el admin no agrega nada, usamos solo el seed)
      try {
        const dbAnchors = await this.prisma.knowledgeChunk.findMany({
          where: {
            category: { in: ["_intent_meta", "_intent_chitchat"] },
            doc: { status: "active" },
          },
          select: { contentClean: true, category: true },
        });
        for (const a of dbAnchors) {
          if (!a.contentClean?.trim()) continue;
          seed.push({
            kind: a.category === "_intent_meta" ? "meta" : "chitchat",
            utterance: a.contentClean.trim(),
          });
        }
      } catch {
        // Prisma puede fallar antes de migraciones — usar solo el seed.
      }

      if (!seed.length) {
        this.intentPrototypes = [];
        return;
      }

      const texts = seed.map((s) => s.utterance);
      const vecs = await this.emb.embed(texts, "query");
      this.intentPrototypes = seed.map((s, i) => ({
        kind: s.kind,
        utterance: s.utterance,
        vector: l2normalize(toPlainArray(vecs[i])),
      }));

      const byKind = this.intentPrototypes.reduce<Record<string, number>>(
        (acc, p) => ((acc[p.kind] = (acc[p.kind] ?? 0) + 1), acc),
        {},
      );
      this.logger.log(
        `intent prototypes built in ${Date.now() - t0}ms — ` +
          Object.entries(byKind).map(([k, n]) => `${k}(${n})`).join(", "),
      );
    } catch (e) {
      this.logger.warn(`rebuildIntentPrototypes failed: ${(e as Error).message}`);
    }
  }

  /**
   * Recalcula los centroides desde kb_vectors (pgvector). Deduplica llamadas
   * concurrentes devolviendo la misma promesa.
   */
  async rebuildCentroids(): Promise<void> {
    if (this.rebuildInFlight) return this.rebuildInFlight;
    this.rebuildInFlight = this.doRebuild().finally(() => {
      this.rebuildInFlight = null;
    });
    return this.rebuildInFlight;
  }

  private async doRebuild(): Promise<void> {
    const t0 = Date.now();
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        Array<{ category: string; embedding: string }>
      >(
        `SELECT v.category, v.embedding::text AS embedding
           FROM kb_vectors v
           JOIN knowledge_chunks c ON c.id = v.chunk_id
           JOIN knowledge_docs d   ON d.id = c.doc_id
          WHERE d.status = 'active'
            AND v.embedding IS NOT NULL`,
      );

      if (!rows.length) {
        this.centroids = [];
        this.lastRebuild = Date.now();
        this.logger.warn("rebuildCentroids: 0 active chunks — classifier runs in empty-KB mode");
        return;
      }

      const byCat = new Map<string, number[][]>();
      for (const r of rows) {
        const v = parsePgVector(r.embedding);
        if (!v) continue;
        if (!byCat.has(r.category)) byCat.set(r.category, []);
        byCat.get(r.category)!.push(v);
      }

      const next: Centroid[] = [];
      for (const [category, vecs] of byCat) {
        if (vecs.length < this.cfg.topicMinChunksPerCategory) {
          this.logger.debug(
            `skip centroid "${category}": only ${vecs.length} chunks ` +
              `(< ${this.cfg.topicMinChunksPerCategory})`,
          );
          continue;
        }
        next.push({
          category,
          vector: l2normalize(mean(vecs)),
          chunkCount: vecs.length,
        });
      }

      this.centroids = next;
      this.lastRebuild = Date.now();
      this.cache.clear();
      this.logger.log(
        `centroids rebuilt in ${Date.now() - t0}ms — ${next.length} categories: ` +
          next.map((c) => `${c.category}(${c.chunkCount})`).join(", "),
      );
    } catch (e: any) {
      // 42P01 = table does not exist (kb_vectors not yet created by VectorStoreService)
      if (e?.code === '42P01' || e?.message?.includes('42P01') || e?.message?.includes('kb_vectors')) {
        this.centroids = [];
        this.logger.warn('rebuildCentroids: kb_vectors not ready yet — classifier runs in empty-KB mode');
        return;
      }
      this.logger.error(`rebuildCentroids failed: ${(e as Error).message}`);
    }
  }

  /**
   * Clasifica una query. Si se pasa `precomputedEmbedding` se reutiliza
   * (caso típico: el retrieval ya lo calculó y lo comparte).
   */
  async classify(
    query: string,
    opts: {
      hasHistory?: boolean;
      precomputedEmbedding?: Float32Array;
      embeddingsAvailable?: boolean;
    } = {},
  ): Promise<TopicResult> {
    const t0 = Date.now();
    const trimmed = query.trim();

    if (!this.cfg.enableTopicClassifier) {
      return this.done(t0, { decision: "RELEVANT", score: 1, bestCategory: null, source: "bypass", reason: "classifier-disabled" });
    }

    if (!trimmed) {
      return this.done(t0, { decision: "AMBIGUOUS", score: 0, bestCategory: null, source: "bypass", reason: "empty-query" });
    }

    // Follow-ups: el history resuelve la ambigüedad; no tenemos info suficiente
    // en el turno actual para clasificar confiadamente.
    if (opts.hasHistory) {
      return this.done(t0, { decision: "RELEVANT", score: 1, bestCategory: null, source: "bypass", reason: "has-history" });
    }

    if (opts.embeddingsAvailable === false) {
      return this.done(t0, { decision: "RELEVANT", score: 1, bestCategory: null, source: "bypass", reason: "embeddings-unavailable" });
    }

    if (this.centroids.length === 0) {
      // KB vacío (p.ej. primer deploy): no podemos comparar. Aceptar y log.
      return this.done(t0, { decision: "RELEVANT", score: 1, bestCategory: null, source: "empty-kb", reason: "no-centroids" });
    }

    const key = normalizeText(trimmed);
    const cached = this.cache.get(key);
    if (cached) {
      return { ...cached, source: "cache", latencyMs: Date.now() - t0 };
    }

    let qEmb = opts.precomputedEmbedding;
    if (!qEmb) {
      try {
        [qEmb] = await this.emb.embed([trimmed], "query");
      } catch (e) {
        this.logger.warn(`classify embed failed: ${(e as Error).message} — accepting by default`);
        return this.done(t0, { decision: "RELEVANT", score: 1, bestCategory: null, source: "bypass", reason: "embed-error" });
      }
    }
    const qNorm = l2normalize(toPlainArray(qEmb));

    // 1. Intent check (meta/chitchat) — conversación natural SIEMPRE es relevante.
    //    Matches como "sos una IA?" vs "sos un bot" se resuelven por proximidad
    //    semántica, no por regex. Protege meta-queries de caer a OFF_TOPIC.
    const intentMatch = this.matchIntent(qNorm);
    if (intentMatch) {
      return this.done(
        t0,
        {
          decision: "RELEVANT",
          score: intentMatch.score,
          bestCategory: null,
          source: intentMatch.kind === "meta" ? "intent-meta" : "intent-chitchat",
          reason: `intent-proto="${intentMatch.utterance.slice(0, 30)}" sim=${intentMatch.rawSim.toFixed(2)}`,
          queryEmbedding: qEmb,
          intentKind: intentMatch.kind,
        },
        key,
      );
    }

    // 2. Domain check — similitud vs centroides por categoría del KB.
    let best: { cat: string; sim: number } = { cat: "", sim: -1 };
    for (const c of this.centroids) {
      // Saltamos categorías reservadas de intent — ya se probaron arriba.
      if (c.category.startsWith("_intent_")) continue;
      const sim = dot(qNorm, c.vector);
      if (sim > best.sim) best = { cat: c.category, sim };
    }

    // Normalizar cosine (-1..1) a 0..1 para usar umbrales más intuitivos
    const score = Math.max(0, (best.sim + 1) / 2);

    // Fast path: si el dominio es CLARAMENTE alto, evitamos el LLM judge.
    if (score >= this.cfg.topicThresholdHigh) {
      return this.done(
        t0,
        {
          decision: "RELEVANT",
          score,
          bestCategory: best.cat || null,
          source: "centroid",
          reason: `top=${best.cat} score=${score.toFixed(2)}`,
          queryEmbedding: qEmb,
          intentKind: "domain",
        },
        key,
      );
    }

    // Zona ambigua o baja: escalamos al LLM judge 4-vías. El LLM puede
    // detectar meta/chitchat que los prototipos no capturaron (paráfrasis
    // raras, queries muy cortas) y los rotula con intentKind para que
    // RagService active el shortcut conversacional sin pasar por retrieval.
    const judged = await this.llmJudge(trimmed);
    const baseReason = `top=${best.cat} score=${score.toFixed(2)} llm=${judged.label}`;

    if (judged.intentKind === "meta" || judged.intentKind === "chitchat") {
      return this.done(
        t0,
        {
          decision: "RELEVANT",
          score,
          bestCategory: best.cat || null,
          source: judged.intentKind === "meta" ? "intent-meta" : "intent-chitchat",
          reason: baseReason,
          queryEmbedding: qEmb,
          intentKind: judged.intentKind,
        },
        key,
      );
    }

    return this.done(
      t0,
      {
        decision: judged.decision,
        score,
        bestCategory: best.cat || null,
        source: "llm",
        reason: baseReason,
        queryEmbedding: qEmb,
        intentKind: judged.decision === "RELEVANT" ? "domain" : undefined,
      },
      key,
    );
  }

  /**
   * Busca el prototipo de intent (meta/chitchat) más cercano a la query.
   * Devuelve match sólo si supera el umbral — evita falsos positivos.
   */
  private matchIntent(
    qNorm: Float32Array,
  ): { kind: "meta" | "chitchat"; utterance: string; rawSim: number; score: number } | null {
    if (!this.intentPrototypes.length) return null;
    let best = { kind: "meta" as "meta" | "chitchat", utterance: "", sim: -1 };
    for (const p of this.intentPrototypes) {
      const sim = dot(qNorm, p.vector);
      if (sim > best.sim) best = { kind: p.kind, utterance: p.utterance, sim };
    }
    // Threshold en raw cosine (rango -1..1). Sobre 0.55 ya hay afinidad fuerte;
    // permite parafraseos ("sos una IA?" ≈ "sos una inteligencia artificial").
    if (best.sim < this.cfg.topicIntentThreshold) return null;
    return {
      kind: best.kind,
      utterance: best.utterance,
      rawSim: best.sim,
      score: Math.max(0, (best.sim + 1) / 2),
    };
  }

  /**
   * LLM judge 4-vías: META, CHITCHAT, DOMAIN, OFFTOPIC.
   *
   * Por qué 4 etiquetas y no 2:
   *   - Si el LLM solo devuelve RELEVANT/OFF_TOPIC, queries conversacionales
   *     que los prototipos no atrapan (single-token, paráfrasis raras) caen
   *     a "RELEVANT/domain" → retrieval → multi-signal detector las marca
   *     off-topic → respuesta "no puedo ayudarte". Bug observado con "hola".
   *   - Con META/CHITCHAT explícitos, RagService toma el shortcut conversacional
   *     y responde como MutuaBot devolviendo el saludo.
   *
   * Costo: ~5 tokens out con llama-3.1-8b-instant en Groq (<150ms p50, ~$0.0001).
   * Cacheado por LRU → segunda ocurrencia O(μs).
   */
  private async llmJudge(query: string): Promise<{
    decision: TopicDecision;
    intentKind?: IntentKind;
    label: string;
  }> {
    const system = `Sos un clasificador para MutuaBot, asistente virtual de MutuaLyF (mutual de salud argentina del sindicato Luz y Fuerza de Santa Fe).

Clasificá la consulta del usuario en UNA sola palabra:

- META: pregunta sobre el bot mismo (quién sos, sos una IA, sos humano, qué podés hacer, cómo te llamás, quién te creó, ayuda en general).
- CHITCHAT: saludo, agradecimiento, despedida o acknowledgement (hola, buen día, buenas, gracias, chau, ok, dale, perfecto, todo bien).
- DOMAIN: consulta sobre MutuaLyF. Incluye: afiliación, salud, cobertura, turnos, horarios, prestadores, especialidades, médicos, bioquímicos, bioquimico, laboratorio, análisis clínicos, odontología, farmacia, recetas, órdenes médicas, autorizaciones, reintegros, pagos, coseguros, trámites, sedes, contacto, MiMutuaLyF, reclamos, cartilla, profesionales de salud, clínicas, centros de salud, consultas médicas, especialistas. También si la consulta menciona a un profesional de salud por nombre o profesión, un síntoma o enfermedad, o pide información de algún servicio de salud.
- OFFTOPIC: claramente otro dominio sin relación con salud ni la mutual (programación, recetas de cocina, entretenimiento, política, clima, deportes, otras obras sociales, preguntas de cultura general).

IMPORTANTE: Ante cualquier duda entre DOMAIN y OFFTOPIC, SIEMPRE respondé DOMAIN. Si la consulta menciona algo relacionado con salud, profesionales médicos o servicios de la mutual, es DOMAIN.

Sin puntuación, sin comillas, sin explicación: SÓLO la palabra.`;

    try {
      const raw = await Promise.race([
        this.groq.generateResponse([], query, system, 0, 6),
        new Promise<string>((_, rej) =>
          setTimeout(() => rej(new Error("llm-judge-timeout")), this.cfg.topicLlmJudgeTimeoutMs),
        ),
      ]);
      const out = (raw || "").toUpperCase().replace(/[^A-Z]/g, "");
      if (out.startsWith("META")) {
        return { decision: "RELEVANT", intentKind: "meta", label: "meta" };
      }
      if (out.startsWith("CHIT")) {
        return { decision: "RELEVANT", intentKind: "chitchat", label: "chitchat" };
      }
      if (out.startsWith("OFF")) {
        return { decision: "OFF_TOPIC", label: "offtopic" };
      }
      if (out.startsWith("DOM") || out.startsWith("REL")) {
        return { decision: "RELEVANT", intentKind: "domain", label: "domain" };
      }
      this.logger.debug(`llm judge unparseable="${raw}" — default DOMAIN`);
      return { decision: "RELEVANT", intentKind: "domain", label: "domain?" };
    } catch (e) {
      this.logger.warn(`llm judge failed: ${(e as Error).message} — default DOMAIN`);
      return { decision: "RELEVANT", intentKind: "domain", label: "error" };
    }
  }

  private done(
    t0: number,
    partial: Omit<TopicResult, "latencyMs">,
    cacheKey?: string,
  ): TopicResult {
    const result: TopicResult = { ...partial, latencyMs: Date.now() - t0 };
    if (cacheKey && result.source !== "bypass" && result.source !== "empty-kb") {
      this.cache.set(cacheKey, result);
    }
    return result;
  }
}

/** pgvector serializa a "[0.1,0.2,...]" cuando se castea a text. */
function parsePgVector(s: string): number[] | null {
  if (!s) return null;
  const body = s.trim().replace(/^\[/, "").replace(/\]$/, "");
  const out: number[] = [];
  for (const part of body.split(",")) {
    const n = Number(part);
    if (!Number.isFinite(n)) return null;
    out.push(n);
  }
  return out.length ? out : null;
}

function mean(vecs: number[][]): number[] {
  const dim = vecs[0].length;
  const acc = new Array(dim).fill(0);
  for (const v of vecs) {
    for (let i = 0; i < dim; i++) acc[i] += v[i];
  }
  for (let i = 0; i < dim; i++) acc[i] /= vecs.length;
  return acc;
}

function l2normalize(v: number[]): Float32Array {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

function dot(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function toPlainArray(v: Float32Array): number[] {
  const out = new Array<number>(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i];
  return out;
}
