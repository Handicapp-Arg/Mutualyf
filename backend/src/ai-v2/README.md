# ai-v2 — Semantic RAG Engine

Production-grade semantic retrieval system. No keyword dictionaries, no word-count
heuristics, no manual synonym lists. Everything is driven by embeddings and
structured LLM understanding.

## Pipeline

```
user message + history
        │
        ▼
[ AnaphoraResolver ]        LLM rewrites follow-ups to self-contained queries
        │
        ▼
[ QueryUnderstanding ]      LLM JSON: intent, entities, domain, rewrites, hyde
        │
        ▼
[ MultiQueryRetrieval ]     N expansions × (vector KNN + FTS) → RRF
        │
        ▼
[ SemanticReranker ]        cross-encoder-like scoring via query+hyde embeddings
        │
        ▼
[ AdaptiveThreshold ]       dynamic cutoff from historical score percentiles
        │
        ▼
[ LLMOrchestrator ]         provider cascade with circuit breaker + streaming
        │
        ▼
   streamed answer
```

## Modules

| Folder | Purpose |
|---|---|
| `shared/`            | pure utilities (text, vectors, result type) |
| `cache/`             | in-process LRU + Postgres persistent cache |
| `embeddings/`        | provider-agnostic embedding service (Ollama → Gemini) |
| `chunking/`          | semantic chunker (boundary detection via embedding drift) |
| `query-understanding/` | LLM-based intent + multi-query + anaphora |
| `retrieval/`         | hybrid (vector + FTS) + dynamic domain inference |
| `ranking/`           | RRF fusion + semantic reranker + adaptive threshold |
| `llm/`               | orchestrator with provider cascade and circuit breaker |
| `rag/`               | top-level pipeline service + example controller |

## Key design choices

- **No hardcoded categories.** Domain is inferred by clustering chunk embeddings
  (k-means on pgvector output) and matching the query to the nearest centroid
  at runtime. The list of domains emerges from the corpus itself.
- **No keyword off-topic guard.** Off-topic is detected by comparing the query
  embedding to the global corpus centroid and the top retrieved chunk score,
  with a threshold learned from historical logs (percentile, not fixed).
- **No fixed-size chunking.** The semantic chunker places boundaries where
  consecutive sentence embeddings diverge beyond a distribution-learned
  threshold — chunks follow meaning, not character counts.
- **No manual spell correction.** Typos are absorbed naturally by the embedding
  space and by LLM-generated query expansions.
- **HyDE reranking.** The LLM synthesizes a hypothetical answer; that answer's
  embedding reranks candidates — this is robust to vocabulary mismatch between
  question and document.

## Entry points

- `RagService.chat({ sessionId, message, history })` → `AsyncIterable<string>`
- `POST /api/v2/chat` → SSE stream
