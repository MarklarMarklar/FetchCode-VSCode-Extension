# FetchCoder REST API Server

This directory contains a REST API server that provides HTTP endpoints for the FetchCoder VSCode extension.

## Problem

The `fetchcoder serve` command creates a server but does not implement the REST API endpoints required by the VSCode extension (`/health`, `/api/chat`, `/api/command`).

## Solution

A custom Node.js REST API server (`api-server.js`) that:
1. Implements the required REST endpoints
2. Translates HTTP requests into `fetchcoder-backend run` commands
3. Returns responses in the format expected by the VSCode extension

## Usage

### Starting the Server

```bash
# Simple start
node ~/.fetchcoder/api-server.js

# Or use the startup script (recommended)
~/.fetchcoder/start-api-server.sh
```

The server will start on `http://127.0.0.1:3000` by default.

### Stopping the Server

```bash
~/.fetchcoder/stop-api-server.sh
```

### Custom Port/Host

```bash
PORT=8080 HOST=0.0.0.0 node ~/.fetchcoder/api-server.js
```

## API Endpoints

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1762275000223,
  "version": "1.0.0"
}
```

### POST /api/chat

Send a message to FetchCoder and get a response.

**Request:**
```json
{
  "message": "write a Python function to calculate fibonacci",
  "agent": "general",
  "context": [],
  "history": []
}
```

**Response:**
```json
{
  "response": "Here's a fibonacci function...",
  "agent": "general",
  "timestamp": 1762275364512
}
```

**Available Agents:**
- `general` (default) - General purpose coding
- `build` - Build and compilation issues
- `plan` - Architecture and planning
- `agentverse` - Fetch.ai agent development

### POST /api/command

Execute a FetchCoder command.

**Request:**
```json
{
  "command": "list-agents",
  "args": []
}
```

**Response:**
```json
{
  "success": true,
  "result": "Command executed"
}
```

## Testing

### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

### Test Chat Endpoint
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "say hello"}'
```

## VSCode Extension Integration

The VSCode extension automatically connects to `http://localhost:3000` by default.

1. Start the API server:
   ```bash
   ~/.fetchcoder/start-api-server.sh
   ```

2. Open VSCode and use the FetchCoder extension:
   - Press `Ctrl+Shift+F C` to open chat
   - Press `Ctrl+Shift+F M` for compose mode
   - Right-click code for quick actions

## Files

- `api-server.js` - Main REST API server
- `start-api-server.sh` - Startup script
- `stop-api-server.sh` - Stop script
- `api-server.pid` - Process ID file (created at runtime)
- `api-server.log` - Server logs

## Logs

View server logs:
```bash
tail -f ~/.fetchcoder/api-server.log
```

## Troubleshooting

### Server Won't Start
Check if port 3000 is already in use:
```bash
ss -tlnp | grep 3000
```

### Slow Responses
The first request after starting may take 5-10 seconds as FetchCoder initializes. Subsequent requests should be faster.

### API Key Errors
Ensure your API keys are set in `~/.fetchcoder/.env`:
```bash
cat ~/.fetchcoder/.env
```

Required key: `ASI1_API_KEY`

### Extension Can't Connect
1. Verify server is running:
   ```bash
   curl http://localhost:3000/health
   ```

2. Check VSCode settings:
   - Open Settings (`Ctrl+,`)
   - Search for "fetchcoder"
   - Verify `fetchcoder.apiUrl` is set to `http://localhost:3000`

3. Check server logs:
   ```bash
   tail -f ~/.fetchcoder/api-server.log
   ```

## Architecture

```
VSCode Extension
       ↓ HTTP
  REST API Server (api-server.js)
       ↓ stdin
  fetchcoder-backend run
       ↓
  AI Model (ASI1)
```

The REST API server:
1. Receives HTTP POST requests from the VSCode extension
2. Spawns `fetchcoder-backend run` process
3. Sends the message via stdin
4. Captures stdout and cleans ANSI codes
5. Returns JSON response to extension

## Performance

- **Cold start:** 5-10 seconds (first request)
- **Warm requests:** 3-5 seconds
- **Timeout:** 60 seconds per request

## Notes

- Each request spawns a new `fetchcoder-backend run` process
- Sessions are not persisted between requests
- The server handles one request at a time per spawned process
- Multiple concurrent requests are supported (spawns multiple processes)

## License

Part of the FetchCoder project.

