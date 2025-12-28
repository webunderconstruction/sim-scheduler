# Sim-Scheduler

Automated duty officer rotation and SMS forwarding system for serial AT command devices (GSM/LTE modems). Manages weekly duty officer rotation, forwards incoming SMS messages, and provides remote development access via SSH tunnel.

## Features

- **Automated Duty Officer Rotation**: Weekly rotation based on configurable schedule
- **Call Forwarding**: Automatically updates call forwarding to current duty officer
- **SMS Monitoring**: Processes incoming SMS messages and forwards to duty officer
- **SMS Commands**: 
  - `who is` - Returns current duty officer
  - `change to: [Name]` - Manually change duty officer
- **Health Checks**: Periodic SMS notifications to verify system is running
- **Dev Mode**: Test AT commands remotely via SSH tunnel during development
- **Comprehensive Logging**: Structured logging with configurable levels

## Architecture

```
src/
├── config/          # Configuration management
├── services/        # Core services (serial, SMS, duty officer)
├── jobs/            # Scheduled jobs (cron tasks)
├── utils/           # Utilities (logger, validators)
├── index.js         # Main application entry point
└── cli.js           # CLI tool for development/testing
```

## Requirements

- Node.js 14+
- Serial device (GSM/LTE modem) connected via USB
- Raspberry Pi or Linux system (for production)
- PM2 (for production deployment)

## Installation

### On Raspberry Pi (Production)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sim-scheduler
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   nano .env
   ```

4. Update configuration in `.env`:
   - Set `SIM_PIN` to your SIM card PIN
   - Set `ADMIN_PH` to admin phone number
   - Set `HEALTH_CHECK_PH` to health check recipient
   - Adjust cron schedules if needed

5. Create `brigadeOfficers.json`:
   ```bash
   cp brigadeOfficers_sample.json brigadeOfficers.json
   nano brigadeOfficers.json
   ```

6. Start with PM2 and configure auto-startup:
   ```bash
   # Start the application
   npm run pm2:start
   
   # Generate startup script
   pm2 startup
   ```
   
   **IMPORTANT**: Run the command output by the `pm2 startup` step above. It will look something like `sudo env PATH=$PATH...`.
   
   Then freeze the process list:
   ```bash
   pm2 save
   ```

### On Development Machine (Mac/Linux)

1. Follow steps 1-5 above

2. Enable remote tunnel on Raspberry Pi:
   ```bash
   # On Pi: Edit .env
   ENABLE_REMOTE_TUNNEL=true
   NODE_ENV=production
   
   # Start application
   npm start
   ```

3. Create SSH tunnel from your Mac:
   ```bash
   ssh -L 3000:localhost:3000 pi@raspberrypi.local
   ```

4. Use CLI tool on your Mac:
   ```bash
   # Set dev environment
   export NODE_ENV=development
   
   # Interactive mode
   npm run cli -- --remote localhost:3000
   
   # Test duty officer logic
   npm run cli -- --test-duty-officer
   ```

## Configuration

All configuration is done via environment variables in `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `SERIAL_PORT` | Serial device path | `/dev/ttyUSB2` |
| `SERIAL_BAUD_RATE` | Baud rate | `115200` |
| `SIM_PIN` | SIM card PIN | Required |
| `ADMIN_PH` | Admin phone number | Required |
| `HEALTH_CHECK_PH` | Health check recipient | Same as `ADMIN_PH` |
| `DUTY_UPDATE_CRON` | Duty update schedule | `0 19 * * *` (7 PM daily) |
| `SMS_CHECK_CRON` | SMS check schedule | `*/5 * * * *` (Every 5 min) |
| `HEALTH_CHECK_CRON` | Health check schedule | `0 8,20 * * *` (8 AM & 8 PM) |
| `NODE_ENV` | Environment | `production` |
| `ENABLE_REMOTE_TUNNEL` | Enable dev tunnel | `false` |
| `LOG_LEVEL` | Log level | `info` |

## Usage

### Production Commands

```bash
# Start application
npm start

# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop
```

### Development Commands

```bash
# Test duty officer rotation
npm run cli -- --test-duty-officer

# Interactive AT command mode (via SSH tunnel)
npm run cli -- --remote localhost:3000

# Example AT commands:
AT> AT+CPIN?          # Check SIM status
AT> AT+CCFC=0,2       # Get current redirect
AT> AT+CMGL="ALL"     # List all SMS
```

### SMS Commands

Send these commands via SMS to the device:

- **`who is`** - Returns current duty officer name
- **`change to: John`** - Manually change duty officer to John

## Duty Officer Rotation

The rotation is based on a weekly schedule starting from a configured start date. Edit `src/services/dutyOfficerService.js` to change the start date if needed (currently set to January 21, 2025).

Officers are defined in `brigadeOfficers.json`:

```json
[
  {
    "name": "Officer A",
    "phoneNumber": "+1234567890"
  },
  {
    "name": "Officer B",
    "phoneNumber": "+0987654321"
  }
]
```

## Troubleshooting

### Serial Port Issues

If the serial port is locked:

```bash
# Stop ModemManager service
sudo systemctl stop ModemManager.service

# Check port permissions
ls -l /dev/ttyUSB*

# Add user to dialout group
sudo usermod -a -G dialout $USER
```

### Application Not Starting

```bash
# Check logs
npm run pm2:logs

# Verify configuration
node -e "require('./src/config')"

# Test serial connection
npm run cli -- --test-duty-officer
```

### SMS Not Being Received

1. Check SIM card is inserted and unlocked
2. Verify signal strength: `AT+CSQ`
3. Check SMS mode: `AT+CMGF=1` (should be text mode)
4. List all SMS: `AT+CMGL="ALL"`

### Remote Tunnel Not Working

1. Verify `ENABLE_REMOTE_TUNNEL=true` on Pi
2. Check SSH tunnel is active: `netstat -an | grep 3000`
3. Test connection: `telnet localhost 3000`

## Security Notes

- The remote tunnel only listens on `localhost` - it must be accessed via SSH tunnel
- Never expose the tunnel port directly to the internet
- Keep your `.env` file secure and never commit it to version control
- The `brigadeOfficers.json` file is gitignored to protect phone numbers

## License

ISC

## Author

Matt Todd