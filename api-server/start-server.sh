#!/bin/bash

# FetchCoder API Server Startup Script

API_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_FILE="$API_DIR/api-server.log"
PID_FILE="$API_DIR/api-server.pid"

case "$1" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "API server is already running (PID: $(cat $PID_FILE))"
      exit 0
    fi
    
    echo "Starting FetchCoder API server..."
    cd "$API_DIR"
    node api-server.js > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 1
    
    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "✓ API server started (PID: $(cat $PID_FILE))"
      echo "  Log: $LOG_FILE"
    else
      echo "✗ Failed to start API server"
      rm -f "$PID_FILE"
      exit 1
    fi
    ;;
    
  stop)
    if [ ! -f "$PID_FILE" ]; then
      echo "API server is not running"
      exit 0
    fi
    
    PID=$(cat "$PID_FILE")
    if kill -0 $PID 2>/dev/null; then
      echo "Stopping API server (PID: $PID)..."
      kill $PID
      rm -f "$PID_FILE"
      echo "✓ API server stopped"
    else
      echo "API server process not found"
      rm -f "$PID_FILE"
    fi
    ;;
    
  restart)
    $0 stop
    sleep 1
    $0 start
    ;;
    
  status)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "✓ API server is running (PID: $(cat $PID_FILE))"
      echo "  Listening on: http://127.0.0.1:3000"
      echo "  Log: $LOG_FILE"
    else
      echo "✗ API server is not running"
      [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    fi
    ;;
    
  logs)
    if [ -f "$LOG_FILE" ]; then
      tail -f "$LOG_FILE"
    else
      echo "No log file found"
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the API server"
    echo "  stop    - Stop the API server"
    echo "  restart - Restart the API server"
    echo "  status  - Check if server is running"
    echo "  logs    - Follow the log file"
    exit 1
    ;;
esac



