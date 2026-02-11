/**
 * Constantes de la aplicación
 * Centraliza valores constantes para mejor mantenibilidad
 */

export const APP_CONSTANTS = {
  // Información de la aplicación
  APP_NAME: 'Chill Backend',
  APP_VERSION: '2.0.0',
  APP_DESCRIPTION: 'Backend profesional para chatbot con IA',

  // Límites de validación
  VALIDATION: {
    USER_NAME_MIN_LENGTH: 1,
    USER_NAME_MAX_LENGTH: 100,
    FINGERPRINT_MIN_LENGTH: 10,
    FINGERPRINT_MAX_LENGTH: 200,
    USER_MESSAGE_MAX_LENGTH: 5000,
    BOT_RESPONSE_MAX_LENGTH: 10000,
    USER_AGENT_MAX_LENGTH: 500,
  },

  // Configuración de paginación
  PAGINATION: {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 200,
  },

  // Configuración de sesiones
  SESSIONS: {
    ACTIVE_THRESHOLD_HOURS: 24,
    WEEKLY_THRESHOLD_HOURS: 168,
  },

  // Mensajes de éxito
  SUCCESS_MESSAGES: {
    USER_CREATED: 'Usuario creado exitosamente',
    USER_UPDATED: 'Usuario actualizado exitosamente',
    NAME_UPDATED: 'Nombre de usuario actualizado exitosamente',
    CONVERSATION_SAVED: 'Conversación guardada exitosamente',
    FEEDBACK_UPDATED: 'Feedback actualizado exitosamente',
    SESSION_UPDATED: 'Sesión actualizada exitosamente',
    STATS_RETRIEVED: 'Estadísticas obtenidas exitosamente',
  },

  // Mensajes de error
  ERROR_MESSAGES: {
    USER_NOT_FOUND: 'Usuario no encontrado',
    SESSION_NOT_FOUND: 'Sesión no encontrada',
    CONVERSATION_NOT_FOUND: 'Conversación no encontrada',
    EMPTY_MESSAGE: 'El mensaje no puede estar vacío',
    EMPTY_RESPONSE: 'La respuesta no puede estar vacía',
    DATABASE_ERROR: 'Error en operación de base de datos',
    VALIDATION_ERROR: 'Error de validación',
  },

  // Configuración de rate limiting
  RATE_LIMIT: {
    TTL: 60000, // 60 segundos
    LIMIT: 100, // 100 peticiones por minuto
  },
} as const;

/**
 * Configuración de CORS según entorno
 */
export const getCorsOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.ALLOWED_ORIGINS?.split(',') || [];
  }

  return [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3002',
  ];
};

/**
 * Configuración de logging según entorno
 */
export const getLogLevels = () => {
  if (process.env.NODE_ENV === 'production') {
    return ['error', 'warn', 'log'];
  }

  return ['error', 'warn', 'log', 'debug', 'verbose'];
};
