/**
 * Error Response Module
 * 
 * Provides standardized error responses for Lambda functions
 * following the API Gateway Lambda proxy response format.
 */

/**
 * Creates a standardized error response in Lambda proxy format
 * 
 * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
 * @param {string} code - Machine-readable error code (e.g., "INVALID_URL", "NOT_FOUND")
 * @param {string} message - Human-readable error message
 * @returns {Object} Lambda proxy response object with statusCode, headers, and JSON body
 */
function errorResponse(statusCode, code, message) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
    },
    body: JSON.stringify({
      error: message,
      code: code
    })
  };
}

module.exports = {
  errorResponse
};
