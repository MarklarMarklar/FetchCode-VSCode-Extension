#!/usr/bin/env bash
#
# FetchCoder API Server Stop Script
#

set -e

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/api-server.pid"

if [ ! -f "$PID_FILE" ]; then
    echo -e "${YELLOW}No PID file found. Checking for running processes...${NC}"
    if pkill -f "node.*api-server" 2>/dev/null; then
        echo -e "${GREEN}✓ Stopped API server process${NC}"
    else
        echo "No API server processes found"
    fi
    exit 0
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping API server (PID: $PID)..."
    kill "$PID"
    sleep 1
    
    # Force kill if still running
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Force killing..."
        kill -9 "$PID"
    fi
    
    echo -e "${GREEN}✓ API server stopped${NC}"
else
    echo -e "${YELLOW}Process $PID not running${NC}"
fi

rm -f "$PID_FILE"

