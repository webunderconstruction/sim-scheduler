/**
 * Update Duty Officer Job
 * Checks and updates call forwarding to current duty officer
 */

const config = require('../config');
const { getLogger } = require('../utils/logger');
const { getSerialService } = require('../services/serialService');
const { getDutyOfficer } = require('../services/dutyOfficerService');
const { getSMSService } = require('../services/smsService');

const logger = getLogger();

/**
 * Main job to update duty officer redirect
 */
async function updateDutyOfficer() {
  logger.info('=== Starting Duty Officer Update Job ===');

  try {
    const serialService = getSerialService();
    const smsService = getSMSService();

    // Get current duty officer based on rotation
    const { name, phoneNumber } = getDutyOfficer(new Date());
    logger.info('Current duty officer from rotation', { name, phoneNumber });

    // Check if SIM is locked
    const isLocked = await serialService.isSimLocked();
    
    if (isLocked) {
      logger.warn('SIM is locked, unlocking...');
      const unlocked = await serialService.unlockSim();
      
      if (!unlocked) {
        throw new Error('Failed to unlock SIM');
      }
    } else {
      logger.debug('SIM is not locked');
    }

    // Get current redirect number from device
    const currentRedirect = await serialService.getCurrentRedirectNumber();
    logger.info('Current redirect number on device', { currentRedirect });

    // Check if update is needed
    if (currentRedirect === phoneNumber) {
      logger.info('Redirect number already correct, no update needed', { name, phoneNumber });
      return { updated: false, officer: name };
    }

    // Update redirect number
    logger.info('Redirect number mismatch, updating...', { 
      current: currentRedirect, 
      new: phoneNumber,
      officer: name 
    });

    const updateSuccess = await serialService.setRedirectNumber(phoneNumber);

    if (!updateSuccess) {
      throw new Error('Failed to set redirect number');
    }

    // Send notification SMS to admin
    const notificationMessage = `Duty officer redirect updated to ${name} (${phoneNumber})`;
    await smsService.sendSMS(config.phone.admin, notificationMessage);

    // Send notification to the new duty officer
    const dutyOfficerMessage = `You are now on duty. All calls will be forwarded to you until your shift ends.`;
    await smsService.sendSMS(phoneNumber, dutyOfficerMessage);

    logger.info('Duty officer update completed successfully', { name, phoneNumber });
    return { updated: true, officer: name, phoneNumber };

  } catch (error) {
    logger.error('Duty officer update job failed', { error: error.message, stack: error.stack });

    // Try to reset modem on failure
    try {
      const serialService = getSerialService();
      await serialService.resetModem();
      logger.info('Modem reset initiated after failure');
    } catch (resetError) {
      logger.error('Failed to reset modem', { error: resetError.message });
    }

    throw error;
  }
}

module.exports = { updateDutyOfficer };
