/**
 * Ejemplos canónicos (utterances) para clasificación por prototipos (few-shot).
 *
 * Diferencia clave vs el viejo MUTUALYF_KEYWORDS:
 *   - NO son substrings ni reglas de matching léxico.
 *   - Son frases-ejemplo cuyos embeddings funcionan como prototipos de intent.
 *   - Una query nueva se compara por similitud coseno; matches parafraseados
 *     (ej. "sos una IA?" vs "sos una inteligencia artificial") funcionan sin
 *     aparecer literalmente en esta lista.
 *
 * Escalabilidad: los admins pueden agregar ejemplos adicionales en DB usando
 * las categorías especiales `_intent_meta` / `_intent_chitchat`. El clasificador
 * los mergea con este seed al construir prototipos, sin redeploy.
 */

export type IntentKind = "meta" | "chitchat" | "domain";

export interface IntentAnchor {
  kind: "meta" | "chitchat";
  utterance: string;
}

export const INTENT_ANCHORS: IntentAnchor[] = [
  // Meta — preguntas sobre el bot (identidad, capacidades, naturaleza)
  { kind: "meta", utterance: "sos una inteligencia artificial" },
  { kind: "meta", utterance: "sos una ia" },
  { kind: "meta", utterance: "sos un bot" },
  { kind: "meta", utterance: "sos humano o robot" },
  { kind: "meta", utterance: "quién sos" },
  { kind: "meta", utterance: "qué sos" },
  { kind: "meta", utterance: "cómo te llamás" },
  { kind: "meta", utterance: "cuál es tu nombre" },
  { kind: "meta", utterance: "qué podés hacer" },
  { kind: "meta", utterance: "en qué me podés ayudar" },
  { kind: "meta", utterance: "para qué servís" },
  { kind: "meta", utterance: "quién te creó" },
  { kind: "meta", utterance: "ayuda por favor" },
  { kind: "meta", utterance: "necesito que me ayudes" },

  // Chitchat — saludos, agradecimientos, despedidas, acknowledgements.
  // Incluye variantes cortas (single-token) porque sin ellas la similitud
  // coseno entre "hola" y frases largas tipo "hola qué tal" cae bajo el umbral.
  { kind: "chitchat", utterance: "hola" },
  { kind: "chitchat", utterance: "hola buenas" },
  { kind: "chitchat", utterance: "hola qué tal" },
  { kind: "chitchat", utterance: "buenas" },
  { kind: "chitchat", utterance: "buen día" },
  { kind: "chitchat", utterance: "buenas tardes" },
  { kind: "chitchat", utterance: "buenas noches" },
  { kind: "chitchat", utterance: "cómo estás" },
  { kind: "chitchat", utterance: "qué tal" },
  { kind: "chitchat", utterance: "gracias" },
  { kind: "chitchat", utterance: "muchas gracias" },
  { kind: "chitchat", utterance: "te agradezco" },
  { kind: "chitchat", utterance: "chau" },
  { kind: "chitchat", utterance: "chau nos vemos" },
  { kind: "chitchat", utterance: "adiós" },
  { kind: "chitchat", utterance: "hasta luego" },
  { kind: "chitchat", utterance: "dale" },
  { kind: "chitchat", utterance: "dale perfecto" },
  { kind: "chitchat", utterance: "ok" },
  { kind: "chitchat", utterance: "ok gracias" },
  { kind: "chitchat", utterance: "todo bien" },
  { kind: "chitchat", utterance: "genial" },
];
