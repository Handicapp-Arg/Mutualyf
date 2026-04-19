# Ingesta de Documentos

Describe cómo se procesa un documento desde que se sube hasta que queda disponible para el bot.

## Flujo de ingesta

```
Archivo PDF / TXT / Texto libre
        │
        ▼
1. Validación
   - Categoría válida (contact, services, payments, meds, procedure, legal, platform, general)
   - Título no vacío
   - Contenido extraído del archivo (si es PDF: pdf-parse)

        ▼
2. Deduplicación por hash
   - Se calcula SHA256 del contenido
   - Si ya existe un doc con ese hash exacto → error "documento duplicado"

        ▼
3. Versionado
   - Si ya existe un doc con el mismo `source` (nombre de archivo):
     → El doc anterior se marca como "archived"
     → El nuevo recibe versión = anterior + 1
   - Si es nuevo: versión = 1

        ▼
4. Chunking (división en fragmentos)
   - Se divide el texto en chunks de ~500 tokens con 80 tokens de overlap
   - Separadores en orden: párrafos (\n\n) → líneas (\n) → oraciones (". ") → palabras (" ")
   - Chunks mínimos: 20 caracteres
   - Estimación de tokens: longitud en chars / 4

        ▼
5. Sanitización
   - Cada chunk se analiza buscando intentos de prompt injection
   - Patrones como "ignora instrucciones", "actúa como", "system:" → reemplazados por [redacted]
   - Se eliminan caracteres de ancho cero

        ▼
6. Persistencia en DB
   - Se crea el KnowledgeDoc con sus KnowledgeChunks en una sola transacción
   - Cada chunk guarda: ord (posición), content (original), tokens, category, embModel

        ▼
7. Embedding y vectorización (async, en background)
   - Para cada chunk en lotes de 16:
     → Se genera el embedding con prefijo "search_document: "
     → Se normaliza el texto (sin tildes, minúsculas) para FTS
     → Se hace UPSERT en kb_vectors (chunk_id, embedding, content_norm, category)
   - Si falla el embedding de algún chunk → se loguea y continúa con los demás

        ▼
8. Invalidación de caché de retrieval
   - Se limpia el caché LRU de búsquedas para que el nuevo contenido sea visible
```

## Estructura de un chunk en la base de datos

```
KnowledgeChunk {
  id:           123          -- ID único
  docId:        45           -- KnowledgeDoc al que pertenece
  ord:          0            -- posición en el documento (0, 1, 2...)
  content:      "ESPECIALIDAD | DIA | HORARIO..."  -- texto original
  contentClean: "especialidad dia horario..."      -- normalizado (sin tildes)
  tokens:       492          -- estimación de tokens
  category:     "services"   -- heredada del documento
  embModel:     "nomic-embed-text:v2"
}
```

## Estructura en kb_vectors (PostgreSQL)

```sql
kb_vectors {
  chunk_id   INTEGER PRIMARY KEY,   -- FK a KnowledgeChunk.id
  embedding  vector(768),           -- vector de 768 dimensiones (pgvector)
  content    TEXT,                  -- texto normalizado (sin tildes) para FTS
  category   TEXT
}

-- Índice para búsqueda por similitud coseno (KNN)
CREATE INDEX ON kb_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists=10);

-- Índice para búsqueda de texto completo
CREATE INDEX ON kb_vectors USING gin (to_tsvector('simple', content));
```

## Arranque del servidor

Al iniciar el backend, `IngestionService.onModuleInit()` verifica si hay chunks sin vectorizar:
- Obtiene todos los chunks activos de la DB
- Obtiene todos los chunk_ids que ya tienen vector en `kb_vectors`
- Si hay diferencia → vectoriza los faltantes en background

Esto garantiza que si el servidor se reinicia, no se pierden vectores ni se rehace trabajo innecesario.

## Rebuild manual

Desde el portal admin se puede hacer un rebuild completo (`POST /admin/rag/rebuild`):
- Elimina todos los vectores existentes
- Recrea los índices
- Regenera embeddings para todos los chunks activos

Útil cuando:
- Se cambia el modelo de embeddings
- Se sospecha que los vectores están corruptos
- Se actualiza la normalización de texto

## Categorías disponibles

| Valor | Descripción |
|---|---|
| `contact` | Datos de contacto, dirección, teléfono |
| `services` | Especialidades médicas, profesionales, horarios |
| `payments` | Cuotas, pagos, facturación |
| `meds` | Medicamentos, cobertura farmacéutica |
| `procedure` | Trámites, autorizaciones, procedimientos |
| `legal` | Estatuto, reglamentos, normativa |
| `platform` | Uso de la app/plataforma digital |
| `general` | Información general, sin categoría específica |

La categoría se usa para:
1. Filtrar la búsqueda KNN y FTS (si el router detecta una categoría con confianza)
2. Mostrar la etiqueta en el portal admin
3. Enriquecer el contexto enviado al LLM (`<doc category="services">`)
