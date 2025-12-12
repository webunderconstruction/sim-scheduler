#!/usr/bin/env node
/**
 * Main Application Entry Point
 * Initializes services and schedules jobs
 */

const cron = require('node-cron');
const config = require('./config');
const { createLogger, getLogger } = require('./utils/logger');
const { updateDutyOfficer } = require('./jobs/updateDutyOfficer');
const { monitorSMS } = require('./jobs/monitorSMS');
const { RemoteTunnelService } = require('./services/remoteTunnelService');

// Initialize logger
createLogger({
  level: config.logging.level,
  file: config.logging.file,
});

const logger = getLogger();

/**
 * Initialize application
 */
async function init() {
  logger.info('=== Sim-Scheduler Starting ===');
  logger.info('Environment', { 
    env: config.env,
    isDevelopment: config.isDevelopment,
    remoteTunnelEnabled: config.remote.enabled,
  });

  // Start remote tunnel service if enabled
  if (config.remote.enabled) {
    const tunnelService = new RemoteTunnelService();
    tunnelService.start();
  }

  // Schedule jobs
  scheduleCronJobs();

  logger.info('Application initialized successfully');
}

/**
 * Schedule cron jobs
 */
function scheduleCronJobs() {
  logger.info('Scheduling cron jobs...');

  // Duty officer update job
  cron.schedule(config.schedule.dutyUpdate, async () => {
    try {
      await updateDutyOfficer();
    } catch (error) {
      logger.error('Duty officer update job error', { error: error.message });
    }
  });
  logger.info('Scheduled duty officer update', { cron: config.schedule.dutyUpdate });

  // SMS monitoring job
  cron.schedule(config.schedule.smsCheck, async () => {
    try {
      await monitorSMS();
    } catch (error) {
      logger.error('SMS monitor job error', { error: error.message });
    }
  });
  logger.info('Scheduled SMS monitoring', { cron: config.schedule.smsCheck });

  // Health check job (sends SMS to admin)
  cron.schedule(config.schedule.healthCheck, async () => {
    try {
      await sendHealthCheck();
    } catch (error) {
      logger.error('Health check job error', { error: error.message });
    }
  });
  logger.info('Scheduled health check', { cron: config.schedule.healthCheck });

  logger.info('All cron jobs scheduled successfully');
}

/**
 * Send health check SMS
 */
async function sendHealthCheck() {
  logger.info('=== Starting Health Check ===');
  
  const { getSMSService } = require('./services/smsService');
  const smsService = getSMSService();

  const message = `Sim-Scheduler Health Check - ${new Date().toLocaleString()}`;
  const success = await smsService.sendSMS(config.phone.healthCheck, message);

  if (success) {
    logger.info('Health check SMS sent successfully');
  } else {
    logger.error('Failed to send health check SMS');
  }
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers() {
  const shutdown = (signal) => {
    logger.info('Received shutdown signal', { signal });
    logger.info('Shutting down gracefully...');
    
    // Give time for any ongoing operations to complete
    setTimeout(() => {
      logger.info('Shutdown complete');
      process.exit(0);
    }, 2000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Global error handlers
 */
function setupErrorHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    // Don't exit on uncaught exceptions in production
    if (config.isDevelopment) {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { reason, promise });
    // Don't exit on unhandled rejections in production
    if (config.isDevelopment) {
      process.exit(1);
    }
  });
}

// Setup handlers
setupErrorHandlers();
setupShutdownHandlers();

// Start application
init().catch((error) => {
  logger.error('Failed to initialize application', { error: error.message, stack: error.stack });
  process.exit(1);
});
