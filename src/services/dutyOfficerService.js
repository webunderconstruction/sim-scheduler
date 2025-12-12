/**
 * Duty Officer Service
 * Manages duty officer rotation and lookups
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { getLogger } = require('../utils/logger');
const { isValidPhoneNumber } = require('../utils/validators');

const logger = getLogger();

/**
 * Load brigade officers from JSON file
 * @returns {Array} Array of officer objects
 */
function loadOfficers() {
  try {
    const filePath = path.resolve(config.dutyOfficer.dataFile);
    const data = fs.readFileSync(filePath, 'utf8');
    const officers = JSON.parse(data);

    // Validate officers data
    if (!Array.isArray(officers) || officers.length === 0) {
      throw new Error('Brigade officers file must contain a non-empty array');
    }

    officers.forEach((officer, index) => {
      if (!officer.name || !officer.phoneNumber) {
        throw new Error(`Officer at index ${index} is missing name or phoneNumber`);
      }
      if (!isValidPhoneNumber(officer.phoneNumber)) {
        throw new Error(`Invalid phone number for officer ${officer.name}: ${officer.phoneNumber}`);
      }
    });

    logger.debug(`Loaded ${officers.length} officers from ${filePath}`);
    return officers;
  } catch (error) {
    logger.error('Failed to load brigade officers', { error: error.message });
    throw error;
  }
}

/**
 * Get the current duty officer based on weekly rotation
 * Rotation changes every Sunday at 10:00 AM
 * @param {Date} date - Date to check (defaults to now)
 * @returns {Object} Officer object with name and phoneNumber
 */
function getDutyOfficer(date = new Date()) {
  const officers = loadOfficers();
  
  // Start date for rotation (Sunday, January 19, 2025 at 10:00 AM)
  const startDate = new Date('2025-01-19T10:00:00');

  // Find the most recent Sunday 10am at or before the current date
  // This ensures the rotation changes exactly at Sunday 10am
  const currentRotationStart = getMostRecentSunday10am(date);

  // Calculate the number of weeks passed since the start date
  const timeDiff = currentRotationStart.getTime() - startDate.getTime();
  const weeksPassed = Math.floor(timeDiff / (1000 * 3600 * 24 * 7));

  // Calculate the index of the shift worker based on the number of weeks passed
  // Use modulo to cycle through the officers array
  // Handle negative weeks by ensuring positive modulo result
  let workerIndex = weeksPassed % officers.length;
  if (workerIndex < 0) {
    workerIndex = (workerIndex + officers.length) % officers.length;
  }

  const officer = officers[workerIndex];
  
  logger.debug('Calculated duty officer', {
    date: date.toISOString(),
    currentRotationStart: currentRotationStart.toISOString(),
    weeksPassed,
    workerIndex,
    officer: officer.name,
  });

  return officer;
}

/**
 * Get the most recent Sunday at 10:00 AM at or before the given date
 * @param {Date} date - Reference date
 * @returns {Date} Most recent Sunday 10am
 */
function getMostRecentSunday10am(date) {
  const result = new Date(date);
  
  // Set time to 10:00:00
  result.setHours(10, 0, 0, 0);
  
  // Get day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = result.getDay();
  
  // If it's Sunday and the time is at or after 10am, use today
  if (dayOfWeek === 0 && date.getHours() >= 10) {
    return result;
  }
  
  // If it's Sunday but before 10am, go back to last Sunday
  if (dayOfWeek === 0 && date.getHours() < 10) {
    result.setDate(result.getDate() - 7);
    return result;
  }
  
  // Otherwise, go back to the most recent Sunday
  result.setDate(result.getDate() - dayOfWeek);
  return result;
}

/**
 * Find officer by phone number
 * @param {string} phoneNumber - Phone number to search for
 * @returns {string|null} Officer name or null if not found
 */
function getDutyOfficerByPhoneNumber(phoneNumber) {
  const officers = loadOfficers();
  const officer = officers.find(worker => worker.phoneNumber === phoneNumber);
  return officer ? officer.name : null;
}

/**
 * Find officer phone number by name
 * @param {string} name - Officer name to search for
 * @returns {string|null} Phone number or null if not found
 */
function getDutyOfficerPhoneNumberByName(name) {
  const officers = loadOfficers();
  // Case-insensitive search
  const officer = officers.find(
    worker => worker.name.toLowerCase() === name.toLowerCase()
  );
  return officer ? officer.phoneNumber : null;
}

/**
 * Get all officers
 * @returns {Array} Array of all officers
 */
function getAllOfficers() {
  return loadOfficers();
}

module.exports = {
  getDutyOfficer,
  getDutyOfficerByPhoneNumber,
  getDutyOfficerPhoneNumberByName,
  getAllOfficers,
};
