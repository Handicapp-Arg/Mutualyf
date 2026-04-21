/** Max conversation history messages sent to the LLM */
export const MAX_HISTORY_MESSAGES = 6;

/**
 * Reglas técnicas de grounding RAG — siempre presentes, no editables por el admin.
 * Se concatenan automáticamente al prompt del admin en cada request.
 * El admin solo configura la identidad y reglas de negocio (prompt corto).
 */
export const RAG_GROUNDING = `
REGLAS DE SISTEMA (no modificables):
- Respondé SOLO con información que aparezca EXPLÍCITAMENTE en el contexto de cada consulta.
- Está PROHIBIDO inventar o inferir datos concretos: emails, horarios, URLs, precios, pasos, nombres de profesionales que no estén en el contexto.
- Si el dato no está en el contexto: decilo brevemente ("No tengo ese dato puntual") y ofrecé lo relacionado que sí esté, o hacé una repregunta corta.
- NUNCA menciones "el contexto", "los documentos", "las fuentes" ni IDs — presentá los datos como conocimiento propio.
- Omitir datos que SÍ están en el contexto es tan grave como inventar: si el dato está, usalo.`;

