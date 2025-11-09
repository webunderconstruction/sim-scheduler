#!/bin/bash

# Mock AT command handler
command="$1"

# Function to handle AT commands
handle_at_command() {
    local cmd="$1"
    
    case "$cmd" in
        "AT")
            echo "OK"
            ;;
        "AT+CSQ")
            echo "+CSQ: 23,99"
            echo "OK"
            ;;
        "AT+CREG?")
            echo "+CREG: 0,1"
            echo "OK"
            ;;
        "AT+COPS?")
            echo "+COPS: 0,0,\"MOCK OPERATOR\""
            echo "OK"
            ;;
        "AT+CGMI")
            echo "MOCK MANUFACTURER"
            echo "OK"
            ;;
        "AT+CGMM")
            echo "MOCK MODEL"
            echo "OK"
            ;;
        "AT+CGSN")
            echo "123456789012345"
            echo "OK"
            ;;
        *)
            echo "ERROR"
            exit 1
            ;;
    esac
}

# Check if command is provided
if [ -z "$command" ]; then
    echo "ERROR: No command provided"
    exit 1
fi

# Execute the command
handle_at_command "$command"