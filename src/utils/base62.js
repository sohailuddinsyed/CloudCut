/**
 * Base62 Encoding Module
 * 
 * Converts numeric IDs to compact alphanumeric strings and vice versa.
 * Character set: 0-9, a-z, A-Z (62 characters total)
 */

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Encodes a non-negative integer to a Base62 string
 * @param {number} num - Non-negative integer to encode
 * @returns {string} Base62-encoded string
 * @throws {Error} If num is negative or not an integer
 */
function encodeBase62(num) {
  if (!Number.isInteger(num) || num < 0) {
    throw new Error('Input must be a non-negative integer');
  }
  
  if (num === 0) {
    return BASE62_CHARS[0];
  }
  
  let encoded = '';
  while (num > 0) {
    const remainder = num % 62;
    encoded = BASE62_CHARS[remainder] + encoded;
    num = Math.floor(num / 62);
  }
  
  return encoded;
}

/**
 * Decodes a Base62 string back to an integer
 * @param {string} str - Base62-encoded string to decode
 * @returns {number} Decoded integer
 * @throws {Error} If string contains invalid Base62 characters
 */
function decodeBase62(str) {
  if (typeof str !== 'string' || str.length === 0) {
    throw new Error('Input must be a non-empty string');
  }
  
  let decoded = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const value = BASE62_CHARS.indexOf(char);
    
    if (value === -1) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
    
    decoded = decoded * 62 + value;
  }
  
  return decoded;
}

module.exports = {
  encodeBase62,
  decodeBase62
};
