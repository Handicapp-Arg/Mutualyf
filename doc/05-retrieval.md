# Pipeline de Recuperación (Retrieval)

Este es el corazón del sistema RAG. Dada una pregunta, encuentra los fragmentos de la base de conocimiento más relevantes para responderla.

## Componentes del pipeline

```
Query del usuario
      │
      ▼
┌──────────────────┐
│  Query Rewriter  │  expande referencias y anáforas
└───────┬──────────┘
        │ query reescrita
        ▼
┌──────────────────┐
│     Router       │  clasifica intent y categoría
└───────┬──────────┘
        │ intent: chitchat | rag | offtopic
        │ category: services | contact | ...
        ▼
   ┌────────────────────────────────────┐
   │         Retrieval Híbrido          │
   │                                    │
   │  ┌─────────────┐  ┌─────────────┐ │
   │  │  KNN Search │  │  FTS Search │ │
   │  │  (vectores) │  │  (texto)    │ │
   │  └──────┬──────┘  └──────┬──────┘ │
   │         └────────┬────────┘       │
   │                  ▼                │
   │             RRF Fusion            │
   └──────────────────┬────────────────┘
                      │ chunks rankeados
                      ▼
          ┌───────────────────────┐
          │  Off-topic Detector   │
          └───────────┬───────────┘
                      │ isOfftopic: true/false
                      ▼
               Chunks relevantes
```

---

## 1. Query Rewriter

**Problema que resuelve**: Si el usuario pregunta "¿y el horario?", esta query es demasiado vaga para buscar en la KB. El rewriter la expande usando el historial.

**Cuándo activa**:
- Sin historial: queries de 5 palabras o menos
- Con historial: queries cortas O que contienen pronombres/referencias (`eso`, `ahí`, `y el`, `qué más`, `cuándo`, etc.)

**Cómo funciona**:
1. Llama a Groq con el historial de los últimos 4 turnos
2. Prompt: "Devolvé solo la pregunta autocontenida reescrita (≤25 palabras)"
3. Timeout: 2 segundos
4. Si falla o tarda: concatena el último mensaje del usuario + la query actual (fallback heurístico)

**Ejemplo**:
```
Historial: "Preguntaste por cardiólogos"
Query:     "y los días que atienden?"
Reescrita: "¿Qué días atienden los cardiólogos?"
```

---

## 2. Router

**Propósito**: Clasificar el intent del mensaje para:
- Decidir si hacer retrieval o no (chitchat → no buscar)
- Filtrar la búsqueda por categoría (más preciso y rápido)

**Intents posibles**:

| Intent | Descripción | Acción |
|---|---|---|
| `chitchat` | Saludos, despedidas, agradecimientos | Sin retrieval, respuesta amable |
| `rag` | Pregunta sobre MutuaLyF | Retrieval completo |
| `offtopic` | Detectado como irrelevante por router | Sin retrieval |

**Clasificación de categoría**:
- Busca ~60 keywords hardcodeadas en 8 categorías
- Si ≥2 hits en una categoría → `categoryConfident = true` (filtra búsqueda)
- Si 1 hit → `categoryConfident = false` (busca en todo)

**K dinámico** (cantidad de chunks a recuperar):
- Query corta (< 6 palabras) → K=2
- Query compleja (> 18 palabras o varias cláusulas) → K=6
- Normal → K=4

---

## 3. Búsqueda KNN (vectores)

Busca por **similitud semántica**: encuentra chunks que hablan del mismo tema aunque usen palabras distintas.

```sql
SELECT chunk_id, 1 - (embedding <=> $query_vector) AS score
FROM kb_vectors
WHERE category = $category   -- solo si router fue confident
ORDER BY embedding <=> $query_vector
LIMIT $k * 3;                -- busca más para que RRF tenga más para fusionar
```

- Operador `<=>`: distancia coseno de pgvector
- Score resultante: entre 0 (totalmente distinto) y 1 (idéntico)
- Índice IVFFlat acelera la búsqueda en tablas grandes

---

## 4. Búsqueda FTS (texto completo)

Busca por **coincidencia léxica**: encuentra chunks que contienen exactamente las palabras buscadas.

```sql
SELECT chunk_id, ts_rank(to_tsvector('simple', content), query) AS score
FROM kb_vectors, to_tsquery('simple', $tsquery) AS query
WHERE to_tsvector('simple', content) @@ query
  AND category = $category
ORDER BY score DESC
LIMIT $k * 3;
```

**Construcción del tsquery** desde la query del usuario:
1. Normalizar (minúsculas, sin tildes): `"cardiólogos disponibles"` → `"cardiologos disponibles"`
2. Filtrar stopwords: `["de", "la", "el", "un", "que", ...]`
3. Expansión de plurales españoles:
   - `"especialidades"` → también busca `"especialidad"`
   - `"cardiólogos"` → también busca `"cardiolog"`
4. Prefix matching con `:*`: busca cualquier palabra que empiece con ese prefijo
5. Resultado: `cardiolog:* | cardiologo:* | especialidad:* | especialidades:*`

**Por qué parser `'simple'`**: No aplica stemming español (que puede distorsionar nombres propios como "Francia" → "franc"). Es más robusto para textos médicos y nombres de profesionales.

---

## 5. RRF Fusion (Reciprocal Rank Fusion)

Combina los resultados de KNN y FTS en un único ranking unificado.

**Fórmula**:
```
score_rrf(chunk) = Σ  1 / (60 + posición_en_ranking + 1)
                  sobre cada método que encontró el chunk
```

**Ejemplo**:
```
Chunk A aparece en KNN en posición 1 y FTS en posición 2:
  score = 1/(60+1+1) + 1/(60+2+1) = 0.0161 + 0.0157 = 0.0318

Chunk B solo aparece en KNN en posición 3:
  score = 1/(60+3+1) = 0.0156

Chunk A gana aunque B esté bien rankeado en KNN.
```

**Por qué RRF**:
- No requiere calibrar pesos entre métodos
- Robusto: un chunk que aparece en ambos rankings sube bastante
- Penaliza chunks que solo aparecen en uno

---

## 6. Off-topic Detector

Decide si, a pesar de que el retrieval encontró algo, la pregunta no es realmente sobre MutuaLyF.

### Bypasses (pasa directamente sin análisis)
- Hay historial de conversación → acepta (el LLM maneja el contexto)
- FTS encontró un match fuerte (score ≥ 0.1) → acepta (coincidencia léxica es señal fuerte)
- No se encontró ningún chunk → rechaza directamente
- Embeddings no disponibles → acepta con confianza 0.5

### Score ponderado
```
confianza = 0.4 × vec_norm
          + 0.3 × fts_norm
          + 0.2 × overlap_ratio
          + 0.1 × concentration
```

| Señal | Peso | Descripción |
|---|---|---|
| `vec_norm` | 40% | Score coseno del mejor chunk KNN, normalizado al target (0.55) |
| `fts_norm` | 30% | Score FTS del mejor chunk, normalizado al target (5.0) |
| `overlap_ratio` | 20% | % de chunks que aparecen en el top-5 de ambos métodos |
| `concentration` | 10% | Qué tan claro es el "ganador" vs el resto (gap relativo) |

### Umbral dinámico
- Base: 0.25 (si confianza < 0.25 → off-topic)
- Query corta (< 4 palabras): umbral × 0.6 (más permisivo, 0.15)
- Router con categoría confident: umbral × 0.7 (más permisivo, 0.175)

**Ejemplo**: pregunta "¿tienen cardiólogos?" con match fuerte en FTS
→ FTS veto activa → acepta directamente → pasa al LLM con contexto

---

## Caché del Retrieval

El resultado completo del pipeline (query → chunks) se guarda en caché LRU:
- TTL: 5 minutos
- Clave: `hash(normalizeText(query) + últimos 2 mensajes del historial)`
- Invalidado al ingestar un documento nuevo

Evita correr embeddings + búsquedas en PostgreSQL si la misma pregunta se repite.
