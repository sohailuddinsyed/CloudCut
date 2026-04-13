/**
 * Redirect Lambda Handler
 * 
 * Looks up short codes and redirects to the corresponding long URLs.
 * Handles expiration checking and returns appropriate error responses.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.2
 */

const { getItem, incrementClickCount, putClickEvent } = require('../utils/dynamodb');
const { errorResponse } = require('../utils/errors');
const { logInfo, logError } = require('../utils/logger');

// Environment variables
const URL_TABLE = process.env.URL_TABLE || 'url_mappings';
const CLICK_EVENTS_TABLE = process.env.CLICK_EVENTS_TABLE || 'click_events';

/**
 * Lambda handler for redirecting short URLs to long URLs
 * @param {Object} event - API Gateway Lambda Proxy event
 * @returns {Object} API Gateway Lambda Proxy response
 */
async function handler(event) {
  const requestId = event.requestContext?.requestId || 'unknown';
  
  logInfo('Redirect invoked', {
    requestId,
    operation: 'redirect'
  });

  try {
    // 1. Extract short code from path parameters
    const shortCode = event.pathParameters?.shortCode || event.pathParameters?.short_code;
    
    if (!shortCode) {
      logInfo('Missing shortCode in path parameters', { requestId });
      return errorResponse(400, 'MISSING_CODE', 'Short code is required');
    }

    logInfo('Looking up short code', { requestId, shortCode });

    // 2. Query url_mappings table using shortUrl as partition key
    const item = await getItem(URL_TABLE, { shortUrl: shortCode });
    
    // 3. If not found: return 404 error
    if (!item) {
      logInfo('Short code not found', { requestId, shortCode });
      return errorResponse(404, 'NOT_FOUND', 'Short URL not found');
    }

    // 4. If found: check expiresAt (if exists and expired, return 410)
    if (item.expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      if (now > item.expiresAt) {
        logInfo('Short URL has expired', {
          requestId,
          shortCode,
          expiresAt: item.expiresAt,
          currentTime: now
        });
        return errorResponse(410, 'EXPIRED', 'Short URL has expired');
      }
    }

    // 5. Increment click count (fire-and-forget, never block the redirect)
    try {
      await incrementClickCount(URL_TABLE, shortCode);
    } catch (incrementError) {
      logError('Failed to increment click count', incrementError, { requestId, shortCode });
    }

    // 6. Log full attribution click event (fire-and-forget, never block the redirect)
    try {
      const ipAddress = event.requestContext?.identity?.sourceIp || '';
      const userAgent = event.headers?.['User-Agent'] || '';
      const referrer = event.headers?.['Referer'] || '';

      await putClickEvent(CLICK_EVENTS_TABLE, {
        shortCode,
        timestamp: Date.now(),
        ipAddress,
        userAgent,
        referrer
      });
    } catch (clickEventError) {
      logError('Failed to log click event', clickEventError, { requestId, shortCode });
    }

    // 7. Return 302 redirect with Location header set to longUrl
    logInfo('Redirecting to long URL', {
      requestId,
      shortCode,
      longUrl: item.longUrl
    });

    return {
      statusCode: 302,
      headers: {
        'Location': item.longUrl,
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
      },
      body: JSON.stringify({
        message: 'Redirecting...'
      })
    };

  } catch (error) {
    // Handle unexpected errors
    logError('Unexpected error in Redirect', error, {
      requestId,
      operation: 'redirect'
    });
    
    return errorResponse(500, 'INTERNAL_ERROR', 'An internal error occurred');
  }
}

module.exports = {
  handler
};
