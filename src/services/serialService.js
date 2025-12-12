/**
 * Serial Service
 * Handles all AT command communication with the serial device
 * Supports both local serial port and remote SSH tunnel connections
 */

const { SerialPort, ReadlineParser } = require('serialport');
const net = require('net');
const config = require('../config');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

class SerialService {
  constructor() {
    this.port = null;
    this.isRemote = config.remote.enabled;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // Start with 1 second
  }

  /**
   * Send AT command via local serial port
   * @param {string|Array} command - AT command(s) to send
   * @returns {Promise<Object>} { success: boolean, data: Array }
   */
  async sendCommandLocal(command) {
    return new Promise((resolve, reject) => {
      // Create new port instance for each command
      const port = new SerialPort(
        {
          path: config.serial.port,
          baudRate: config.serial.baudRate,
          autoOpen: false,
        },
        (err) => {
          if (err) {
            logger.error('Serial port initialization error', { error: err.message });
          }
        }
      );

      const parser = new ReadlineParser({ delimiter: '\r\n' });
      const data = [];
      let timeoutId = null;

      // Cleanup function
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        try {
          port.unpipe(parser);
          if (port.isOpen) {
            port.close();
          }
        } catch (err) {
          logger.warn('Error during port cleanup', { error: err.message });
        }
      };

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        logger.error('Serial command timeout', { command, timeout: config.serial.timeout });
        reject({ success: false, data: null, error: 'timeout' });
      }, config.serial.timeout);

      // Handle incoming data
      parser.on('data', (serialData) => {
        logger.debug('Serial data received', { data: serialData });

        // Collect non-empty responses
        if (serialData.length > 1 && serialData !== 'OK') {
          data.push(serialData);
        }

        // Success response
        if (serialData.includes('OK')) {
          cleanup();
          logger.debug('Serial command successful', { command, dataLines: data.length });
          resolve({ success: true, data });
        }

        // Error response
        if (serialData.includes('ERROR')) {
          cleanup();
          logger.error('Serial command returned ERROR', { command, data });
          reject({ success: false, data: null, error: 'AT command error' });
        }
      });

      // Open port and send command
      port.open((error) => {
        if (error) {
          cleanup();
          logger.error('Failed to open serial port', { error: error.message });
          reject({ success: false, data: null, error: error.message });
          return;
        }

        port.pipe(parser);

        // Send command(s)
        if (Array.isArray(command)) {
          command.forEach(cmd => {
            logger.debug('Sending command', { command: cmd });
            port.write(`${cmd}`);
          });
        } else {
          logger.debug('Sending command', { command });
          port.write(`${command}\r`);
        }
      });
    });
  }

  /**
   * Send AT command via remote TCP tunnel
   * @param {string|Array} command - AT command(s) to send
   * @returns {Promise<Object>} { success: boolean, data: Array }
   */
  async sendCommandRemote(command) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      const data = [];
      let buffer = '';

      client.connect(config.remote.port, config.remote.host, () => {
        logger.debug('Connected to remote tunnel', { host: config.remote.host, port: config.remote.port });

        // Send command
        const cmdStr = Array.isArray(command) ? command.join('') : `${command}\r`;
        client.write(cmdStr);
      });

      client.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\r\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        lines.forEach(line => {
          if (line.length > 1 && line !== 'OK') {
            data.push(line);
          }

          if (line.includes('OK')) {
            client.destroy();
            resolve({ success: true, data });
          }

          if (line.includes('ERROR')) {
            client.destroy();
            reject({ success: false, data: null, error: 'AT command error' });
          }
        });
      });

      client.on('error', (err) => {
        logger.error('Remote tunnel error', { error: err.message });
        reject({ success: false, data: null, error: err.message });
      });

      client.on('close', () => {
        logger.debug('Remote tunnel connection closed');
      });

      // Timeout
      client.setTimeout(config.serial.timeout, () => {
        client.destroy();
        reject({ success: false, data: null, error: 'timeout' });
      });
    });
  }

  /**
   * Send AT command with retry logic
   * @param {string|Array} command - AT command(s) to send
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} { success: boolean, data: Array }
   */
  async sendCommand(command, attempt = 1) {
    try {
      logger.info('Sending AT command', { command, attempt, isRemote: this.isRemote });

      const result = this.isRemote
        ? await this.sendCommandRemote(command)
        : await this.sendCommandLocal(command);

      return result;
    } catch (error) {
      logger.warn('AT command failed', { 
        command, 
        attempt, 
        error: error.error || error.message,
        willRetry: attempt < this.retryAttempts 
      });

      // Retry with exponential backoff
      if (attempt < this.retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendCommand(command, attempt + 1);
      }

      // All retries exhausted
      logger.error('AT command failed after all retries', { command, attempts: this.retryAttempts });
      throw error;
    }
  }

  /**
   * Check if SIM is locked
   * @returns {Promise<boolean>} True if locked
   */
  async isSimLocked() {
    try {
      const { success, data } = await this.sendCommand('AT+CPIN?');
      logger.debug('SIM lock status check', { success, data });
      return success ? data.some(line => line.includes('SIM PIN')) : false;
    } catch (error) {
      logger.error('Failed to check SIM lock status', { error });
      return false;
    }
  }

  /**
   * Unlock SIM with PIN
   * @returns {Promise<boolean>} True if successful
   */
  async unlockSim() {
    try {
      logger.info('Unlocking SIM...');
      const { success } = await this.sendCommand(`AT+CPIN=${config.sim.pin}`);
      if (success) {
        logger.info('SIM unlocked successfully');
      }
      return success;
    } catch (error) {
      logger.error('Failed to unlock SIM', { error });
      return false;
    }
  }

  /**
   * Get current call forwarding number
   * @returns {Promise<string|null>} Phone number or null
   */
  async getCurrentRedirectNumber() {
    try {
      const { data } = await this.sendCommand('AT+CCFC=0,2');
      if (!data || data.length === 0) {
        logger.warn('No redirect number found');
        return null;
      }

      const [response] = data;
      // Extract phone number from response like: +CCFC: 1,1,"+1234567890",145
      const match = response.match(/"([^"]+)"/);
      const phoneNumber = match ? match[1] : null;
      
      logger.debug('Current redirect number', { phoneNumber });
      return phoneNumber;
    } catch (error) {
      logger.error('Failed to get current redirect number', { error });
      return null;
    }
  }

  /**
   * Set call forwarding to a phone number
   * @param {string} phoneNumber - Phone number to forward to
   * @returns {Promise<boolean>} True if successful
   */
  async setRedirectNumber(phoneNumber) {
    try {
      logger.info('Setting redirect number', { phoneNumber });
      const { success } = await this.sendCommand(`AT+CCFC=0,3,"${phoneNumber}"`);
      if (success) {
        logger.info('Redirect number set successfully', { phoneNumber });
      }
      return success;
    } catch (error) {
      logger.error('Failed to set redirect number', { phoneNumber, error });
      return false;
    }
  }

  /**
   * Reset modem by stopping ModemManager service
   * @returns {Promise<void>}
   */
  async resetModem() {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      logger.warn('Resetting modem...');
      exec('sudo systemctl stop ModemManager.service', (error, stdout, stderr) => {
        if (error) {
          logger.error('Failed to reset modem', { error: error.message, stderr });
          reject(error);
          return;
        }
        logger.info('Modem reset successful', { stdout });
        resolve();
      });
    });
  }
}

// Export singleton instance
let serviceInstance = null;

function getSerialService() {
  if (!serviceInstance) {
    serviceInstance = new SerialService();
  }
  return serviceInstance;
}

module.exports = { getSerialService, SerialService };
