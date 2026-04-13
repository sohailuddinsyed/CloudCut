/**
 * Property-Based Tests for CreateShortUrl Lambda Handler
 * 
 * Tests URL creation and storage properties using fast-check
 */

const fc = require('fast-check');
const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { handler } = require('../src/handlers/createShortUrl');

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('CreateShortUrl Handler - Property-Based Tests', () => {
  
  beforeEach(() => {
    ddbMock.reset();
    
    // Set environment variables
    process.env.URL_TABLE = 'url_mappings';
    process.env.COUNTER_TABLE = 'counters';
    process.env.BASE_URL = 'https://example.com';
  });

  afterEach(() => {
    ddbMock.restore();
  });

  // Feature: url-shortener-service, Property 3: URL Creation Stores Complete Mapping
  // Validates: Requirements 1.4, 5.5
  test('Property 3: URL Creation Stores Complete Mapping - creates short URLs and verifies DynamoDB contains correct data', async () => {
    // Track stored items across all test runs
    const storedItems = [];
    
    // Set up mocks once before all property test runs
    ddbMock.on(UpdateCommand).callsFake((input) => {
      if (input.TableName === 'counters') {
        // Return incrementing counter values
        return Promise.resolve({
          Attributes: { value: Math.floor(Math.random() * 1000000) + 1 }
        });
      }
      return Promise.resolve({});
    });
    
    ddbMock.on(GetCommand).resolves({
      Item: null
    });
    
    ddbMock.on(PutCommand).callsFake((input) => {
      storedItems.push(input.Item);
      return Promise.resolve({});
    });
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid URLs
        fc.record({
          protocol: fc.constantFrom('http://', 'https://'),
          domain: fc.stringMatching(/^[a-z0-9-]+\.[a-z]{2,}$/),
          path: fc.option(fc.stringMatching(/^\/[a-z0-9-/]*$/), { nil: '' })
        }),
        async (urlParts) => {
          // Construct valid URL
          const longUrl = `${urlParts.protocol}${urlParts.domain}${urlParts.path || ''}`;
          
          // Track the index before this test run
          const beforeCount = storedItems.length;
          
          // Create API Gateway event
          const event = {
            body: JSON.stringify({ longUrl }),
            requestContext: {
              requestId: 'test-request-id'
            }
          };
          
          // Call handler
          const response = await handler(event);
          
          // Verify response is successful
          expect(response.statusCode).toBe(201);
          
          const responseBody = JSON.parse(response.body);
          
          // Get the item that was just stored
          const storedItem = storedItems[beforeCount];
          
          // Verify DynamoDB item was stored
          expect(storedItem).toBeDefined();
          
          // Verify stored item contains complete mapping
          // shortUrl is the actual DynamoDB partition key (matches AWS table schema)
          expect(storedItem).toHaveProperty('shortUrl');
          expect(storedItem.shortUrl).toBe(responseBody.shortCode);
          
          expect(storedItem).toHaveProperty('longUrl');
          expect(storedItem.longUrl).toBe(longUrl);
          
          expect(storedItem).toHaveProperty('createdAt');
          expect(typeof storedItem.createdAt).toBe('number');
          expect(storedItem.createdAt).toBeGreaterThan(0);
          
          // Verify shortUrl is used as partition key in the stored item
          expect(storedItem.shortUrl).toBeTruthy();
          expect(storedItem.shortUrl.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: url-shortener-service, Property 5: Successful Creation Returns Complete Short URL
  // Validates: Requirements 1.5
  test('Property 5: Successful Creation Returns Complete Short URL - verifies response contains shortUrl, shortCode, and longUrl fields', async () => {
    // Set up mocks
    ddbMock.on(UpdateCommand).callsFake((input) => {
      if (input.TableName === 'counters') {
        return Promise.resolve({
          Attributes: { value: Math.floor(Math.random() * 1000000) + 1 }
        });
      }
      return Promise.resolve({});
    });
    
    ddbMock.on(GetCommand).resolves({
      Item: null
    });
    
    ddbMock.on(PutCommand).resolves({});
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid URLs
        fc.record({
          protocol: fc.constantFrom('http://', 'https://'),
          domain: fc.stringMatching(/^[a-z0-9-]+\.[a-z]{2,}$/),
          path: fc.option(fc.stringMatching(/^\/[a-z0-9-/]*$/), { nil: '' })
        }),
        async (urlParts) => {
          // Construct valid URL
          const longUrl = `${urlParts.protocol}${urlParts.domain}${urlParts.path || ''}`;
          
          // Create API Gateway event
          const event = {
            body: JSON.stringify({ longUrl }),
            requestContext: {
              requestId: 'test-request-id'
            }
          };
          
          // Call handler
          const response = await handler(event);
          
          // Verify response is successful
          expect(response.statusCode).toBe(201);
          
          // Parse response body
          const responseBody = JSON.parse(response.body);
          
          // Verify response contains shortUrl field
          expect(responseBody).toHaveProperty('shortUrl');
          expect(typeof responseBody.shortUrl).toBe('string');
          expect(responseBody.shortUrl).toContain(process.env.BASE_URL);
          
          // Verify response contains shortCode field
          expect(responseBody).toHaveProperty('shortCode');
          expect(typeof responseBody.shortCode).toBe('string');
          expect(responseBody.shortCode.length).toBeGreaterThan(0);
          
          // Verify response contains longUrl field
          expect(responseBody).toHaveProperty('longUrl');
          expect(responseBody.longUrl).toBe(longUrl);
          
          // Verify shortUrl is constructed correctly from BASE_URL and shortCode
          expect(responseBody.shortUrl).toBe(`${process.env.BASE_URL}/${responseBody.shortCode}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Unit Tests for Edge Cases
  describe('Edge Cases', () => {
    
    beforeEach(() => {
      // Set up mocks for edge case tests
      ddbMock.on(UpdateCommand).callsFake((input) => {
        if (input.TableName === 'counters') {
          return Promise.resolve({
            Attributes: { value: 12345 }
          });
        }
        return Promise.resolve({});
      });
      
      ddbMock.on(GetCommand).resolves({
        Item: null
      });
      
      ddbMock.on(PutCommand).resolves({});
    });

    test('handles very long URLs (2000+ characters)', async () => {
      // Create a URL with 2000+ characters
      const longPath = 'a'.repeat(2000);
      const longUrl = `https://example.com/${longPath}`;
      
      const event = {
        body: JSON.stringify({ longUrl }),
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should successfully create short URL
      expect(response.statusCode).toBe(201);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.longUrl).toBe(longUrl);
      expect(responseBody.shortCode).toBeTruthy();
      expect(responseBody.shortUrl).toContain(responseBody.shortCode);
    });

    test('handles URLs with special characters', async () => {
      // URL with query parameters, fragments, and special characters
      const longUrl = 'https://example.com/path?query=value&foo=bar#fragment';
      
      const event = {
        body: JSON.stringify({ longUrl }),
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should successfully create short URL
      expect(response.statusCode).toBe(201);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.longUrl).toBe(longUrl);
      expect(responseBody.shortCode).toBeTruthy();
    });

    test('handles URLs with encoded special characters', async () => {
      // URL with percent-encoded characters
      const longUrl = 'https://example.com/path?name=John%20Doe&email=test%40example.com';
      
      const event = {
        body: JSON.stringify({ longUrl }),
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should successfully create short URL
      expect(response.statusCode).toBe(201);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.longUrl).toBe(longUrl);
    });

    test('returns error when longUrl is missing in request body', async () => {
      const event = {
        body: JSON.stringify({ customAlias: 'test-alias' }),
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBeTruthy();
      expect(responseBody.code).toBe('MISSING_URL');
    });

    test('returns error when request body is empty', async () => {
      const event = {
        body: JSON.stringify({}),
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.code).toBe('MISSING_URL');
    });

    test('returns error when request body is invalid JSON', async () => {
      const event = {
        body: 'not valid json {',
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.error).toBeTruthy();
      expect(responseBody.code).toBe('INVALID_JSON');
    });

    test('returns error when request body is malformed JSON', async () => {
      const event = {
        body: '{"longUrl": "https://example.com", invalid}',
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.code).toBe('INVALID_JSON');
    });

    test('returns error when body is null', async () => {
      const event = {
        body: null,
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error (empty body parsed as {})
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.code).toBe('MISSING_URL');
    });

    test('returns error when body is undefined', async () => {
      const event = {
        requestContext: {
          requestId: 'test-request-id'
        }
      };
      
      const response = await handler(event);
      
      // Should return 400 error (empty body parsed as {})
      expect(response.statusCode).toBe(400);
      
      const responseBody = JSON.parse(response.body);
      expect(responseBody.code).toBe('MISSING_URL');
    });

  });

});
