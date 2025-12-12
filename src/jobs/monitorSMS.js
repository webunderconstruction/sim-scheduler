/**
 * Monitor SMS Job
 * Checks for incoming SMS and processes commands or forwards messages
 */

const { getLogger } = require('../utils/logger');
const { getSerialService } = require('../services/serialService');
const { getSMSService } = require('../services/smsService');
const { 
  getDutyOfficer, 
  getDutyOfficerByPhoneNumber,
  getDutyOfficerPhoneNumberByName 
} = require('../services/dutyOfficerService');

const logger = getLogger();

/**
 * Process a single SMS message
 * @param {Object} sms - SMS object with id, sender, message
 * @returns {Promise<void>}
 */
async function processSMS(sms) {
  const { id, sender, message } = sms;

  logger.info('Processing SMS', { id, sender, messagePreview: message.substring(0, 50) });

  if (!message || message.trim().length === 0) {
    logger.warn('Empty SMS message, skipping', { id });
    return;
  }

  const smsService = getSMSService();
  const serialService = getSerialService();

  // Check if this is a command
  const command = smsService.processCommand(message);

  if (command.valid) {
    logger.info('Processing SMS command', { type: command.type, sender });

    try {
      switch (command.type) {
        case 'who_is':
          await handleWhoIsCommand(sender, serialService, smsService);
          break;

        case 'change_to':
          await handleChangeToCommand(sender, command.data, serialService, smsService);
          break;

        default:
          logger.warn('Unknown command type', { type: command.type });
      }
    } catch (error) {
      logger.error('Failed to process command', { type: command.type, error: error.message });
      await smsService.sendSMS(sender, 'Error processing command. Please try again.');
    }
  } else {
    // Not a command, forward to duty officer
    await forwardToDutyOfficer(sms, smsService);
  }

  // Delete processed SMS
  try {
    await smsService.deleteSMS(id);
    logger.debug('Deleted processed SMS', { id });
  } catch (error) {
    logger.warn('Failed to delete SMS', { id, error: error.message });
  }
}

/**
 * Handle "who is" command - returns current duty officer
 */
async function handleWhoIsCommand(sender, serialService, smsService) {
  logger.info('Handling "who is" command', { sender });

  // Get current redirect from device
  const currentRedirect = await serialService.getCurrentRedirectNumber();
  const currentName = getDutyOfficerByPhoneNumber(currentRedirect);

  // Get who should be on duty according to rotation
  const { name: scheduledName } = getDutyOfficer(new Date());

  let response;
  if (currentName === scheduledName) {
    response = `Current duty officer: ${currentName}`;
  } else {
    response = `Current redirect: ${currentName || 'Unknown'}\nScheduled duty officer: ${scheduledName}`;
  }

  await smsService.sendSMS(sender, response);
  logger.info('Sent "who is" response', { sender, currentName, scheduledName });
}

/**
 * Handle "change to: Name" command - manually changes duty officer
 */
async function handleChangeToCommand(sender, officerName, serialService, smsService) {
  logger.info('Handling "change to" command', { sender, officerName });

  // Get phone number for the requested officer
  const phoneNumber = getDutyOfficerPhoneNumberByName(officerName);

  if (!phoneNumber) {
    logger.warn('Officer not found', { officerName });
    await smsService.sendSMS(sender, `Officer "${officerName}" not found in roster.`);
    return;
  }

  // Update redirect
  const success = await serialService.setRedirectNumber(phoneNumber);

  if (success) {
    const response = `Duty officer redirect updated to ${officerName} (${phoneNumber})`;
    await smsService.sendSMS(sender, response);
    logger.info('Duty officer manually changed', { officerName, phoneNumber, requestedBy: sender });
  } else {
    await smsService.sendSMS(sender, 'Failed to update redirect. Please try again.');
    logger.error('Failed to change duty officer', { officerName, phoneNumber });
  }
}

/**
 * Forward SMS to current duty officer
 */
async function forwardToDutyOfficer(sms, smsService) {
  const { sender, message } = sms;

  // Get current duty officer
  const { name, phoneNumber } = getDutyOfficer(new Date());

  logger.info('Forwarding SMS to duty officer', { 
    from: sender, 
    to: phoneNumber, 
    officer: name 
  });

  const success = await smsService.forwardSMS(sender, message, phoneNumber);

  if (success) {
    logger.info('SMS forwarded successfully', { to: name });
  } else {
    logger.error('Failed to forward SMS', { to: name });
  }
}

/**
 * Main job to monitor and process SMS
 */
async function monitorSMS() {
  logger.info('=== Starting SMS Monitor Job ===');

  try {
    const smsService = getSMSService();

    // Get unread SMS messages
    const smsList = await smsService.getUnreadSMS();

    if (smsList.length === 0) {
      logger.debug('No unread SMS messages');
      return { processed: 0 };
    }

    logger.info('Found unread SMS messages', { count: smsList.length });

    // Process each SMS
    for (const sms of smsList) {
      try {
        await processSMS(sms);
      } catch (error) {
        logger.error('Error processing individual SMS', { 
          id: sms.id, 
          error: error.message 
        });
        // Continue processing other messages
      }
    }

    logger.info('SMS monitoring completed', { processed: smsList.length });
    return { processed: smsList.length };

  } catch (error) {
    logger.error('SMS monitor job failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

module.exports = { monitorSMS };
