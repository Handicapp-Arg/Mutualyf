import { useCallback } from 'react';

// Tipos para los eventos de analytics
export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export interface ChatAnalytics {
  message_sent: { user_message: string; message_length: number };
  quick_action_clicked: { action_type: string };
  cv_downloaded: { source: string };
  interview_scheduled: { source: string };
  user_identified: { user_name: string; confidence: number };
  conversation_started: { session_id: string };
  ai_response_received: { response_length: number; response_time: number };
  error_occurred: { error_type: string; error_message: string };
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    hj?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}

export const useAnalytics = () => {
  
  // Función genérica para enviar eventos
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    // Google Analytics 4
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.custom_parameters
      });
    }

    // Microsoft Clarity
    if (typeof window !== 'undefined' && window.clarity) {
      window.clarity('event', event.action);
    }

    // Hotjar
    if (typeof window !== 'undefined' && window.hj) {
      window.hj('event', event.action);
    }

    // Console para desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event);
    }
  }, []);

  // Eventos específicos del chat
  const trackChatMessage = useCallback((userMessage: string, aiResponse?: string, responseTime?: number) => {
    trackEvent({
      action: 'message_sent',
      category: 'Chat Interaction',
      label: 'user_message',
      value: userMessage.length,
      custom_parameters: {
        message_length: userMessage.length,
        has_ai_response: !!aiResponse,
        response_time: responseTime
      }
    });

    if (aiResponse && responseTime) {
      trackEvent({
        action: 'ai_response_received',
        category: 'Chat Interaction',
        label: 'ai_response',
        value: responseTime,
        custom_parameters: {
          response_length: aiResponse.length,
          response_time: responseTime
        }
      });
    }
  }, [trackEvent]);

  const trackQuickAction = useCallback((actionType: string) => {
    trackEvent({
      action: 'quick_action_clicked',
      category: 'User Engagement',
      label: actionType,
      custom_parameters: {
        action_type: actionType
      }
    });
  }, [trackEvent]);

  const trackCVDownload = useCallback((source: 'button' | 'chat' | 'animation') => {
    trackEvent({
      action: 'cv_downloaded',
      category: 'Conversion',
      label: source,
      value: 1,
      custom_parameters: {
        source: source,
        timestamp: new Date().toISOString()
      }
    });
  }, [trackEvent]);

  const trackInterviewScheduled = useCallback((source: 'button' | 'chat') => {
    trackEvent({
      action: 'interview_scheduled',
      category: 'Conversion',
      label: source,
      value: 1,
      custom_parameters: {
        source: source,
        timestamp: new Date().toISOString()
      }
    });
  }, [trackEvent]);

  const trackUserIdentified = useCallback((userName: string, confidence: number) => {
    trackEvent({
      action: 'user_identified',
      category: 'User Engagement',
      label: 'name_captured',
      value: Math.round(confidence * 100),
      custom_parameters: {
        user_name: userName,
        confidence: confidence,
        timestamp: new Date().toISOString()
      }
    });
  }, [trackEvent]);

  const trackConversationStarted = useCallback((sessionId: string) => {
    trackEvent({
      action: 'conversation_started',
      category: 'User Engagement',
      label: 'new_session',
      custom_parameters: {
        session_id: sessionId,
        timestamp: new Date().toISOString()
      }
    });
  }, [trackEvent]);

  const trackError = useCallback((errorType: string, errorMessage: string) => {
    trackEvent({
      action: 'error_occurred',
      category: 'Technical',
      label: errorType,
      custom_parameters: {
        error_type: errorType,
        error_message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }, [trackEvent]);

  const trackPageView = useCallback((pageName: string, additionalParams?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', 'G-XXXXXXXXXX', {
        page_title: pageName,
        page_location: window.location.href,
        ...additionalParams
      });
    }
  }, []);

  return {
    trackEvent,
    trackChatMessage,
    trackQuickAction,
    trackCVDownload,
    trackInterviewScheduled,
    trackUserIdentified,
    trackConversationStarted,
    trackError,
    trackPageView
  };
};

// Hook para métricas de performance
export const usePerformanceMetrics = () => {
  const { trackEvent } = useAnalytics();

  const trackPerformanceMetric = useCallback((metricName: string, value: number, unit: string = 'ms') => {
    trackEvent({
      action: 'performance_metric',
      category: 'Performance',
      label: metricName,
      value: Math.round(value),
      custom_parameters: {
        metric_name: metricName,
        metric_value: value,
        unit: unit,
        timestamp: new Date().toISOString()
      }
    });
  }, [trackEvent]);

  const trackLoadTime = useCallback((startTime: number, endTime: number, component: string) => {
    const loadTime = endTime - startTime;
    trackPerformanceMetric(`${component}_load_time`, loadTime);
  }, [trackPerformanceMetric]);

  return {
    trackPerformanceMetric,
    trackLoadTime
  };
};