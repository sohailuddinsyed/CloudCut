/**
 * Validation utilities for URL shortener service
 * Validates URLs and custom aliases according to requirements
 */

const { isBlockedDomain } = require('./blocklist');

/**
 * Validates URL format
 * Requirements: 1.2, 9.5
 * 
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if URL is valid, false otherwise
 */
function isValidUrl(url) {
  // Check if URL starts with http:// or https://
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // Try to construct URL object (throws if invalid)
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validates custom alias format
 * Requirements: 5.1, 5.4
 * 
 * @param {string} alias - The custom alias to validate
 * @returns {boolean} - True if alias is valid, false otherwise
 */
function isValidAlias(alias) {
  if (!alias || typeof alias !== 'string') {
    return false;
  }
  
  // 4-32 characters, alphanumeric + hyphens + underscores
  const regex = /^[a-zA-Z0-9_-]{4,32}$/;
  return regex.test(alias);
}

module.exports = {
  isValidUrl,
  isValidAlias,
  isBlockedDomain
};
