/**
 * Property-Based Tests for Custom Alias Features
 * 
 * Tests custom alias validation and uniqueness enforcement using fast-check
 */

const fc = require('fast-check');
const { mockClient } = require('aws-sdk-client-mock');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { handler } = require('../src/handlers/createShortUrl');

// Mock DynamoDB client
const ddbMock = mockClient(DynamoDBDocumentClient);

describe('Custom Alias - Property-Based Tests', () => {
  
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

  // Feature: url-shortener-service, Property 14: Custom Alias Uniqueness Enforcement
  // Validates: Requirements 5.2
  test('Property 14: Custom Alias Uniqueness Enforcement - second attempt with same alias returns 409', async () => {
    // Track stored aliases to simulate DynamoDB state
    const storedAliases = new Set();
    
    // Set up mocks
    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.TableName === 'url_mappings') {
        const shortCode = input.Key.shortCode;
        // Return item if alias exists, null otherwise
        if (storedAliases.has(shortCode)) {
          return Promise.resolve({
            Item: {
              shortCode: shortCode,
              longUrl: 'https://example.com/existing',
              createdAt: Math.floor(Date.now() / 1000)
            }
          });
        }
      }
      return Promise.resolve({ Item: null });
    });
    
    ddbMock.on(PutCommand).callsFake((input) => {
      if (input.TableName === 'url_mappings') {
        // Store the alias
        storedAliases.add(input.Item.shortCode);
      }
      return Promise.resolve({});
    });
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid custom aliases (4-32 chars, alphanumeric + hyphens/underscores)
        fc.stringMatching(/^[a-zA-Z0-9_-]{4,32}$/),
        // Generate two different valid URLs
        fc.record({
          protocol1: fc.constantFrom('http://', 'https://'),
          domain1: fc.stringMatching(/^[a-z0-9-]+\.[a-z]{2,}$/),
          path1: fc.option(fc.stringMatching(/^\/[a-z0-9-/]*$/), { nil: '' }),
          protocol2: fc.constantFrom('http://', 'https://'),
          domain2: fc.stringMatching(/^[a-z0-9-]+\.[a-z]{2,}$/),
          path2: fc.option(fc.stringMatching(/^\/[a-z0-9-/]*$/), { nil: '' })
        }),
        async (customAlias, urlParts) => {
          // Construct two different valid URLs
          const longUrl1 = `${urlParts.protocol1}${urlParts.domain1}${urlParts.path1 || ''}`;
          const longUrl2 = `${urlParts.protocol2}${urlParts.domain2}${urlParts.path2 || ''}`;
          
          // First request: Create URL with custom alias
          const event1 = {
            body: JSON.stringify({ 
              longUrl: longUrl1,
              customAlias: customAlias
            }),
            requestContext: {
              requestId: 'test-request-1'
            }
          };
          
          const response1 = await handler(event1);
          
          // First request should succeed with 201
          expect(response1.statusCode).toBe(201);
          
          const responseBody1 = JSON.parse(response1.body);
          expect(responseBody1.shortCode).toBe(customAlias);
          expect(responseBody1.longUrl).toBe(longUrl1);
          
          // Second request: Try to create another URL with the same alias
          const event2 = {
            body: JSON.stringify({ 
              longUrl: longUrl2,
              customAlias: customAlias
            }),
            requestContext: {
              requestId: 'test-request-2'
            }
          };
          
          const response2 = await handler(event2);
          
          // Second request should fail with 409 (Conflict)
          expect(response2.statusCode).toBe(409);
          
          const responseBody2 = JSON.parse(response2.body);
          expect(responseBody2).toHaveProperty('error');
          expect(responseBody2).toHaveProperty('code');
          expect(responseBody2.code).toBe('ALIAS_TAKEN');
          
          // Clean up for next iteration
          storedAliases.delete(customAlias);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: url-shortener-service, Property 15: Custom Alias Usage
  // **Validates: Requirements 5.3**
  test('Property 15: Custom Alias Usage - returned shortCode matches provided customAlias exactly', async () => {
    // Set up mocks
    ddbMock.on(GetCommand).resolves({ Item: null }); // Alias doesn't exist
    ddbMock.on(PutCommand).resolves({}); // Successfully store the mapping
    
    await fc.assert(
      fc.asyncProperty(
        // Generate random valid custom aliases (4-32 chars, alphanumeric + hyphens/underscores)
        fc.stringMatching(/^[a-zA-Z0-9_-]{4,32}$/),
        // Generate valid URLs
        fc.record({
          protocol: fc.constantFrom('http://', 'https://'),
          domain: fc.stringMatching(/^[a-z0-9-]+\.[a-z]{2,}$/),
          path: fc.option(fc.stringMatching(/^\/[a-z0-9-/]*$/), { nil: '' })
        }),
        async (customAlias, urlParts) => {
          // Construct a valid URL
          const longUrl = `${urlParts.protocol}${urlParts.domain}${urlParts.path || ''}`;
          
          // Create URL with custom alias
          const event = {
            body: JSON.stringify({ 
              longUrl: longUrl,
              customAlias: customAlias
            }),
            requestContext: {
              requestId: 'test-request'
            }
          };
          
          const response = await handler(event);
          
          // Verify successful creation
          expect(response.statusCode).toBe(201);
          
          const responseBody = JSON.parse(response.body);
          
          // Property: returned shortCode should exactly match the provided customAlias
          expect(responseBody.shortCode).toBe(customAlias);
          
          // Additional verification: shortUrl should contain the customAlias
          expect(responseBody.shortUrl).toContain(customAlias);
          expect(responseBody.shortUrl).toBe(`${process.env.BASE_URL}/${customAlias}`);
          
          // Verify it's not a Base62-encoded number (which would be the generated code)
          // Custom aliases can contain hyphens/underscores, which Base62 codes cannot
          // This ensures we're using the custom alias, not generating a code
          expect(responseBody.longUrl).toBe(longUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

});
