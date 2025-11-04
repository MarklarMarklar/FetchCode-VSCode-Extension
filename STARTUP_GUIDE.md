# FetchCoder VS Code Extension - Startup Guide

This guide explains how to start everything needed for the FetchCoder extension to work.

## Prerequisites

✅ **FetchCoder CLI** - Already installed at `~/.fetchcoder/bin/fetchcoder`  
✅ **Node.js** - Required to run the API server  
✅ **VS Code** - To use the extension

---

## Quick Start (Recommended)

### 1. Start the API Server

The API server must be running for the extension to work.

```bash
# From the project directory
cd /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension
./api-server/start-api-server.sh
```

**Output:**
```
🚀 Starting FetchCoder API Server

✓ Server started successfully!

  PID:      12345
  URL:      http://127.0.0.1:3000
  Log:      /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension/api-server/api-server.log

Endpoints:
  GET  /health      - Health check
  POST /api/chat    - Chat with FetchCoder
  POST /api/command - Execute commands

Ready for VSCode extension connections!
```

### 2. Install the Extension in VS Code

#### Option A: Debug Mode (Development)

1. Open this project in VS Code/Cursor
2. Press **F5** to launch Extension Development Host
3. A new VS Code window will open with the extension loaded

#### Option B: Install as VSIX (Production Use)

```bash
# Package the extension
cd /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension
npm run package

# Install in VS Code
code --install-extension fetchcoder-vscode-*.vsix
```

### 3. Use the Extension

Open any folder in VS Code and:
- Press `Ctrl+Shift+F C` - Open FetchCoder Chat
- Press `Ctrl+Shift+F M` - Open Compose Mode
- Right-click on code - Select "FetchCoder: Explain Code"

---

## Managing the API Server

### Check if Server is Running

```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{"status":"ok","timestamp":1762284563483,"version":"1.0.0"}
```

### View Server Logs

```bash
tail -f /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension/api-server/api-server.log
```

### Stop the Server

```bash
./api-server/stop-api-server.sh
```

Or manually:
```bash
pkill -f "node.*api-server"
```

---

## Troubleshooting

### Server Won't Start

**Check if port 3000 is already in use:**
```bash
ss -tlnp | grep 3000
```

**Kill existing process:**
```bash
pkill -f "node.*api-server"
```

**Check logs:**
```bash
cat /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension/api-server/api-server.log
```

### Extension Not Connecting

1. **Verify server is running:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Check extension settings in VS Code:**
   - Open Settings (`Ctrl+,`)
   - Search for "fetchcoder"
   - Verify `fetchcoder.apiUrl` is set to `http://localhost:3000`

3. **Reload VS Code:**
   - Press `Ctrl+Shift+P`
   - Type "Reload Window"
   - Select "Developer: Reload Window"

### Files Created in Wrong Location

**Make sure you:**
1. Have a folder/workspace open in VS Code
2. Reloaded the extension after updates
3. Check the API server logs show the correct workspace path

---

## Starting on System Boot (Optional)

### Create a systemd service (Linux)

Create `/etc/systemd/system/fetchcoder-api.service`:

```ini
[Unit]
Description=FetchCoder API Server
After=network.target

[Service]
Type=simple
User=marklar
WorkingDirectory=/home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension/api-server
ExecStart=/usr/bin/node /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension/api-server/api-server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:/home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension/api-server/api-server.log
StandardError=append:/home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension/api-server/api-server.log

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable fetchcoder-api
sudo systemctl start fetchcoder-api
sudo systemctl status fetchcoder-api
```

---

## Configuration

### Change API Server Port

Set environment variable before starting:
```bash
PORT=8080 ./api-server/start-api-server.sh
```

Then update VS Code settings:
- `fetchcoder.apiUrl` → `http://localhost:8080`

### API Keys

API keys are loaded from `~/.fetchcoder/.env`:

```bash
cat ~/.fetchcoder/.env
```

Should contain:
```
ASI1_API_KEY=your_key_here
AGENTVERSE_API_KEY=your_key_here
```

---

## Development Workflow

### Making Changes to the Extension

1. Edit TypeScript files in `src/`
2. Compile: `npm run compile`
3. Press `F5` to test in Extension Development Host
4. Reload the host window to see changes

### Making Changes to the API Server

1. Edit `api-server/api-server.js`
2. Restart the server:
   ```bash
   ./api-server/stop-api-server.sh
   ./api-server/start-api-server.sh
   ```

---

## Summary: Complete Startup Sequence

```bash
# 1. Start API Server
cd /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension
./api-server/start-api-server.sh

# 2. Launch VS Code with Extension (choose one):

# Option A: Debug Mode
# - Open project in Cursor/VS Code
# - Press F5

# Option B: Production Use
# - Install VSIX in VS Code
# - Open any project folder
# - Use Ctrl+Shift+F C to open chat

# 3. Verify Everything Works
curl http://localhost:3000/health
```

That's it! The extension should now be fully functional. 🚀

