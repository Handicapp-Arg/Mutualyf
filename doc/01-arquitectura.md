# Arquitectura General del Bot

## Componentes principales

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                 Chat widget → POST /api/ai/chat                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ SSE streaming
┌───────────────────────────────▼─────────────────────────────────┐
│                     AI CONTROLLER (NestJS)                      │
│                                                                 │
│  1. QuickReplyService    → respuesta instantánea por keywords   │
│  2. Keyword guard        → filtro rápido sin IA                 │
│  3. RagService.prepare() → construye el prompt enriquecido      │
│  4. LLM Cascade          → Groq → Gemini → Ollama              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                       RAG PIPELINE                              │
│                                                                 │
│  QueryRewriter  →  Router  →  Embeddings  →  VectorStore       │
│                                   ↓              ↓             │
│                              KNN search      FTS search        │
│                                   └──── RRF fusion ────┘       │
│                                           ↓                    │
│                              OfftopicDetector                  │
│                                           ↓                    │
│                              Chunks relevantes                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                     BASE DE DATOS (PostgreSQL)                  │
│                                                                 │
│  KnowledgeDoc  KnowledgeChunk  kb_vectors (pgvector)           │
│  QueryCache    RetrievalLog    QuickReply  AiConfig             │
└─────────────────────────────────────────────────────────────────┘
```

## Capas del sistema

### Capa 1: Respuestas instantáneas (0ms)
Las **QuickReplies** son respuestas pregrabadas que se activan cuando el mensaje del usuario contiene una palabra clave específica. No pasan por ningún modelo de IA. Son ideales para preguntas frecuentes (horarios, dirección, teléfono).

### Capa 2: Filtro de off-topic por keywords
Antes de gastar tokens en IA, el sistema verifica si el mensaje de más de 8 palabras contiene al menos una keyword relacionada con MutuaLyF (salud, médico, turno, cobertura, etc.). Si no tiene ninguna, responde directamente que solo puede ayudar con temas de la mutual.

### Capa 3: Pipeline RAG
**RAG = Retrieval-Augmented Generation.** En lugar de que el modelo LLM invente respuestas, primero se busca información real en la base de conocimiento y se inyecta como contexto en el prompt.

El pipeline tiene varios subcomponentes:
- **Query Rewriter**: reescribe el mensaje si es un follow-up ("y el horario?") para que sea una pregunta completa ("¿cuál es el horario de atención?")
- **Router**: clasifica el tema del mensaje (contacto, servicios, pagos, medicamentos, etc.)
- **Retrieval híbrido**: busca chunks relevantes por similitud semántica (KNN) Y por coincidencia de texto (FTS), luego combina ambos resultados
- **Off-topic detector**: analiza las señales numéricas del retrieval para decidir si la pregunta es realmente sobre MutuaLyF

### Capa 4: Cascada de LLMs
Con el contexto preparado, se intenta generar la respuesta en este orden:
1. **Groq** (llama-3.1-8b-instant) — el más rápido, 500k tokens/día gratis
2. **Gemini** (gemini-2.5-flash) — si Groq falla
3. **Ollama** con streaming — modelo local (phi3), si Gemini falla
4. **Ollama** sin streaming — reintento
5. **Fallback hardcoded** — si todo falla, responde con datos de contacto

## Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Backend | NestJS (TypeScript) |
| Base de datos | PostgreSQL + pgvector |
| ORM | Prisma |
| Embeddings | Ollama (nomic-embed-text, 768 dims) |
| LLM primario | Groq API (llama-3.1-8b-instant) |
| LLM secundario | Google Gemini (gemini-2.5-flash) |
| LLM local | Ollama (phi3) |
| Frontend | React + TailwindCSS |
| Streaming | Server-Sent Events (SSE) |
