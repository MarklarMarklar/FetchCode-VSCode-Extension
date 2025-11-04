#!/usr/bin/env bash
#
# FetchCoder API Server Startup Script
#
# This script starts the REST API server that provides endpoints
# for the FetchCoder VSCode extension.

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_SERVER_DIR="$HOME/.fetchcoder"
API_SERVER_SCRIPT="$API_SERVER_DIR/api-server.js"
PID_FILE="$API_SERVER_DIR/api-server.pid"
LOG_FILE="$API_SERVER_DIR/api-server.log"
PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"

echo -e "${BLUE}🚀 Starting FetchCoder API Server${NC}"
echo ""

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Server already running (PID: $OLD_PID)${NC}"
        echo -e "${GREEN}✓ Server is accessible at http://${HOST}:${PORT}${NC}"
        exit 0
    else
        echo "Cleaning up stale PID file..."
        rm -f "$PID_FILE"
    fi
fi

# Start the server
cd "$API_SERVER_DIR"
nohup node "$API_SERVER_SCRIPT" > "$LOG_FILE" 2>&1 &
PID=$!

# Save PID
echo "$PID" > "$PID_FILE"

# Wait a moment for server to start
sleep 2

# Check if it's actually running
if ! ps -p "$PID" > /dev/null 2>&1; then
    echo -e "${YELLOW}❌ Failed to start server${NC}"
    echo ""
    echo "Last 20 lines of log:"
    tail -n 20 "$LOG_FILE"
    exit 1
fi

# Test the health endpoint
if curl -s -f "http://${HOST}:${PORT}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server started successfully!${NC}"
    echo ""
    echo "  PID:      $PID"
    echo "  URL:      http://${HOST}:${PORT}"
    echo "  Log:      $LOG_FILE"
    echo ""
    echo -e "${BLUE}Endpoints:${NC}"
    echo "  GET  /health      - Health check"
    echo "  POST /api/chat    - Chat with FetchCoder"
    echo "  POST /api/command - Execute commands"
    echo ""
    echo -e "${GREEN}Ready for VSCode extension connections!${NC}"
    echo ""
    echo "To stop the server, run:"
    echo "  kill $PID"
    echo "  # or"
    echo "  pkill -f 'node.*api-server'"
else
    echo -e "${YELLOW}⚠️  Server started but health check failed${NC}"
    echo "Check logs at: $LOG_FILE"
    exit 1
fi

