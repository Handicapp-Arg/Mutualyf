# Documentación del Bot de IA — MutuaLyF

Esta carpeta documenta el sistema de inteligencia artificial del chatbot de MutuaLyF, incluyendo el pipeline RAG completo, los modelos de lenguaje, la ingesta de documentos y la configuración.

## Índice

| Archivo | Descripción |
|---|---|
| [01-arquitectura.md](./01-arquitectura.md) | Visión general, componentes y diagrama de flujo |
| [02-flujo-mensaje.md](./02-flujo-mensaje.md) | Paso a paso de un mensaje desde el usuario hasta la respuesta |
| [03-ingestion.md](./03-ingestion.md) | Cómo se ingresan documentos, se dividen en chunks y se vectorizan |
| [04-embeddings.md](./04-embeddings.md) | Modelo de embeddings, caché en dos niveles y providers |
| [05-retrieval.md](./05-retrieval.md) | Pipeline de recuperación: router, rewriter, KNN, FTS, RRF y detector off-topic |
| [06-llm-cascade.md](./06-llm-cascade.md) | Cascada de modelos de lenguaje (Groq → Gemini → Ollama) |
| [07-quick-replies.md](./07-quick-replies.md) | Respuestas rápidas por palabras clave (sin IA) |
| [08-configuracion.md](./08-configuracion.md) | Variables de entorno y parámetros de tuning |

## Resumen en una línea

El bot recibe un mensaje → lo analiza con keywords y RAG híbrido (vectores + texto) → lo responde usando una cascada de modelos LLM (Groq → Gemini → Ollama), con caché en múltiples niveles para ser rápido y eficiente.
