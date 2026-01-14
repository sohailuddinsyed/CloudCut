/**
 * Unit Tests for Redirect Lambda Handler
 * 
 * Tests redirect functionality, expiration checking, and error handling
 */

const fc = require('fast-check');
const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { handler } = require('../src/handlers/redirect');
const { handler: createHandler } = require('../src/handlers/createShortUrl');

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Redirect Handler - Unit Tests', () => {
  
  beforeEach(() => {
    ddbMock.reset();
    
    // Set environment variables
    process.env.URL_TABLE = 'url_mappings';
  });

  afterEach(() => {
    ddbMock.restore();
  });

  describe('Successful Redirects', () => {
    
    test('redirects to long URL for valid short code', async () => {
      // Mock DynamoDB to return a valid URL mapping
      ddbMock.on(GetCommand).resolves({
        Item: {
          shortCode: 'abc123',
          longUrl: 'https://example.com/original/url',
          createdAt: 1704067200
        }
      });
      
      const event = {
        pathParameters: {
          shortCode: 'abc123'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 302 redirect
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/original/url');
      expect(response.headers['Content-Type']).toBe('application/json');
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.message).toBe('Redirecting...');
    });

    test('redirects for short code without expiration', async () => {
      // Mock DynamoDB to return URL mapping without expiresAt
      ddbMock.on(GetCommand).resolves({
        Item: {
          shortCode: 'test123',
          longUrl: 'https://example.com/test',
          createdAt: 1704067200
        }
      });
      
      const event = {
        pathParameters: {
          shortCode: 'test123'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 302 redirect
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/test');
    });

    test('redirects for short code with future expiration', async () => {
      // Create a future expiration timestamp (1 year from now)
      const futureExpiration = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      
      // Mock DynamoDB to return URL mapping with future expiration
      ddbMock.on(GetCommand).resolves({
        Item: {
          shortCode: 'future123',
          longUrl: 'https://example.com/future',
          createdAt: 1704067200,
          expiresAt: futureExpiration
        }
      });
      
      const event = {
        pathParameters: {
          shortCode: 'future123'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 302 redirect
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/future');
    });

  });

  describe('Not Found Errors', () => {
    
    test('returns 404 for non-existent short code', async () => {
      // Mock DynamoDB to return no item
      ddbMock.on(GetCommand).resolves({
        Item: null
      });
      
      const event = {
        pathParameters: {
          shortCode: 'nonexistent'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 404 error
      expect(response.statusCode).toBe(404);
      expect(response.headers['Content-Type']).toBe('application/json');
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Short URL not found');
      expect(responseBody.code).toBe('NOT_FOUND');
    });

    test('returns 404 when DynamoDB returns undefined', async () => {
      // Mock DynamoDB to return undefined (no Item property)
      ddbMock.on(GetCommand).resolves({});
      
      const event = {
        pathParameters: {
          shortCode: 'missing'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 404 error
      expect(response.statusCode).toBe(404);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.code).toBe('NOT_FOUND');
    });

  });

  describe('Expiration Handling', () => {
    
    test('returns 410 for expired short code', async () => {
      // Create a past expiration timestamp (1 day ago)
      const pastExpiration = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
      
      // Mock DynamoDB to return expired URL mapping
      ddbMock.on(GetCommand).resolves({
        Item: {
          shortCode: 'expired123',
          longUrl: 'https://example.com/expired',
          createdAt: 1704067200,
          expiresAt: pastExpiration
        }
      });
      
      const event = {
        pathParameters: {
          shortCode: 'expired123'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 410 Gone
      expect(response.statusCode).toBe(410);
      expect(response.headers['Content-Type']).toBe('application/json');
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Short URL has expired');
      expect(responseBody.code).toBe('EXPIRED');
    });

    test('redirects when expiration is exactly current time', async () => {
      // Create expiration timestamp equal to current time
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Mock DynamoDB to return URL mapping expiring now
      ddbMock.on(GetCommand).resolves({
        Item: {
          shortCode: 'expiring-now',
          longUrl: 'https://example.com/expiring',
          createdAt: 1704067200,
          expiresAt: currentTime
        }
      });
      
      const event = {
        pathParameters: {
          shortCode: 'expiring-now'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should still redirect (only expires when current time > expiresAt)
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/expiring');
    });

  });

  describe('Edge Cases', () => {
    
    test('returns 400 when shortCode is missing from pathParameters', async () => {
      const event = {
        pathParameters: {},
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('Short code is required');
      expect(responseBody.code).toBe('MISSING_CODE');
    });

    test('returns 400 when pathParameters is null', async () => {
      const event = {
        pathParameters: null,
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.code).toBe('MISSING_CODE');
    });

    test('returns 400 when pathParameters is undefined', async () => {
      const event = {
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.code).toBe('MISSING_CODE');
    });

    test('handles DynamoDB query failure gracefully', async () => {
      // Mock DynamoDB to throw an error
      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));
      
      const event = {
        pathParameters: {
          shortCode: 'test123'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 500 error
      expect(response.statusCode).toBe(500);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBe('An internal error occurred');
      expect(responseBody.code).toBe('INTERNAL_ERROR');
    });

    test('handles URLs with special characters correctly', async () => {
      // Mock DynamoDB to return URL with special characters
      ddbMock.on(GetCommand).resolves({
        Item: {
          shortCode: 'special123',
          longUrl: 'https://example.com/path?query=value&foo=bar#fragment',
          createdAt: 1704067200
        }
      });
      
      const event = {
        pathParameters: {
          shortCode: 'special123'
        },
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 302 redirect with correct URL
      expect(response.statusCode).toBe(302);
      expect(response.headers.Location).toBe('https://example.com/path?query=value&foo=bar#fragment');
    });

  });

});

// Property-Based Tests
describe('Redirect Handler - Property-Based Tests', () => {
  
  beforeEach(() => {
    ddbMock.reset();
    
    // Set environment variables
    process.env.URL_TABLE = 'url_mappings';
    process.env.COUNTER_TABLE = 'counters';
    process.env.BASE_URL = 'https://api.example.com';
  });

  afterEach(() => {
    ddbMock.restore();
  });

  // Feature: url-shortener-service, Property 6: Valid Short Code Redirects Correctly
  test('Property 6: Valid short codes redirect correctly with 302 and Location header', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid URLs
        fc.webUrl({ validSchemes: ['http', 'https'] }),
        async (longUrl) => {
          // Create a short URL by simulating the creation process
          const shortCode = `test${Math.random().toString(36).substring(2, 9)}`;
          const createdAt = Math.floor(Date.now() / 1000);
          
          // Mock DynamoDB to return the URL mapping
          ddbMock.on(GetCommand).resolves({
            Item: {
              shortCode,
              longUrl,
              createdAt
            }
          });
          
          // Create the redirect event
          const redirectEvent = {
            pathParameters: {
              shortCode
            },
            requestContext: {
              requestId: `test-${shortCode}`
            }
          };
          
          // Call the redirect handler
          const response = await handler(redirectEvent);
          
          // Verify 302 response with correct Location header
          expect(response.statusCode).toBe(302);
          expect(response.headers.Location).toBe(longUrl);
          expect(response.headers['Content-Type']).toBe('application/json');
          
          // Verify response body
          const body = JSON.parse(response.body);
          expect(body.message).toBe('Redirecting...');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: url-shortener-service, Property 7: Non-Existent Short Code Returns 404
  test('Property 7: Non-existent short codes return 404 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random alphanumeric strings as non-existent short codes
        fc.stringOf(
          fc.constantFrom(
            ...'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
          ),
          { minLength: 1, maxLength: 10 }
        ),
        async (shortCode) => {
          // Mock DynamoDB to return no item (non-existent short code)
          ddbMock.on(GetCommand).resolves({
            Item: null
          });
          
          // Create the redirect event
          const redirectEvent = {
            pathParameters: {
              shortCode
            },
            requestContext: {
              requestId: `test-${shortCode}`
            }
          };
          
          // Call the redirect handler
          const response = await handler(redirectEvent);
          
          // Verify 404 response
          expect(response.statusCode).toBe(404);
          expect(response.headers['Content-Type']).toBe('application/json');
          
          // Verify response body contains error details
          const body = JSON.parse(response.body);
          expect(body.error).toBe('Short URL not found');
          expect(body.code).toBe('NOT_FOUND');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: url-shortener-service, Property 8: Path Parameter Extraction
  test('Property 8: Path parameter extraction returns correct shortCode value', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random alphanumeric strings as short codes
        fc.stringOf(
          fc.constantFrom(
            ...'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
          ),
          { minLength: 1, maxLength: 20 }
        ),
        async (shortCode) => {
          // Mock DynamoDB to return a valid URL mapping
          const longUrl = 'https://example.com/test';
          ddbMock.on(GetCommand).resolves({
            Item: {
              shortCode,
              longUrl,
              createdAt: Math.floor(Date.now() / 1000)
            }
          });
          
          // Create API Gateway event with shortCode in pathParameters
          const event = {
            pathParameters: {
              shortCode
            },
            requestContext: {
              requestId: `test-${shortCode}`
            }
          };
          
          // Call the handler
          const response = await handler(event);
          
          // Verify the handler successfully extracted and used the shortCode
          // If extraction worked, we should get a 302 redirect (not a 400 MISSING_CODE error)
          expect(response.statusCode).toBe(302);
          expect(response.headers.Location).toBe(longUrl);
          
          // Verify DynamoDB was called with the correct shortCode
          const calls = ddbMock.commandCalls(GetCommand);
          const lastCall = calls[calls.length - 1];
          expect(lastCall.args[0].input.Key.shortCode).toBe(shortCode);
        }
      ),
      { numRuns: 100 }
    );
  });

});
