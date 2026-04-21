# Cascada de Modelos LLM

El sistema intenta generar la respuesta en orden de preferencia. Si uno falla (timeout, límite de tokens, error), pasa al siguiente automáticamente.

## Orden de la cascada

```
1. Groq (llama-3.1-8b-instant)
        │ timeout 15s
        │ Si falla →
2. Gemini (gemini-2.5-flash)
        │ timeout 20s
        │ Si falla →
3. Ollama streaming (phi3)
        │ timeout 30s
        │ Si falla →
4. Ollama sin streaming (phi3)
        │ retry sin stream
        │ Si falla →
5. Fallback hardcoded
        → "Lo siento, estoy teniendo dificultades técnicas.
           Por favor contactá a MutuaLyF al 0800..."
```

## 1. Groq

**Modelo**: `llama-3.1-8b-instant`
**Cuota**: 500.000 tokens/día (gratuito)
**API**: Compatible con OpenAI (`/openai/v1/chat/completions`)

Por qué es el primero: es el más rápido (respuesta en ~300-700ms primer token) y tiene la mayor cuota diaria gratuita.

Parámetros que manda:
```
temperature: configurable desde portal admin (default 0.7)
max_tokens:  configurable desde portal admin (default 800)
stream:      true (SSE)
```

## 2. Gemini

**Modelo**: `gemini-2.5-flash`
**API**: Google Generative AI
**Uso adicional**: También analiza órdenes médicas (OCR + interpretación)

Activa cuando Groq falla (límite diario agotado, timeout, error de red).

## 3. Ollama

**Modelo**: `phi3:latest` (configurable por env `OLLAMA_MODEL`)
**URL**: `http://localhost:11434` (configurable por env `OLLAMA_HOST`)
**Contexto**: 2048 tokens

Ollama corre localmente, no depende de internet ni tiene cuotas. Es el último recurso cuando los servicios en la nube fallan.

**Early-stop en streaming**: Si detecta patrones de basura que genera phi3 a veces (`\n---` repetido o `\n\n\n`), corta el stream antes de enviar texto sin sentido al usuario.

**Warmup al iniciar**: Al arrancar el servidor, el backend envía el system prompt al modelo Ollama para que pre-calcule el KV cache. Las primeras respuestas son más rápidas.

## System Prompt

El prompt que recibe el LLM tiene esta estructura:

```
[Personalidad configurable desde portal admin]
Ejemplo:
"Sos el asistente virtual de MutuaLyF. Respondé en español con tono amable 
y profesional. No inventes información que no tengas disponible."

---

[Instrucción de longitud]
"Respondé de forma concisa."  (si la query es corta)
"Podés dar una respuesta más completa."  (si la query es compleja)

---

[Contexto del RAG - solo si hay chunks relevantes]
<doc id="1" category="services" source="horarios.pdf">
  CARDIOLOGIA | LUNES | 16:00 a 16:30 | VIGNATTI AGUSTIN
  CARDIOLOGIA | MARTES | 13:00 a 14:15 | GARELLO EVANGELINA
</doc>
<doc id="2" category="services" source="horarios.pdf">
  ...
</doc>

[Si no hay contexto]
"No tenés información específica sobre esto. No inventes datos.
 Derivá al usuario al contacto de MutuaLyF."
```

**Presupuesto de tokens para chunks**: Máximo 1200 tokens de contexto inyectado. Si los chunks superan ese límite, se truncan del final (los menos relevantes quedan afuera).

## Historial de conversación

El LLM recibe los últimos 6 mensajes del historial (configurable). Esto permite:
- Mantener coherencia en conversaciones largas
- Responder follow-ups ("¿y los martes?")

## Streaming SSE

La respuesta se envía al cliente en tiempo real usando Server-Sent Events:
```
data: {"type":"chunk","content":"Sí"}
data: {"type":"chunk","content":", contamos"}
data: {"type":"chunk","content":" con cardiólogos"}
...
data: {"type":"done"}
```

El usuario ve el texto aparecer progresivamente en lugar de esperar toda la respuesta junta.

## Diagnóstico de fallos

Si todos los modelos fallan, el sistema loguea un reporte con:
- Qué modelos fallaron y por qué
- El mensaje del usuario
- Las señales del retrieval (scores, intent, categoría)

Esto permite debuggear qué salió mal en producción.
