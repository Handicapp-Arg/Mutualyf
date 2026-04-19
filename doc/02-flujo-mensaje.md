# Flujo Completo de un Mensaje

Descripción paso a paso de lo que ocurre cuando un usuario envía un mensaje al bot.

## Diagrama

```
Usuario: "¿Tienen cardiólogos disponibles?"
        │
        ▼
┌─────────────────────┐
│  1. QuickReply?     │ ← busca keywords en respuestas pregrabadas
└────────┬────────────┘
         │ No match
         ▼
┌─────────────────────┐
│  2. Keyword guard   │ ← ¿el mensaje tiene palabras de MutuaLyF?
└────────┬────────────┘
         │ Sí pasa
         ▼
┌─────────────────────────────────────────────────────┐
│  3. RAG Pipeline                                    │
│                                                     │
│   a) Query Rewriter                                 │
│      "¿Tienen cardiólogos disponibles?" → igual     │
│      (no es follow-up, no necesita reescritura)     │
│                                                     │
│   b) Router                                         │
│      detecta keyword "cardiolog" → categoría:       │
│      "services" (confident=true)                    │
│                                                     │
│   c) Embeddings                                     │
│      texto → vector Float32[768]                    │
│      (revisa caché L1/L2 primero)                   │
│                                                     │
│   d) Búsqueda KNN (vectores)                        │
│      pgvector: top-12 chunks más similares          │
│      filtrado por categoría "services"              │
│                                                     │
│   e) Búsqueda FTS (texto)                           │
│      PostgreSQL tsvector: busca "cardiolog"         │
│      con expansión de plurales                      │
│                                                     │
│   f) RRF Fusion                                     │
│      combina ranking KNN + FTS → top-4 chunks       │
│                                                     │
│   g) Off-topic detector                             │
│      topVecScore=0.72, FTS match → NO off-topic     │
│                                                     │
│   h) Hydrate chunks                                 │
│      recupera texto completo de los 4 chunks        │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  4. Construir System Prompt                         │
│                                                     │
│  [Personalidad del asistente configurable]          │
│  <doc id="1" category="services">                   │
│    ESPECIALIDAD | DIA | HORARIO | PROFESIONAL       │
│    CARDIOLOGIA  | LUN | 16:00...|  VIGNATTI AGUSTIN │
│    ...                                              │
│  </doc>                                             │
│  <doc id="2" ...>...</doc>                          │
└────────┬────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│  5. LLM Cascade (streaming SSE)                     │
│                                                     │
│  → Groq: llama-3.1-8b-instant (15s timeout)        │
│    "Sí, contamos con cardiólogos. El Dr. Vignatti   │
│    atiende los lunes a las 16:00..."                │
│                                                     │
│  (Si Groq falla → Gemini → Ollama → Fallback)       │
└────────┬────────────────────────────────────────────┘
         │ SSE chunks
         ▼
      Usuario recibe la respuesta en tiempo real
```

## Casos especiales

### Caso: Follow-up / Anáfora
```
Usuario: "y el horario de atención?"
              │
              ▼ QueryRewriter detecta pronombre/referencia corta
              │ Historia previa: preguntó por cardiólogos
              ▼
"¿Cuál es el horario de atención de cardiología?"
              │
              ▼ continúa flujo normal con query expandida
```

### Caso: Chitchat
```
Usuario: "hola, buenas!"
              │
              ▼ Router detecta CHITCHAT_RE
              │ No se hace retrieval
              ▼ Responde con tono amable (sin chunks)
```

### Caso: Off-topic
```
Usuario: "cuál es la capital de Francia?"
              │
              ▼ Keyword guard: 5 palabras, no tiene keywords MutuaLyF
              │ (umbral: 8 palabras para activar el guard)
              ▼ Off-topic: "Solo puedo ayudarte con consultas sobre MutuaLyF..."
```

### Caso: Pregunta sin contexto en KB
```
Usuario: "¿tienen servicio de emergencias 24hs?"
              │
              ▼ RAG retrieval → chunks encontrados pero score bajo
              ▼ Off-topic detector → baja confianza
              │ o
              ▼ Sin chunks relevantes en KB
              │
              ▼ Prompt instruye: "No inventes. Derivá al contacto."
              ▼ LLM responde: "No tengo información sobre eso. 
                               Para consultas contactá al 0800..."
```

## Tiempos esperados

| Etapa | Tiempo típico |
|---|---|
| QuickReply | < 5ms |
| Keyword guard | < 1ms |
| Query Rewrite (Groq) | 300-800ms |
| Embeddings (caché L1) | < 1ms |
| Embeddings (Ollama) | 50-200ms |
| KNN + FTS en PostgreSQL | 10-50ms |
| Groq respuesta (primer token) | 300-700ms |
| Gemini respuesta (primer token) | 500-1500ms |
| Ollama respuesta (primer token) | 1000-3000ms |
