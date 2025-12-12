# SIM Scheduler Project Instructions

This document provides essential context for AI agents working with the sim-scheduler codebase.

## Project Overview

The sim-scheduler is a Node.js application that manages SIM card call forwarding for duty officers in a brigade/emergency response setting. It automatically redirects calls to the current duty officer based on a rotation schedule.

## Key Components

- `app.js`: Main application file handling SIM card operations and SMS processing
- `dutyOfficer.js`: Manages duty officer rotation logic
- `brigadeOfficers.json`: Contains the roster of officers and their phone numbers
- `stopModem.js`: Handles modem reset functionality

## Core Workflows

### Duty Officer Management
- Rotation starts from 2025-01-21 and cycles through officers weekly
- Uses `getDutyOfficer()` to determine current officer based on date
- Officers are defined in `brigadeOfficers.json` with format:
  ```json
  {
    "name": "Officer Name",
    "phoneNumber": "PhoneNumber"
  }
  ```

### SIM Card Operations
1. System checks if SIM is locked (`isSimLocked()`)
2. Unlocks SIM if needed using PIN from environment variables
3. Verifies and updates call forwarding to current duty officer
4. Handles SMS commands for officer queries and changes

### Scheduled Tasks
- Main duty officer update runs daily at 19:00
- SMS check runs every 5 minutes

## Environment Setup

Required environment variables:
- `SIM_PIN`: PIN for unlocking the SIM card
- `ADMIN_PH`: Admin phone number for notifications

## Common Patterns

### Serial Port Communication
- Uses `serialport` package with 115200 baud rate
- Commands use AT protocol with response parsing
- Default timeout of 60 seconds for commands

### SMS Command Format
- `who is`: Query current duty officer
- `change to: [OfficerName]`: Change current duty officer

## Integration Points

1. ModemManager Service
   - Must be stopped before operations: `sudo systemctl stop ModemManager.service`
   - See `stopModem.sh` for implementation

2. Serial Port
   - Default path: `/dev/ttyUSB2`
   - Requires proper permissions for access

## Error Handling

- Failed operations trigger modem reset via `stopModem.js`
- SMS notifications sent to admin for critical state changes
- Timeout handling for AT commands (60s default)

## Project-Specific Conventions

- All AT commands return promises with standardized response format:
  ```javascript
  {success: boolean, data: string[] | null, error?: any}
  ```
- Phone numbers should include country code
- Officer names in commands must match exactly with `brigadeOfficers.json`