
const https = require('https');
const config = require('./src/config');
const { createLogger } = require('./src/utils/logger');

// Mock config for test
config.healthCheck = { url: process.env.HEALTH_CHECK_URL };
createLogger({ level: 'debug' });

async function sendHeartbeat() {
  const url = config.healthCheck.url;
  console.log(`Sending heartbeat to ${url}...`);
  console.log('Using options: IPv4 only (family: 4), 10s timeout');

  if (!url) {
    console.error('No URL configured');
    return;
  }

  return new Promise((resolve, reject) => {
    const options = {
      family: 4, // Force IPv4
      timeout: 10000,
    };

    const req = https.get(url, options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Heartbeat sent successfully');
        resolve();
      } else {
        console.error(`Heartbeat failed with status: ${res.statusCode}`);
        reject(new Error(`Status ${res.statusCode}`));
      }
    });

    req.on('timeout', () => {
      console.error('Request timed out!');
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.on('error', (error) => {
      console.error('Failed to send heartbeat:', error.message);
      reject(error);
    });

    req.end();
  });
}

sendHeartbeat();
