/**
 * Environment configuration
 * Centralized access to environment variables
 */

export const env = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY,
  groqApiKey: import.meta.env.VITE_GROQ_API_KEY,
  ollamaUrl: import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: import.meta.env.VITE_OLLAMA_MODEL || 'chill', // Custom model con identidad Chill
} as const;
