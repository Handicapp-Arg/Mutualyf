export type Category =
  | "contact"
  | "services"
  | "payments"
  | "meds"
  | "procedure"
  | "legal"
  | "platform"
  | "general";

export const CATEGORIES: Category[] = [
  "contact",
  "services",
  "payments",
  "meds",
  "procedure",
  "legal",
  "platform",
  "general",
];

export interface ChatMsg {
  role: string;
  content: string;
}

export interface Hit {
  chunkId: number;
  score: number;
}

export interface HydratedChunk {
  id: number;
  content: string;
  contentClean: string;
  category: string;
  source: string;
  docTitle: string;
  tokens: number;
}

export type IntentKind = "chitchat" | "rag" | "offtopic";

export interface Intent {
  kind: IntentKind;
  category?: Category;
  categoryConfident: boolean;
}

export interface RetrievalResult {
  chunks: HydratedChunk[];
  topScore: number;
  intent: Intent;
  rewritten: string;
  latencyMs: number;
  k: number;
}
