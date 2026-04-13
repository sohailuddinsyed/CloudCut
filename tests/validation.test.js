/**
 * Property-Based Tests for Validation Module
 * 
 * Tests universal properties of URL and alias validation using fast-check
 */

const fc = require('fast-check');
const { isValidUrl, isValidAlias, isBlockedDomain } = require('../src/utils/validation');
const { BLOCKED_DOMAINS } = require('../src/utils/blocklist');

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

// ─── Security Validation Unit Tests (Task 21.2) ──────────────────────────────
// Requirements: 9.4

describe('Security Validation - Malicious URL Schemes', () => {

  test('rejects javascript: scheme', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  test('rejects javascript: scheme with void operator', () => {
    expect(isValidUrl('javascript:void(0)')).toBe(false);
  });

  test('rejects data: scheme (inline HTML)', () => {
    expect(isValidUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  test('rejects data: scheme (base64 encoded)', () => {
    expect(isValidUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe(false);
  });

  test('rejects file: scheme', () => {
    expect(isValidUrl('file:///etc/passwd')).toBe(false);
  });

  test('rejects file: scheme (Windows path)', () => {
    expect(isValidUrl('file:///C:/Windows/System32/drivers/etc/hosts')).toBe(false);
  });

  test('rejects ftp: scheme', () => {
    expect(isValidUrl('ftp://example.com/file.txt')).toBe(false);
  });

  test('rejects vbscript: scheme', () => {
    expect(isValidUrl('vbscript:MsgBox("XSS")')).toBe(false);
  });

});

describe('Security Validation - Blocked Domains', () => {

  test('rejects localhost', () => {
    expect(isBlockedDomain('http://localhost/path')).toBe(true);
  });

  test('rejects 127.0.0.1 (loopback)', () => {
    expect(isBlockedDomain('http://127.0.0.1/admin')).toBe(true);
  });

  test('rejects AWS metadata service (SSRF protection)', () => {
    expect(isBlockedDomain('http://169.254.169.254/latest/meta-data/')).toBe(true);
  });

  test('rejects Google metadata service', () => {
    expect(isBlockedDomain('http://metadata.google.internal/')).toBe(true);
  });

  test('rejects known malicious domain (evil.com)', () => {
    expect(isBlockedDomain('https://evil.com/payload')).toBe(true);
  });

  test('rejects known malicious domain (malware.com)', () => {
    expect(isBlockedDomain('https://malware.com')).toBe(true);
  });

  test('rejects subdomain of a blocked domain', () => {
    expect(isBlockedDomain('https://sub.evil.com/path')).toBe(true);
  });

  test('rejects bit.ly (URL shortener chaining)', () => {
    expect(isBlockedDomain('https://bit.ly/abc123')).toBe(true);
  });

  test('returns false for a legitimate domain', () => {
    expect(isBlockedDomain('https://example.com/page')).toBe(false);
  });

  test('returns false for another legitimate domain', () => {
    expect(isBlockedDomain('https://github.com/user/repo')).toBe(false);
  });

  test('returns false for null input', () => {
    expect(isBlockedDomain(null)).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isBlockedDomain('')).toBe(false);
  });

  test('returns false for an unparseable string', () => {
    expect(isBlockedDomain('not-a-url')).toBe(false);
  });

  test('hostname-style entries in BLOCKED_DOMAINS are actually blocked', () => {
    // Spot-check: domains that work as plain hostnames in a URL should be detected as blocked.
    // IPv6 addresses (e.g. "::1") require bracket notation and are excluded here.
    const hostnameDomains = BLOCKED_DOMAINS.filter(d => !d.includes(':'));
    const sample = hostnameDomains.slice(0, 10);
    sample.forEach(domain => {
      const url = `http://${domain}/path`;
      expect(isBlockedDomain(url)).toBe(true);
    });
  });

});

describe('Security Validation - Valid URLs Pass Validation', () => {

  test('accepts https://example.com', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  test('accepts http://example.com', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  test('accepts URL with path and query string', () => {
    expect(isValidUrl('https://example.com/path?foo=bar&baz=qux')).toBe(true);
  });

  test('accepts URL with fragment', () => {
    expect(isValidUrl('https://example.com/page#section')).toBe(true);
  });

  test('accepts URL with port number', () => {
    expect(isValidUrl('https://example.com:8443/api')).toBe(true);
  });

  test('accepts URL with subdomain', () => {
    expect(isValidUrl('https://www.example.com')).toBe(true);
  });

  test('accepts URL with authentication credentials', () => {
    expect(isValidUrl('https://user:pass@example.com')).toBe(true);
  });

  test('accepts very long URL (2000+ characters)', () => {
    const longPath = 'a'.repeat(1980);
    expect(isValidUrl(`https://example.com/${longPath}`)).toBe(true);
  });

  test('accepts URL with encoded characters', () => {
    expect(isValidUrl('https://example.com/path%20with%20spaces')).toBe(true);
  });

  test('does not block a valid URL that merely contains a blocked keyword in the path', () => {
    // "localhost" in the path of a valid host should not be blocked
    expect(isBlockedDomain('https://example.com/localhost/info')).toBe(false);
  });

});
