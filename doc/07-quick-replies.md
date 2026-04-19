# Respuestas Rápidas (Quick Replies)

Las Quick Replies son respuestas pregrabadas que se activan instantáneamente cuando el mensaje del usuario contiene una palabra clave específica. **No pasan por ningún modelo de IA**, por lo que son prácticamente instantáneas (< 5ms).

## Cuándo usar Quick Replies

Son ideales para preguntas frecuentes con respuesta fija:
- Horarios de atención al público
- Número de teléfono / WhatsApp
- Dirección física
- Cómo solicitar un turno
- Cómo pagar la cuota

No son adecuadas para preguntas que requieren contexto o varían según el usuario.

## Cómo funcionan

```
Mensaje del usuario: "cuál es el horario de atención?"
        │
        ▼
Normalización: "cual es el horario de atencion?"
        │
        ▼
Itera Quick Replies activas (ordenadas por prioridad desc):
  ┌─────────────────────────────────────────┐
  │  QuickReply #1  priority=10             │
  │  keywords: ["horario", "atienden"]      │
  │  match: "horario" ∈ mensaje? → SÍ      │
  └─────────────────────────────────────────┘
        │ Match encontrado
        ▼
Responde con el texto pregrabado (sin LLM)
```

**Reglas de matching**:
- Keyword de **una sola palabra**: usa word-boundary regex (`\bhorario\b`) para evitar falsos positivos ("en horario" sí, pero no "deshora")
- Keyword de **varias palabras** (ej: "solicitar turno"): usa `includes()` directamente (ya es específica)
- Matchea la **primera** entrada cuya keyword esté en el mensaje, en orden de prioridad

## Configuración desde el portal

En el portal admin → **Conocimiento → Respuestas rápidas** se pueden:
- Crear nuevas respuestas
- Editar keywords y texto
- Cambiar la prioridad (mayor número = se evalúa primero)
- Activar / desactivar

**Ejemplo de configuración**:
```
Keywords:  horario, atienden, abierto, abren
Prioridad: 10
Respuesta:
  **Horarios de atención:**
  Lunes a viernes: 8:00 a 20:00
  Sábados: 8:00 a 13:00
```

## Soporte Markdown

El campo de respuesta soporta Markdown básico:
- `**texto**` → **negrita**
- Listas con `-` o `*`
- Saltos de línea con `\n`

El frontend renderiza el Markdown del bot automáticamente.

## Caché en memoria

Las Quick Replies se cargan en memoria al iniciar y se actualizan cada vez que se guarda un cambio desde el portal. No se consulta la DB en cada mensaje.
