const isDevelopment = process.env.NODE_ENV === 'development';

// Standard error messages for common scenarios
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request',
  RATE_LIMITED: 'Too many requests',
  INTERNAL_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed',
  SESSION_EXPIRED: 'Session expired',
  AUTH_REQUIRED: 'Authentication required',
  AUTH_FAILED: 'Authentication failed',
  AUTH_EXPIRED: 'Authentication token expired',
  CONFIG_ERROR: 'Configuration error',
  API_ERROR: 'API request failed',
  DATA_ERROR: 'Invalid data received'
};

/**
 * Creates a standardized error response
 * @param {string} type - Error type from ERROR_MESSAGES
 * @param {Error|string} error - Original error or message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Standardized error response
 */
export function createErrorResponse(type, error, statusCode = 400) {
  // Base error response
  const errorResponse = {
    success: false,
    error: ERROR_MESSAGES[type] || ERROR_MESSAGES.INTERNAL_ERROR
  };

  // Add detailed error info only in development
  if (isDevelopment && error) {
    errorResponse.details = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : error;
  }

  return {
    body: errorResponse,
    status: statusCode,
  };
}

/**
 * Safe console logging that only runs in development
 */
export const safeConsole = {
  log: (...args) => isDevelopment && console.log(...args),
  error: (...args) => isDevelopment && console.error(...args),
  warn: (...args) => isDevelopment && console.warn(...args),
  info: (...args) => isDevelopment && console.info(...args),
  debug: (...args) => isDevelopment && console.debug(...args)
};

/**
 * Maps error messages to error types
 * @param {string} message - Error message to map
 * @returns {string} Error type
 */
function mapErrorMessageToType(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('authentication required')) return 'AUTH_REQUIRED';
  if (lowerMessage.includes('token expired')) return 'AUTH_EXPIRED';
  if (lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized')) return 'AUTH_FAILED';
  if (lowerMessage.includes('configuration')) return 'CONFIG_ERROR';
  if (lowerMessage.includes('invalid data') || lowerMessage.includes('data format')) return 'DATA_ERROR';
  if (lowerMessage.includes('rate limit')) return 'RATE_LIMITED';
  if (lowerMessage.includes('validation')) return 'VALIDATION_ERROR';
  if (lowerMessage.includes('not found')) return 'NOT_FOUND';
  
  return 'API_ERROR';
}

/**
 * Determines appropriate status code based on error type
 * @param {string} type - Error type
 * @returns {number} HTTP status code
 */
function getStatusCodeForType(type) {
  switch (type) {
    case 'AUTH_REQUIRED':
    case 'AUTH_FAILED':
    case 'AUTH_EXPIRED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
    case 'BAD_REQUEST':
      return 400;
    case 'RATE_LIMITED':
      return 429;
    case 'CONFIG_ERROR':
    case 'API_ERROR':
    case 'DATA_ERROR':
    case 'INTERNAL_ERROR':
    default:
      return 500;
  }
}

/**
 * Handles API errors in a standardized way
 * @param {Error} error - The error to handle
 * @returns {Object} Standardized error response
 */
export function handleApiError(error) {
  // Log error in development only
  safeConsole.error('API Error:', error);

  // Determine error type and status code
  const errorType = mapErrorMessageToType(error.message);
  const statusCode = getStatusCodeForType(errorType);

  return createErrorResponse(errorType, error, statusCode);
} 