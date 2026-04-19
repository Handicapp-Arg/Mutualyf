# Embeddings y Caché

Los embeddings son representaciones numéricas de texto que capturan el significado semántico. Dos textos sobre el mismo tema tendrán vectores similares aunque usen palabras distintas.

## Modelo utilizado

**nomic-embed-text** (versión v1.5)
- Dimensiones: **768**
- Proveedor: Ollama (local)
- Arquitectura: BERT-based, optimizado para recuperación de información

### Prefijos obligatorios
El modelo `nomic-embed-text` requiere prefijos distintos según el uso:

| Uso | Prefijo | Ejemplo |
|---|---|---|
| Documentos (ingesta) | `search_document: ` | `"search_document: CARDIOLOGIA LUN 16:00..."` |
| Consultas (búsqueda) | `search_query: ` | `"search_query: cardiólogos disponibles"` |

Sin estos prefijos el rendimiento baja ~10-20%. Es la forma en que el modelo distingue si está indexando o buscando.

## Caché en dos niveles

Los embeddings son costosos de calcular (requieren un modelo ~270MB en Ollama). Se guardan en caché para no recalcularlos.

```
Solicitud de embedding para texto X
        │
        ▼
┌──────────────────────────────────┐
│  L1: LRU Cache (in-process)      │
│  2000 entradas máx               │
│  TTL: 1 hora                     │
│  Almacena: Float32Array          │
└────────────┬─────────────────────┘
             │ Miss
             ▼
┌──────────────────────────────────┐
│  L2: QueryCache (PostgreSQL)     │
│  Sin límite de entradas          │
│  Sin TTL (persistente)           │
│  Almacena: Buffer binario        │
│  Registra: hitCount para stats   │
└────────────┬─────────────────────┘
             │ Miss
             ▼
┌──────────────────────────────────┐
│  Provider: Ollama (primario)     │
│  POST /api/embed                 │
│  Timeout: 15s                    │
│  Retry: 3 veces (200/400/800ms)  │
└────────────┬─────────────────────┘
             │ Fallo
             ▼
┌──────────────────────────────────┐
│  Fallback: Gemini                │
│  text-embedding-004              │
│  Timeout: 8s                     │
└──────────────────────────────────┘
```

### Clave del caché
```
SHA1("nomic-embed-text:v2" + "::" + "query" + "::" + normalizeText(texto))
```

La normalización elimina tildes y pone en minúsculas, así "cardiología" y "cardiologia" generan la misma clave de caché.

## Arranque del servidor

Al iniciar, `EmbeddingsService.onModuleInit()`:
1. Hace un **preflight**: calcula un embedding de prueba y verifica que tenga 768 dimensiones
2. Si el modelo no está disponible: intenta descargarlo con `ollama pull`
3. Detecta chunks en DB con modelo de embedding distinto (versión antigua) → los marca para re-vectorización
4. **Warmup de Ollama**: envía el system prompt al modelo para que cachee el KV state y las primeras respuestas sean más rápidas

## Normalización de texto

Antes de calcular el embedding o guardar en caché, el texto se normaliza con `normalizeText()`:

```typescript
// text-utils.ts
normalizeText("¿Tienen cardiólogos?")
// → "tienen cardiologos?"

// Pasos:
// 1. trim()
// 2. toLowerCase()
// 3. NFD decomposition (separa letra + tilde)
// 4. elimina caracteres diacríticos [\u0300-\u036f]
// 5. colapsa espacios múltiples
```

Esto garantiza que "Cardiología", "cardiología" y "cardiologia" sean tratados como la misma consulta y compartan caché.
