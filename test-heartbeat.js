
const config = require('./src/config');
const { createLogger } = require('./src/utils/logger');

// Mock config for test
config.healthCheck = { url: process.env.HEALTH_CHECK_URL };
createLogger({ level: 'debug' });

async function sendHeartbeat() {
  const url = config.healthCheck.url;
  console.log(`Sending heartbeat to ${url}...`);
  if (!url) {
    console.error('No URL configured');
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log('Heartbeat sent successfully (Status: ' + response.status + ')');
  } catch (error) {
    console.error('Failed to send heartbeat:', error.message);
  }
}

sendHeartbeat();
