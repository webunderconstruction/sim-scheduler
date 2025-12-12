/**
 * Input validators
 * Validates phone numbers, SMS commands, and other inputs
 */

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }
  // Allow + prefix, then 10-15 digits
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phoneNumber);
}

/**
 * Validate officer name
 * @param {string} name - Name to validate
 * @returns {boolean} True if valid
 */
function isValidOfficerName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']{2,50}$/;
  return nameRegex.test(name.trim());
}

/**
 * Validate SMS command
 * @param {string} command - Command to validate
 * @returns {object} { valid: boolean, type: string|null }
 */
function validateSMSCommand(command) {
  if (!command || typeof command !== 'string') {
    return { valid: false, type: null };
  }

  const trimmed = command.trim().toLowerCase();

  // Check for "who is" command
  if (trimmed === 'who is') {
    return { valid: true, type: 'who_is' };
  }

  // Check for "change to: Name" command
  if (trimmed.startsWith('change to:')) {
    const name = command.substring(command.indexOf(':') + 1).trim();
    if (isValidOfficerName(name)) {
      return { valid: true, type: 'change_to', data: name };
    }
  }

  return { valid: false, type: null };
}

/**
 * Sanitize string for safe logging
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeForLog(str) {
  if (!str) return '';
  // Remove control characters and limit length
  return String(str)
    .replace(/[\x00-\x1F\x7F]/g, '')
    .substring(0, 200);
}

module.exports = {
  isValidPhoneNumber,
  isValidOfficerName,
  validateSMSCommand,
  sanitizeForLog,
};
