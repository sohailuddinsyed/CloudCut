/**
 * Property-Based Tests for Base62 Encoding Module
 * 
 * Tests universal properties of Base62 encoding/decoding using fast-check
 */

const fc = require('fast-check');
const { encodeBase62, decodeBase62 } = require('../src/utils/base62');

describe('Base62 Encoding - Property-Based Tests', () => {
  
  // Feature: url-shortener-service, Property 1: Base62 Round-Trip Encoding
  // Validates: Requirements 1.3
  test('Property 1: Base62 Round-Trip Encoding - encode then decode returns original value', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        (num) => {
          const encoded = encodeBase62(num);
          const decoded = decodeBase62(encoded);
          expect(decoded).toBe(num);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: url-shortener-service, Property 4: Short Code Uniqueness
  // Validates: Requirements 1.1
  test('Property 4: Short Code Uniqueness - different integers encode to different strings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000000 }),
        fc.integer({ min: 0, max: 1000000 }),
        (num1, num2) => {
          // Only test when numbers are different
          fc.pre(num1 !== num2);
          
          const encoded1 = encodeBase62(num1);
          const encoded2 = encodeBase62(num2);
          
          expect(encoded1).not.toBe(encoded2);
        }
      ),
      { numRuns: 100 }
    );
  });

});
