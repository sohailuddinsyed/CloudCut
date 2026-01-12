/**
 * Structured logging module for URL Shortener Service
 * Provides JSON-formatted logging with timestamp, level, requestId, and message
 */

/**
 * Log an informational message
 * @param {string} message - The log message
 * @param {Object} data - Additional data to include in the log
 * @param {string} data.requestId - AWS request ID for tracing
 * @param {Object} [data.context] - Additional context data
 */
function logInfo(message, data = {}) {
  const logEntry = {
    level: 'INFO',
    timestamp: new Date().toISOString(),
    requestId: data.requestId || 'unknown',
    message: message,
    ...data
  };

  // Remove requestId from root level if it was passed in data
  if (data.requestId) {
    delete logEntry.requestId;
    logEntry.requestId = data.requestId;
  }

  console.log(JSON.stringify(logEntry));
}

/**
 * Log an error message
 * @param {string} message - The error message
 * @param {Error} error - The error object
 * @param {Object} context - Context information
 * @param {string} context.requestId - AWS request ID for tracing
 * @param {string} [context.operation] - The operation being performed
 * @param {Object} [context.additionalData] - Any additional context data
 */
function logError(message, error, context = {}) {
  const logEntry = {
    level: 'ERROR',
    timestamp: new Date().toISOString(),
    requestId: context.requestId || 'unknown',
    message: message,
    error: {
      message: error.message,
      type: error.name || 'Error',
      stack: error.stack
    },
    ...context
  };

  // Remove requestId from root level if it was passed in context
  if (context.requestId) {
    delete logEntry.requestId;
    logEntry.requestId = context.requestId;
  }

  console.error(JSON.stringify(logEntry));
}

module.exports = {
  logInfo,
  logError
};
