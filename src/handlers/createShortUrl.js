/**
 * CreateShortUrl Lambda Handler
 * 
 * Generates unique short codes and stores URL mappings in DynamoDB.
 * Supports both auto-generated Base62 codes and custom aliases.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4
 */

const { encodeBase62 } = require('../utils/base62');
const { isValidUrl, isValidAlias } = require('../utils/validation');
const { getItem, putItem, incrementCounter } = require('../utils/dynamodb');
const { errorResponse } = require('../utils/errors');
const { logInfo, logError } = require('../utils/logger');

// Environment variables
const URL_TABLE = process.env.URL_TABLE || 'url_mappings';
const COUNTER_TABLE = process.env.COUNTER_TABLE || 'counters';
const BASE_URL = process.env.BASE_URL || 'https://example.com';

/**
 * Lambda handler for creating shortened URLs
 * @param {Object} event - API Gateway Lambda Proxy event
 * @returns {Object} API Gateway Lambda Proxy response
 */
async function handler(event) {
  const requestId = event.requestContext?.requestId || 'unknown';
  
  logInfo('CreateShortUrl invoked', {
    requestId,
    operation: 'createShortUrl'
  });

  try {
    // 1. Parse and validate request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      logError('Failed to parse request body', parseError, {
        requestId,
        operation: 'createShortUrl'
      });
      return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON');
    }

    const { longUrl, customAlias, expiresAt } = body;

    // Validate longUrl is provided
    if (!longUrl) {
      logInfo('Missing longUrl in request', { requestId });
      return errorResponse(400, 'MISSING_URL', 'longUrl is required');
    }

    // Validate URL format
    if (!isValidUrl(longUrl)) {
      logInfo('Invalid URL format', { requestId, longUrl });
      return errorResponse(400, 'INVALID_URL', 'URL must start with http:// or https://');
    }

    // 2. Generate or validate short code
    let shortCode;
    
    if (customAlias) {
      // Validate custom alias format
      if (!isValidAlias(customAlias)) {
        logInfo('Invalid custom alias format', { requestId, customAlias });
        return errorResponse(
          400,
          'INVALID_ALIAS',
          'Alias must be 4-32 characters long and contain only alphanumeric characters, hyphens, and underscores'
        );
      }

      // Check if alias already exists
      const existing = await getItem(URL_TABLE, { shortCode: customAlias });
      if (existing) {
        logInfo('Custom alias already taken', { requestId, customAlias });
        return errorResponse(409, 'ALIAS_TAKEN', 'This alias is already in use');
      }

      shortCode = customAlias;
      logInfo('Using custom alias', { requestId, shortCode });
    } else {
      // Atomically increment counter and encode to Base62
      const counter = await incrementCounter(COUNTER_TABLE, 'url_counter');
      shortCode = encodeBase62(counter);
      logInfo('Generated short code from counter', { requestId, shortCode, counter });
    }

    // 3. Store mapping in DynamoDB
    const item = {
      shortCode: shortCode,  // Use shortCode as partition key to match DynamoDB schema
      longUrl,
      createdAt: Math.floor(Date.now() / 1000)
    };

    // Add optional expiresAt if provided
    if (expiresAt) {
      item.expiresAt = expiresAt;
    }

    await putItem(URL_TABLE, item);
    
    logInfo('URL mapping created successfully', {
      requestId,
      shortCode,
      longUrl,
      hasExpiration: !!expiresAt
    });

    // 4. Return success response
    const shortUrl = `${BASE_URL}/${shortCode}`;
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
      },
      body: JSON.stringify({
        shortUrl,
        shortCode,
        longUrl
      })
    };

  } catch (error) {
    // Handle unexpected errors
    logError('Unexpected error in CreateShortUrl', error, {
      requestId,
      operation: 'createShortUrl'
    });
    
    return errorResponse(500, 'INTERNAL_ERROR', 'An internal error occurred');
  }
}

module.exports = {
  handler
};
