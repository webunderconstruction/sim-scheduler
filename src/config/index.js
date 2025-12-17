/**
 * Configuration module
 * Validates and exports all application configuration
 */

require('dotenv').config();

/**
 * Validates required environment variables
 * @param {string} varName - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {string} The environment variable value
 */
function getEnvVar(varName, defaultValue = null) {
  const value = process.env[varName];
  if (value === undefined && defaultValue === null) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  return value !== undefined ? value : defaultValue;
}

/**
 * Parse boolean environment variable
 */
function getBoolEnvVar(varName, defaultValue = false) {
  const value = process.env[varName];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse integer environment variable
 */
function getIntEnvVar(varName, defaultValue = null) {
  const value = process.env[varName];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer value for ${varName}: ${value}`);
  }
  return parsed;
}

const config = {
  // Environment
  env: getEnvVar('NODE_ENV', 'production'),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Serial Port Configuration
  serial: {
    port: getEnvVar('SERIAL_PORT', '/dev/ttyUSB2'),
    baudRate: getIntEnvVar('SERIAL_BAUD_RATE', 115200),
    timeout: getIntEnvVar('SERIAL_TIMEOUT', 60000),
  },

  // SIM Configuration
  sim: {
    pin: getEnvVar('SIM_PIN'),
  },

  // Phone Numbers
  phone: {
    admin: getEnvVar('ADMIN_PH'),
  },

  // Scheduling (cron expressions)
  schedule: {
    dutyUpdate: getEnvVar('DUTY_UPDATE_CRON', '0 10 * * 7'), // 10am Sunday
    smsCheck: getEnvVar('SMS_CHECK_CRON', '*/5 * * * *'),    // Every 5 minutes
    heartbeat: getEnvVar('HEARTBEAT_CRON', '*/5 * * * *'),   // Every 5 minutes
  },

  // Health Monitoring
  healthCheck: {
    url: getEnvVar('HEALTH_CHECK_URL', null),
  },

  // Dev Mode / Remote Tunnel
  remote: {
    enabled: getBoolEnvVar('ENABLE_REMOTE_TUNNEL', false),
    port: getIntEnvVar('TUNNEL_PORT', 3000),
    host: getEnvVar('TUNNEL_HOST', 'localhost'),
  },

  // Logging
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    file: getEnvVar('LOG_FILE', null),
  },

  // Duty Officer
  dutyOfficer: {
    dataFile: getEnvVar('DUTY_OFFICER_FILE', './brigadeOfficers.json'),
  },
};

// Validate configuration on load
function validateConfig() {
  // Validate phone numbers format (basic check)
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  
  if (!phoneRegex.test(config.phone.admin)) {
    throw new Error(`Invalid admin phone number format: ${config.phone.admin}`);
  }

  // Validate SIM PIN (should be 4-8 digits)
  if (!/^\d{4,8}$/.test(config.sim.pin)) {
    throw new Error('SIM PIN must be 4-8 digits');
  }

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(config.logging.level)) {
    throw new Error(`Invalid log level: ${config.logging.level}. Must be one of: ${validLogLevels.join(', ')}`);
  }
}

// Run validation
validateConfig();

module.exports = config;
