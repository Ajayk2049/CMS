const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Hash password using bcryptjs (salt rounds: 10)
 * @param {string} password Plain text password
 * @returns {string} Bcrypt hash
 */
function hashPassword(password) {
  if (!password) return '';
  return bcrypt.hashSync(password, 10);
}

/**
 * Compare plain password against stored hash.
 * Supports legacy PBKDF2 hashes (salt:hash) for seamless backward compatibility.
 * @param {string} password Plain text password
 * @param {string} storedHash Stored hash string from database
 * @returns {{ isValid: boolean, needsRehash: boolean }} Verification result
 */
function comparePassword(password, storedHash) {
  if (!password || !storedHash) {
    return { isValid: false, needsRehash: false };
  }

  // Check if bcrypt hash ($2a$ or $2b$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    try {
      const isValid = bcrypt.compareSync(password, storedHash);
      return { isValid, needsRehash: false };
    } catch (err) {
      return { isValid: false, needsRehash: false };
    }
  }

  // Check if legacy PBKDF2 hash (format: salt:hash)
  if (storedHash.includes(':')) {
    try {
      const [salt, originalHash] = storedHash.split(':');
      if (salt && originalHash) {
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        const isValid = (hash === originalHash);
        return { isValid, needsRehash: isValid }; // Request automatic rehash to bcrypt on successful login
      }
    } catch (err) {
      return { isValid: false, needsRehash: false };
    }
  }

  // Fallback check
  const isValid = (password === storedHash);
  return { isValid, needsRehash: false };
}

module.exports = {
  hashPassword,
  comparePassword
};
