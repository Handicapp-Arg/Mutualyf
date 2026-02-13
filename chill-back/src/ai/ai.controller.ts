import { Controller, Post, Body, InternalServerErrorException } from '@nestjs/common';
import fetch from 'node-fetch';
import { GeminiService } from './gemini.service';

@Controller('ai')
export class AiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Post('gemini')
  async gemini(@Body() body: any) {
    const { history, newMessage, userName } = body;
    const response = await this.geminiService.generateResponse(history, newMessage, userName);
    return { response };
  }

  @Post('grok')
  async grok(@Body() body: any) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new InternalServerErrorException('Groq API key not configured');
    const { history, newMessage, userName } = body;
    // Construir el prompt para Groq (modelo llama3-8b)
    const prompt = [
      ...(history || []).map((msg) => `${msg.role === 'user' ? 'Usuario' : 'Bot'}: ${msg.content}`),
      userName ? `Usuario (${userName}): ${newMessage}` : `Usuario: ${newMessage}`
    ].join('\n');
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'Eres un asistente útil y profesional.' },
            ...((history || []).map((msg) => ({ role: msg.role, content: msg.content }))),
            { role: 'user', content: newMessage }
          ],
          max_tokens: 512
        })
      });
      if (!res.ok) {
        let errorMsg = `Groq API error: ${res.status}`;
        try {
          const errData = await res.json();
          errorMsg += ' - ' + JSON.stringify(errData);
        } catch {}
        throw new InternalServerErrorException(errorMsg);
      }
      const data = await res.json();
      if (data && typeof data === 'object' && Array.isArray((data as any).choices)) {
        return { response: (data as any).choices[0]?.message?.content || 'Sin respuesta de Groq.' };
      }
      return { response: 'Sin respuesta de Groq.' };
    } catch (e) {
      throw new InternalServerErrorException('Error al consultar Groq: ' + (e instanceof Error ? e.message : e));
    }
  }

  @Post('ollama')
  async ollama(@Body() body: any) {
    // Implementa lógica real de Ollama aquí
    return { response: `Ollama recibió: ${body.newMessage}` };
  }
}
