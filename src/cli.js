#!/usr/bin/env node
/**
 * CLI Tool for Development and Testing
 * Allows interactive testing of AT commands and duty officer logic
 */

const readline = require('readline');
const net = require('net');
const config = require('./config');
const { getDutyOfficer, getAllOfficers } = require('./services/dutyOfficerService');
const { createLogger } = require('./utils/logger');

// Initialize logger for CLI
const logger = createLogger({ level: 'info' });

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    remote: null,
    testDutyOfficer: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--remote' || arg === '-r') {
      options.remote = args[++i];
    } else if (arg === '--test-duty-officer' || arg === '-t') {
      options.testDutyOfficer = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Sim-Scheduler CLI Tool

Usage:
  node src/cli.js [options]

Options:
  --remote, -r <host:port>    Connect to remote tunnel (e.g., localhost:3000)
  --test-duty-officer, -t     Test duty officer rotation logic
  --help, -h                  Show this help message

Examples:
  # Interactive mode with remote connection
  node src/cli.js --remote localhost:3000

  # Test duty officer logic
  node src/cli.js --test-duty-officer

  # Interactive mode with local serial port
  node src/cli.js
  `);
}

/**
 * Test duty officer rotation
 */
function testDutyOfficer() {
  console.log('\n=== Duty Officer Rotation Test ===\n');

  const officers = getAllOfficers();
  console.log(`Total officers in rotation: ${officers.length}`);
  console.log('Officers:', officers.map(o => o.name).join(', '));
  console.log('');

  // Current duty officer
  const current = getDutyOfficer(new Date());
  console.log(`Current duty officer: ${current.name} (${current.phoneNumber})`);
  console.log('');

  // Next few weeks
  console.log('Upcoming rotation:');
  for (let i = 1; i <= 4; i++) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + (i * 7));
    const officer = getDutyOfficer(futureDate);
    console.log(`  Week ${i}: ${officer.name} (starting ${futureDate.toLocaleDateString()})`);
  }
  console.log('');
}

/**
 * Send AT command via remote tunnel
 */
async function sendRemoteCommand(host, port, command) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = '';

    client.connect(port, host, () => {
      client.write(`${command}\r`);
    });

    client.on('data', (data) => {
      response += data.toString();
      
      if (response.includes('OK') || response.includes('ERROR')) {
        client.destroy();
        resolve(response);
      }
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error('Timeout'));
    });
  });
}

/**
 * Interactive mode
 */
async function interactiveMode(remoteHost, remotePort) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'AT> ',
  });

  console.log('\n=== Sim-Scheduler Interactive Mode ===');
  if (remoteHost) {
    console.log(`Connected to: ${remoteHost}:${remotePort}`);
  } else {
    console.log(`Local serial port: ${config.serial.port}`);
  }
  console.log('Type AT commands or "exit" to quit\n');

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }

    if (!input) {
      rl.prompt();
      return;
    }

    try {
      if (remoteHost) {
        const response = await sendRemoteCommand(remoteHost, remotePort, input);
        console.log(response);
      } else {
        console.log('Local mode not yet implemented. Use --remote option.');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

/**
 * Main CLI entry point
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  if (options.testDutyOfficer) {
    testDutyOfficer();
    return;
  }

  // Parse remote host:port
  let remoteHost = null;
  let remotePort = null;
  
  if (options.remote) {
    const parts = options.remote.split(':');
    remoteHost = parts[0];
    remotePort = parseInt(parts[1], 10);

    if (!remotePort || isNaN(remotePort)) {
      console.error('Invalid remote format. Use: host:port');
      process.exit(1);
    }
  }

  // Start interactive mode
  await interactiveMode(remoteHost, remotePort);
}

// Run CLI
main().catch((error) => {
  console.error('CLI error:', error);
  process.exit(1);
});
