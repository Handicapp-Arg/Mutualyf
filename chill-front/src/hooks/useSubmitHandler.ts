import React, { useCallback } from 'react';
import { ChatMessage } from '../types';
import orchestrator from '../services/aiOrchestratorInstance';
import { 
  detectAndSaveUserName, 
  getCurrentUserName, 
  saveConversation, 
  getCurrentFingerprint,
  updateBotContext 
} from '../services/userPersistenceService';

interface UseSubmitHandlerOptions {
  addMessage: (msg: ChatMessage) => void;
  setInputText: (text: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  isLoading: boolean;
  inputText: string;
  handleErrorMessage: () => void;
  sessionId?: string;
  messages?: ChatMessage[]; // Historial de mensajes para contexto
}

export function useSubmitHandler(options: UseSubmitHandlerOptions & { handleDownloadCVClick?: () => void }) {
  const { addMessage, setInputText, setIsLoading, setIsGenerating, isLoading, inputText, handleErrorMessage, handleDownloadCVClick, sessionId, messages = [] } = options;
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const userText = inputText.trim();
    setInputText('');
    
    // 📝 Obtener el último mensaje del bot para contexto
    const lastBotMessage = [...messages].reverse().find(m => m.role === 'model')?.text;
    
    // 🔍 Detectar y guardar nombre del usuario si lo menciona
    // Pasamos el último mensaje del bot para detección contextual
    const nombreDetectado = await detectAndSaveUserName(userText, lastBotMessage);
    if (nombreDetectado) {
      console.log(`✅ Nombre guardado para futuras visitas: ${nombreDetectado}`);
    }
    
    // Obtener nombre actual para pasar al orquestador
    const userName = getCurrentUserName();
    
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
    };
    addMessage(newUserMessage);
    setIsLoading(true);
    setIsGenerating(true);
    
    try {
      let fullResponse = '';
      // Pasar el nombre del usuario al orquestador
      for await (const chunk of orchestrator.streamChat([], userText, undefined, userName || undefined)) {
        fullResponse += chunk;
      }
      
      // Detectar intención de CV en la respuesta de la IA
      const cvKeywords = ['cv', 'currículum', 'curriculum', 'resume', 'descargar cv'];
      const userAskedForCV = cvKeywords.some(k => userText.toLowerCase().includes(k));
      const aiSuggestsCV = cvKeywords.some(k => fullResponse.toLowerCase().includes(k));
      
      if ((userAskedForCV || aiSuggestsCV) && handleDownloadCVClick) {
        handleDownloadCVClick();
      } else if (fullResponse.trim()) {
        addMessage({
          id: Date.now().toString() + '-model',
          role: 'model',
          text: fullResponse,
        });
        
        // 🧠 Actualizar contexto del bot para próxima detección de nombres
        updateBotContext(fullResponse);
        
        // 💾 Guardar conversación en la base de datos
        const currentSessionId = sessionId || getCurrentFingerprint() || 'anonymous';
        await saveConversation(currentSessionId, userText, fullResponse, 'ollama');
      } else {
        handleErrorMessage();
      }
    } catch (error) {
      console.error('Error en el flujo de IA:', error);
      handleErrorMessage();
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [addMessage, setInputText, setIsLoading, setIsGenerating, isLoading, inputText, handleErrorMessage, handleDownloadCVClick, sessionId, messages]);

  return { handleSubmit };
}
