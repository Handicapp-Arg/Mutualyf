import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface FeedbackData {
  feedback: 'positive' | 'negative' | string;
  userMessage?: string;
  botResponse?: string;
  userSession?: {
    id?: string;
    ip?: string;
    name?: string;
  };
  timestamp: number;
}

export async function saveFeedback(feedbackData: FeedbackData) {
  try {
    const response = await axios.post(`${API_URL}/feedback`, feedbackData);
    return response.data;
  } catch (error) {
    console.error('Error saving feedback:', error);
    // Guardar localmente si el backend no está disponible
    const localFeedbacks = JSON.parse(localStorage.getItem('pending_feedbacks') || '[]');
    localFeedbacks.push({ ...feedbackData, savedAt: Date.now() });
    localStorage.setItem('pending_feedbacks', JSON.stringify(localFeedbacks));
    return { saved: 'locally' };
  }
}

export async function getFeedbackStats() {
  try {
    const response = await axios.get(`${API_URL}/feedback/stats`);
    return response.data;
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    return null;
  }
}
