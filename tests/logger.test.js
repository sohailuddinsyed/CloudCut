/**
 * Property-Based Tests for Logger Module
 * 
 * Tests universal properties of structured logging using fast-check
 */

const fc = require('fast-check');
const { logInfo, logError } = require('../src/utils/logger');

describe('Logger - Property-Based Tests', () => {
  
  // Capture console output
  let consoleLogSpy;
  let consoleErrorSpy;
  
  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });
  
  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Feature: url-shortener-service, Property 10: Structured Logging Format
  // Validates: Requirements 11.4
  test('Property 10: Structured Logging Format - all log outputs are valid JSON', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }), // message
        fc.string({ minLength: 1, maxLength: 50 }),  // requestId
        fc.oneof(
          fc.constant('info'),
          fc.constant('error')
        ), // log type
        (message, requestId, logType) => {
          // Clear previous calls
          consoleLogSpy.mockClear();
          consoleErrorSpy.mockClear();
          
          if (logType === 'info') {
            logInfo(message, { requestId });
            
            // Verify console.log was called
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            const logOutput = consoleLogSpy.mock.calls[0][0];
            
            // Verify output is valid JSON
            expect(() => JSON.parse(logOutput)).not.toThrow();
            
            // Verify parsed JSON has expected structure
            const parsed = JSON.parse(logOutput);
            expect(parsed).toHaveProperty('level');
            expect(parsed).toHaveProperty('timestamp');
            expect(parsed).toHaveProperty('requestId');
            expect(parsed).toHaveProperty('message');
          } else {
            // Create a mock error
            const error = new Error('Test error');
            logError(message, error, { requestId });
            
            // Verify console.error was called
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            const logOutput = consoleErrorSpy.mock.calls[0][0];
            
            // Verify output is valid JSON
            expect(() => JSON.parse(logOutput)).not.toThrow();
            
            // Verify parsed JSON has expected structure
            const parsed = JSON.parse(logOutput);
            expect(parsed).toHaveProperty('level');
            expect(parsed).toHaveProperty('timestamp');
            expect(parsed).toHaveProperty('requestId');
            expect(parsed).toHaveProperty('message');
            expect(parsed).toHaveProperty('error');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: url-shortener-service, Property 11: Request Logging Completeness
  // Validates: Requirements 4.1, 11.1
  test('Property 11: Request Logging Completeness - logs contain requestId, timestamp, and operation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }), // message
        fc.string({ minLength: 1, maxLength: 50 }),  // requestId
        fc.oneof(
          fc.constant('createShortUrl'),
          fc.constant('redirect'),
          fc.constant('getAnalytics'),
          fc.constant('generateQR')
        ), // operation
        fc.oneof(
          fc.constant('info'),
          fc.constant('error')
        ), // log type
        (message, requestId, operation, logType) => {
          // Clear previous calls
          consoleLogSpy.mockClear();
          consoleErrorSpy.mockClear();
          
          if (logType === 'info') {
            logInfo(message, { requestId, operation });
            
            // Verify console.log was called
            expect(consoleLogSpy).toHaveBeenCalledTimes(1);
            const logOutput = consoleLogSpy.mock.calls[0][0];
            
            // Parse the log output
            const parsed = JSON.parse(logOutput);
            
            // Verify required fields are present
            expect(parsed).toHaveProperty('requestId');
            expect(parsed.requestId).toBe(requestId);
            
            expect(parsed).toHaveProperty('timestamp');
            expect(parsed.timestamp).toBeTruthy();
            // Verify timestamp is a valid ISO string
            expect(() => new Date(parsed.timestamp)).not.toThrow();
            expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
            
            expect(parsed).toHaveProperty('operation');
            expect(parsed.operation).toBe(operation);
          } else {
            // Create a mock error
            const error = new Error('Test error');
            logError(message, error, { requestId, operation });
            
            // Verify console.error was called
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            const logOutput = consoleErrorSpy.mock.calls[0][0];
            
            // Parse the log output
            const parsed = JSON.parse(logOutput);
            
            // Verify required fields are present
            expect(parsed).toHaveProperty('requestId');
            expect(parsed.requestId).toBe(requestId);
            
            expect(parsed).toHaveProperty('timestamp');
            expect(parsed.timestamp).toBeTruthy();
            // Verify timestamp is a valid ISO string
            expect(() => new Date(parsed.timestamp)).not.toThrow();
            expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
            
            expect(parsed).toHaveProperty('operation');
            expect(parsed.operation).toBe(operation);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

});
