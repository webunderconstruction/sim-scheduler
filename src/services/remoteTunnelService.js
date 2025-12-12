/**
 * Remote Tunnel Service
 * TCP server that forwards AT commands to serial port for dev mode
 */

const net = require('net');
const { SerialPort, ReadlineParser } = require('serialport');
const config = require('../config');
const { getLogger } = require('../utils/logger');

const logger = getLogger();

class RemoteTunnelService {
  constructor() {
    this.server = null;
    this.port = config.remote.port;
    this.host = config.remote.host;
  }

  /**
   * Start TCP server
   */
  start() {
    if (!config.remote.enabled) {
      logger.info('Remote tunnel is disabled');
      return;
    }

    this.server = net.createServer((socket) => {
      logger.info('Remote client connected', { 
        remoteAddress: socket.remoteAddress,
        remotePort: socket.remotePort 
      });

      this.handleClient(socket);
    });

    this.server.listen(this.port, this.host, () => {
      logger.info('Remote tunnel server started', { host: this.host, port: this.port });
      logger.warn('SECURITY: Tunnel server is running. Ensure it is only accessible via SSH tunnel!');
    });

    this.server.on('error', (err) => {
      logger.error('Tunnel server error', { error: err.message });
    });
  }

  /**
   * Handle client connection
   */
  handleClient(socket) {
    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Check if we have a complete command (ends with \r)
      if (buffer.includes('\r')) {
        const command = buffer.trim();
        buffer = '';

        logger.debug('Received command from remote client', { command });

        try {
          const response = await this.executeCommand(command);
          socket.write(response);
        } catch (error) {
          logger.error('Error executing remote command', { error: error.message });
          socket.write('ERROR\r\n');
        }
      }
    });

    socket.on('end', () => {
      logger.info('Remote client disconnected');
    });

    socket.on('error', (err) => {
      logger.error('Socket error', { error: err.message });
    });
  }

  /**
   * Execute AT command on serial port
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const port = new SerialPort(
        {
          path: config.serial.port,
          baudRate: config.serial.baudRate,
          autoOpen: false,
        },
        (err) => {
          if (err) {
            logger.error('Serial port error', { error: err.message });
          }
        }
      );

      const parser = new ReadlineParser({ delimiter: '\r\n' });
      let response = '';
      let timeoutId = null;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        try {
          port.unpipe(parser);
          if (port.isOpen) {
            port.close();
          }
        } catch (err) {
          logger.warn('Cleanup error', { error: err.message });
        }
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout'));
      }, config.serial.timeout);

      parser.on('data', (data) => {
        response += data + '\r\n';

        if (data.includes('OK') || data.includes('ERROR')) {
          cleanup();
          resolve(response);
        }
      });

      port.open((error) => {
        if (error) {
          cleanup();
          reject(error);
          return;
        }

        port.pipe(parser);
        port.write(`${command}\r`);
      });
    });
  }

  /**
   * Stop server
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        logger.info('Remote tunnel server stopped');
      });
    }
  }
}

module.exports = { RemoteTunnelService };
