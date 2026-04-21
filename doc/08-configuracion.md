# Configuración y Parámetros

## Variables de entorno del backend

### LLMs
| Variable | Default | Descripción |
|---|---|---|
| `GROQ_API_KEY` | — | API key de Groq (requerida) |
| `GEMINI_API_KEY` | — | API key de Google Gemini (requerida) |
| `OLLAMA_HOST` | `http://localhost:11434` | URL del servidor Ollama |
| `OLLAMA_MODEL` | `phi3:latest` | Modelo de Ollama para chat |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Modelo de embeddings |
| `EMBEDDING_DIM` | `768` | Dimensiones del vector de embedding |

### Base de datos
| Variable | Default | Descripción |
|---|---|---|
| `DATABASE_URL` | — | Conexión PostgreSQL (requerida) |

### Retrieval
| Variable | Default | Descripción |
|---|---|---|
| `RAG_RRF_K` | `60` | Parámetro K del algoritmo RRF |
| `RAG_K_SMALL` | `2` | Chunks a recuperar en queries cortas |
| `RAG_K_MEDIUM` | `4` | Chunks a recuperar en queries normales |
| `RAG_K_LARGE` | `6` | Chunks a recuperar en queries complejas |
| `RAG_CONTEXT_TOKEN_BUDGET` | `1200` | Máximo de tokens inyectados como contexto |
| `RAG_MAX_HISTORY` | `6` | Mensajes de historial enviados al LLM |

### Chunking
| Variable | Default | Descripción |
|---|---|---|
| `RAG_CHUNK_SIZE` | `500` | Tamaño máximo de un chunk (en tokens) |
| `RAG_CHUNK_OVERLAP` | `80` | Overlap entre chunks consecutivos |

### Caché de embeddings
| Variable | Default | Descripción |
|---|---|---|
| `RAG_LRU_MAX` | `2000` | Entradas máximas en caché L1 (in-process) |
| `RAG_LRU_TTL_MS` | `3600000` | TTL del caché L1 (1 hora en ms) |

### Query Rewriter
| Variable | Default | Descripción |
|---|---|---|
| `RAG_ENABLE_REWRITER` | `true` | Activar/desactivar el rewriter de queries |
| `RAG_REWRITE_TIMEOUT_MS` | `2000` | Timeout para reescritura con Groq (ms) |

### Off-topic Detector
| Variable | Default | Descripción |
|---|---|---|
| `RAG_ENABLE_OFFTOPIC` | `true` | Activar/desactivar el detector |
| `RAG_OFFTOPIC_BASE` | `0.25` | Umbral base de confianza (0-1) |
| `RAG_OFFTOPIC_W_VEC` | `0.4` | Peso del score de vectores |
| `RAG_OFFTOPIC_W_FTS` | `0.3` | Peso del score FTS |
| `RAG_OFFTOPIC_W_OVERLAP` | `0.2` | Peso del overlap ratio |
| `RAG_OFFTOPIC_W_CONC` | `0.1` | Peso de la concentración |
| `RAG_OFFTOPIC_VEC_TARGET` | `0.55` | Score vec considerado "plenamente relevante" |
| `RAG_OFFTOPIC_FTS_TARGET` | `5` | Score FTS considerado "plenamente relevante" |
| `RAG_OFFTOPIC_FTS_VETO` | `0.1` | Score FTS que veta el detector (acepta directo) |
| `RAG_OFFTOPIC_SHORT_WORDS` | `4` | Queries de ≤ N palabras usan umbral relajado |
| `RAG_OFFTOPIC_SHORT_RELAX` | `0.6` | Multiplicador de umbral para queries cortas |
| `RAG_OFFTOPIC_ROUTER_RELAX` | `0.7` | Multiplicador cuando router es confident |
| `RAG_OFFTOPIC_OVERLAP_N` | `5` | Top-N para calcular overlap ratio |

---

## Configuración desde el portal admin

En **Portal → Configuración de IA** se puede ajustar sin tocar código ni reiniciar:

### Personalidad del asistente (System Prompt)
Texto libre que define el comportamiento del bot. Se inyecta al inicio de cada conversación como instrucción al LLM.

Ejemplos de cosas a configurar aquí:
- Nombre del bot ("Sos el asistente de MutuaLyF")
- Tono ("amable y profesional")
- Restricciones ("No inventes información")
- Idioma ("Respondé siempre en español")

### Creatividad (Temperature)
- **Rango**: 0.0 a 2.0
- **0.0 - 0.3** (Exacto): respuestas muy consistentes y predecibles. Ideal para datos precisos.
- **0.4 - 0.7** (Equilibrado): balance entre precisión y naturalidad. Recomendado.
- **0.8 - 2.0** (Creativo): más variedad y expresividad. Puede generar imprecisiones.

### Extensión de respuestas (Max Tokens)
- **Rango**: 100 a 4096 tokens
- **≤ 300** (Corta): 1-2 oraciones
- **301 - 800** (Media): 2-4 párrafos. Recomendado para uso general.
- **> 800** (Larga): respuestas detalladas. Consume más cuota de API.

---

## Tuning recomendado por escenario

### Bot de consultas rápidas (horarios, teléfonos)
- Configurar Quick Replies para las preguntas más frecuentes
- Temperature: 0.3 (respuestas consistentes)
- Max Tokens: 300 (respuestas cortas)

### Bot de información general (especialidades, coberturas)
- Subir documentos bien organizados por categoría
- Temperature: 0.7 (balance)
- Max Tokens: 800 (puede necesitar listar opciones)

### Bot de trámites y procedimientos
- Documentos de procedure con pasos numerados
- Temperature: 0.4 (preciso)
- Max Tokens: 1200 (puede ser complejo)

---

## Consideraciones sobre las cuotas

| Proveedor | Modelo | Cuota gratuita | Límite de tokens por request |
|---|---|---|---|
| Groq | llama-3.1-8b-instant | 500k tokens/día | 8192 |
| Gemini | gemini-2.5-flash | ~1M tokens/día (varía) | 8192 |
| Ollama | phi3:latest | Sin límite (local) | 2048 |

Si el sistema está respondiendo con Gemini u Ollama frecuentemente, es señal de que se está agotando la cuota de Groq. Verificar en [console.groq.com](https://console.groq.com).
