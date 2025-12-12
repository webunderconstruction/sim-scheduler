/**
 * Logger utility
 * Provides structured logging with different levels
 */

const fs = require('fs');
const path = require('path');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || 'info';
    this.logFile = options.file || null;
    this.levelValue = LOG_LEVELS[this.level] || LOG_LEVELS.info;
  }

  /**
   * Format log message with timestamp and level
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  /**
   * Write log to console and optionally to file
   */
  write(level, message, meta = {}) {
    if (LOG_LEVELS[level] > this.levelValue) {
      return; // Skip if below configured level
    }

    const formatted = this.formatMessage(level, message, meta);

    // Console output with colors
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](formatted);

    // File output
    if (this.logFile) {
      try {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(this.logFile, formatted + '\n');
      } catch (err) {
        console.error('Failed to write to log file:', err);
      }
    }
  }

  error(message, meta) {
    this.write('error', message, meta);
  }

  warn(message, meta) {
    this.write('warn', message, meta);
  }

  info(message, meta) {
    this.write('info', message, meta);
  }

  debug(message, meta) {
    this.write('debug', message, meta);
  }
}

// Export singleton instance
let loggerInstance = null;

function createLogger(options) {
  loggerInstance = new Logger(options);
  return loggerInstance;
}

function getLogger() {
  if (!loggerInstance) {
    loggerInstance = new Logger();
  }
  return loggerInstance;
}

module.exports = { createLogger, getLogger };
