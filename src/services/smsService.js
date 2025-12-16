/**
 * SMS Service
 * Handles sending, receiving, and parsing SMS messages
 */

const { getLogger } = require('../utils/logger');
const { validateSMSCommand, sanitizeForLog } = require('../utils/validators');
const { getSerialService } = require('./serialService');

const logger = getLogger();

class SMSService {
  constructor() {
    this.serialService = getSerialService();
  }

  /**
   * Send SMS message
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message text
   * @returns {Promise<boolean>} True if successful
   */
  async sendSMS(phoneNumber, message) {
    try {
      logger.info('Sending SMS', { phoneNumber, messageLength: message.length });

      // AT commands for sending SMS
      const commands = [
        `AT+CMGS="${phoneNumber}"\r`,
        `${message}\x1A` // Ctrl+Z to send
      ];

      const { success, data } = await this.serialService.sendCommand(commands);

      if (success) {
        logger.info('SMS sent successfully', { phoneNumber });
      } else {
        logger.error('Failed to send SMS', { phoneNumber, data });
      }

      return success;
    } catch (error) {
      logger.error('SMS send error', { phoneNumber, error: error.error || error.message });
      return false;
    }
  }

  /**
   * Get list of unread SMS messages
   * @returns {Promise<Array>} Array of SMS objects
   */
  async getUnreadSMS() {
    try {
      logger.debug('Fetching unread SMS...');
      const { success, data } = await this.serialService.sendCommand('AT+CMGL="REC UNREAD"');

      if (!success || !data || data.length === 0) {
        logger.debug('No unread SMS found');
        return [];
      }

      const smsList = this.parseSMSList(data);
      logger.info('Retrieved unread SMS', { count: smsList.length });
      return smsList;
    } catch (error) {
      logger.error('Failed to get unread SMS', { error: error.error || error.message });
      return [];
    }
  }

  /**
   * Parse SMS list response from AT command
   * @param {Array} rawData - Raw response lines from AT+CMGL
   * @returns {Array} Parsed SMS objects
   */
  parseSMSList(rawData) {
    const smsList = [];
    let currentSms = null;

    for (const line of rawData) {
      if (!line) continue;
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Check if this is a metadata line
      const metaMatch = trimmedLine.match(/^\+CMGL: (\d+),"[^"]*","([^"]+)"/);

      if (metaMatch) {
        // Save previous SMS if exists
        if (currentSms) {
          smsList.push(currentSms);
        }

        // Start new SMS
        currentSms = {
          id: metaMatch[1],
          sender: metaMatch[2],
          timestamp: new Date(), // Could parse timestamp from response if needed
          message: ''
        };
      } else if (currentSms) {
        // This is a message content line
        
        // Filter out AT command echoes
        // If the line looks like an AT command echoed back, ignore it
        if (trimmedLine.toUpperCase().startsWith('AT+')) {
          logger.debug('Ignoring AT command echo in SMS body', { line: sanitizeForLog(trimmedLine) });
          continue;
        }

        // Append to current message
        if (currentSms.message) {
          currentSms.message += '\n' + trimmedLine;
        } else {
          currentSms.message = trimmedLine;
        }
      }
    }

    // Push the last SMS if exists
    if (currentSms) {
      smsList.push(currentSms);
    }

    return smsList;
  }

  /**
   * Parse SMS metadata line
   * @param {string} metaLine - Metadata line from AT response
   * @returns {Object|null} Parsed metadata or null
   */
  parseSMSMeta(metaLine) {
    // Kept for backward compatibility or potential reuse, 
    // though the logic is now integrated into parseSMSList
    const match = metaLine.match(/\+CMGL: (\d+),"[^"]*","([^"]+)"/);
    
    if (!match) {
      return null;
    }

    return {
      id: match[1],
      sender: match[2],
      timestamp: new Date(),
    };
  }

  /**
   * Delete SMS by ID
   * @param {string} id - SMS ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteSMS(id) {
    try {
      logger.debug('Deleting SMS', { id });
      const { success } = await this.serialService.sendCommand(`AT+CMGD=${id}`);
      
      if (success) {
        logger.debug('SMS deleted', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to delete SMS', { id, error: error.error || error.message });
      return false;
    }
  }

  /**
   * Forward SMS to a phone number
   * @param {string} originalSender - Original sender's phone number
   * @param {string} message - Message content
   * @param {string} forwardTo - Phone number to forward to
   * @returns {Promise<boolean>} True if successful
   */
  async forwardSMS(originalSender, message, forwardTo) {
    const forwardedMessage = `Forwarded SMS from ${originalSender}:\n${message}`;
    logger.info('Forwarding SMS', { from: originalSender, to: forwardTo });
    return this.sendSMS(forwardTo, forwardedMessage);
  }

  /**
   * Process SMS command
   * @param {string} message - SMS message content
   * @returns {Object} { valid: boolean, type: string, data: any }
   */
  processCommand(message) {
    return validateSMSCommand(message);
  }
}

// Export singleton instance
let serviceInstance = null;

function getSMSService() {
  if (!serviceInstance) {
    serviceInstance = new SMSService();
  }
  return serviceInstance;
}

module.exports = { getSMSService, SMSService };
