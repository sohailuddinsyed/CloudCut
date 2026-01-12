const { errorResponse } = require('../src/utils/errors');
const fc = require('fast-check');

describe('Error Response Module', () => {
  test('creates error response with correct structure', () => {
    const response = errorResponse(400, 'INVALID_URL', 'URL must start with http:// or https://');
    
    expect(response.statusCode).toBe(400);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.body).toBeDefined();
    
    const body = JSON.parse(response.body);
    expect(body.error).toBe('URL must start with http:// or https://');
    expect(body.code).toBe('INVALID_URL');
  });

  test('creates 404 error response', () => {
    const response = errorResponse(404, 'NOT_FOUND', 'Short URL not found');
    
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Short URL not found');
    expect(body.code).toBe('NOT_FOUND');
  });

  test('creates 500 error response', () => {
    const response = errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('An unexpected error occurred');
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  test('body is valid JSON string', () => {
    const response = errorResponse(409, 'ALIAS_TAKEN', 'This alias is already in use');
    
    expect(() => JSON.parse(response.body)).not.toThrow();
  });

  // Feature: url-shortener-service, Property 9: Standardized Error Response Format
  test('property: all error responses have valid JSON with error and code fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }), // HTTP error status codes
        fc.string({ minLength: 1, maxLength: 50 }), // Error code
        fc.string({ minLength: 1, maxLength: 200 }), // Error message
        (statusCode, code, message) => {
          const response = errorResponse(statusCode, code, message);
          
          // Verify response structure
          expect(response.statusCode).toBe(statusCode);
          expect(response.headers['Content-Type']).toBe('application/json');
          expect(response.body).toBeDefined();
          expect(typeof response.body).toBe('string');
          
          // Verify body is valid JSON
          let body;
          expect(() => {
            body = JSON.parse(response.body);
          }).not.toThrow();
          
          // Verify required fields exist
          expect(body).toHaveProperty('error');
          expect(body).toHaveProperty('code');
          
          // Verify field values match inputs
          expect(body.error).toBe(message);
          expect(body.code).toBe(code);
        }
      ),
      { numRuns: 100 }
    );
  });
});
