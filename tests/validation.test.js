/**
 * Property-Based Tests for Validation Module
 * 
 * Tests universal properties of URL and alias validation using fast-check
 */

const fc = require('fast-check');
const { isValidUrl, isValidAlias } = require('../src/utils/validation');

describe('URL Validation - Property-Based Tests', () => {
  
  // Feature: url-shortener-service, Property 2: URL Validation Rejects Invalid Formats
  // Validates: Requirements 1.2, 9.5
  test('Property 2: URL Validation Rejects Invalid Formats - strings without http/https prefix are rejected', () => {
    fc.assert(
      fc.property(
        fc.string().filter(str => {
          // Filter out strings that start with http:// or https://
          return !str.startsWith('http://') && !str.startsWith('https://');
        }),
        (invalidUrl) => {
          const result = isValidUrl(invalidUrl);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

});

describe('Custom Alias Validation - Property-Based Tests', () => {
  
  // Feature: url-shortener-service, Property 13: Custom Alias Validation
  // Validates: Requirements 5.1, 5.4
  test('Property 13: Custom Alias Validation - only valid aliases (4-32 chars, alphanumeric + hyphens/underscores) are accepted', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (alias) => {
          const result = isValidAlias(alias);
          
          // Determine if the alias should be valid based on requirements
          const length = alias.length;
          const hasValidLength = length >= 4 && length <= 32;
          const hasValidChars = /^[a-zA-Z0-9_-]+$/.test(alias);
          const shouldBeValid = hasValidLength && hasValidChars;
          
          // The function should return true if and only if the alias meets all criteria
          expect(result).toBe(shouldBeValid);
        }
      ),
      { numRuns: 100 }
    );
  });

});

describe('URL Validation - Unit Tests (Edge Cases)', () => {
  
  describe('Valid URLs', () => {
    test('should accept http://example.com', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    test('should accept https://example.com/path?query=value', () => {
      expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
    });
  });

  describe('Invalid URLs', () => {
    test('should reject ftp://example.com', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    test('should reject javascript:alert(1)', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });

    test('should reject empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('Malformed URLs', () => {
    test('should reject not-a-url', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    test('should reject http://', () => {
      expect(isValidUrl('http://')).toBe(false);
    });

    test('should reject https://', () => {
      expect(isValidUrl('https://')).toBe(false);
    });
  });

});
