#!/bin/bash
# Usage: ./send_at_minicom.sh "AT+CSQ"

AT_COMMAND="$1"
SERIAL_PORT="/dev/ttyUSB2" # Change to your actual serial device
MINICOM_LOG="/tmp/minicom_at.log"

# Remove previous log
rm -f "$MINICOM_LOG"

# Send AT command using minicom
(echo "$AT_COMMAND"; sleep 1) | minicom -b 115200 -D "$SERIAL_PORT" -C "$MINICOM_LOG" -o

# Wait for minicom to write log
sleep 2

# Output the last response from the log
if [ -f "$MINICOM_LOG" ]; then
    tail -n 10 "$MINICOM_LOG"
else
    echo "ERROR: No response from minicom"
    exit 1
fi
