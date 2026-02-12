/**
 * Conversation context and memory management
 */

export interface ConversationContext {
  userName?: string;
  messageCount: number;
  topics: string[];
  lastInteractionTime?: Date;
  nameAskedCount?: number; // Contador de veces que se preguntó el nombre
}

export class ConversationMemory {
  private context: ConversationContext = {
    messageCount: 0,
    topics: [],
    nameAskedCount: 0
  };

  // Detect if user shared their name
  extractName(message: string): string | undefined {
    const lowerMsg = message.toLowerCase();
    
    // 🚫 PALABRAS PROHIBIDAS - NO SON NOMBRES
    const forbiddenWords = [
      'hola', 'hello', 'hi', 'hey', 'buenas', 'buenos', 'good', 
      'gracias', 'thanks', 'por', 'favor', 'please', 'sorry',
      'que', 'what', 'como', 'how', 'cuando', 'where', 'quien',
      'javascript', 'python', 'react', 'backend', 'frontend'
    ];
    
    // Patterns for name introduction - MUY ESPECÍFICOS
    const patterns = [
      /(?:soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
      /(?:llámame|dime)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        
        // 🛡️ VALIDAR QUE NO SEA PALABRA PROHIBIDA
        if (!forbiddenWords.includes(name.toLowerCase()) && name.length >= 2 && name.length <= 20) {
          return name;
        }
      }
    }

    return undefined;
  }

  // Update context with new message
  updateContext(userMessage: string, aiResponse: string) {
    this.context.messageCount++;
    
    // Try to extract name
    const name = this.extractName(userMessage);
    if (name && !this.context.userName) {
      this.context.userName = name;
    }

    // Extract topics (simple keyword extraction)
    const keywords = this.extractKeywords(userMessage);
    keywords.forEach(keyword => {
      if (!this.context.topics.includes(keyword)) {
        this.context.topics.push(keyword);
      }
    });

    this.context.lastInteractionTime = new Date();
  }

  // Simple keyword extraction
  private extractKeywords(text: string): string[] {
    const commonWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'que', 'como', 'con', 'para', 'por'];
    const words = text.toLowerCase().split(/\s+/);
    return words
      .filter(w => w.length > 4 && !commonWords.includes(w))
      .slice(0, 5); // Keep top 5
  }

  // Get context for the AI
  getContext(): ConversationContext {
    return { ...this.context };
  }

  // Reset context (new conversation)
  reset() {
    this.context = {
      messageCount: 0,
      topics: [],
      nameAskedCount: 0
    };
  }

  // Check if this is the first message
  isFirstMessage(): boolean {
    return this.context.messageCount === 0;
  }

  // Incrementar contador de veces que se preguntó el nombre
  incrementNameAsked() {
    this.context.nameAskedCount = (this.context.nameAskedCount || 0) + 1;
  }

  // Verificar si debería preguntar el nombre
  shouldAskName(): boolean {
    const hasName = !!this.context.userName;
    const askedCount = this.context.nameAskedCount || 0;
    const messageCount = this.context.messageCount;

    // No preguntar si ya tiene nombre
    if (hasName) return false;

    // No preguntar si ya se preguntó 3 veces
    if (askedCount >= 3) return false;

    // Preguntar en mensaje 2, 5, y 10 (sutilmente)
    if (askedCount === 0 && messageCount === 2) return true; // Primera vez
    if (askedCount === 1 && messageCount === 5) return true; // Segunda vez
    if (askedCount === 2 && messageCount === 10) return true; // Tercera vez

    return false;
  }
}
