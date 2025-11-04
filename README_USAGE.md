# How to Use FetchCoder Extension

## ⚡ Super Quick Start

```bash
cd /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension
make start
```

Then open VS Code and press **`Ctrl+Shift+F C`** to chat!

---

## 📚 Complete Guide

### Step 1: Start the API Server

The API server **must be running** before using the extension.

**Easiest way:**
```bash
cd /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension
make start
```

**Alternative:**
```bash
./api-server/start-api-server.sh
```

**You should see:**
```
🚀 Starting FetchCoder API Server

✓ Server started successfully!

  PID:      180753
  URL:      http://127.0.0.1:3000
  Log:      ./api-server/api-server.log

Ready for VSCode extension connections!
```

### Step 2: Use the Extension

#### Option A: For Development (Testing Changes)

1. Open this project in Cursor or VS Code
2. Press **F5** (Start Debugging)
3. A new window opens: **Extension Development Host**
4. In that window, open any project folder
5. Press **`Ctrl+Shift+F C`** to open FetchCoder Chat

#### Option B: For Daily Use (Install in VS Code)

First, package and install:
```bash
cd /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension
make package
code --install-extension fetchcoder-vscode-*.vsix
```

Then use in any VS Code window:
- **`Ctrl+Shift+F C`** - Open chat
- **`Ctrl+Shift+F M`** - Open compose mode
- Right-click code → **FetchCoder actions**

### Step 3: Stop When Done

```bash
make stop
```

---

## 🎮 All Available Commands

```bash
make help      # Show all commands
make start     # Start API server
make stop      # Stop API server
make restart   # Restart API server
make status    # Check if running
make logs      # View live logs
make dev       # Full development setup
make package   # Build VSIX installer
make clean     # Remove build files
```

---

## 🔍 How It Works

```
┌─────────────────┐
│   VS Code       │
│   Extension     │
└────────┬────────┘
         │ HTTP
         │ (port 3000)
         ↓
┌─────────────────┐
│  API Server     │
│  (Node.js)      │
└────────┬────────┘
         │
         │ stdin/stdout
         ↓
┌─────────────────┐
│  FetchCoder     │
│  CLI Backend    │
└────────┬────────┘
         │
         │ API calls
         ↓
┌─────────────────┐
│  ASI1 AI Model  │
└─────────────────┘
```

**Components:**
1. **VS Code Extension** - UI and commands (this project)
2. **API Server** - Bridges extension and CLI (api-server.js)
3. **FetchCoder CLI** - AI backend (~/.fetchcoder/bin/fetchcoder)
4. **AI Model** - Processes requests (ASI1 API)

---

## 🛠️ Common Tasks

### Check if Server is Running

```bash
curl http://localhost:3000/health
```

**Expected:**
```json
{"status":"ok","timestamp":1762284563483,"version":"1.0.0"}
```

### View Logs

```bash
make logs
# Or
tail -f ./api-server/api-server.log
```

### Change Port (if 3000 is busy)

```bash
PORT=8080 make start
```

Then update VS Code settings:
- `Ctrl+,` → Search "fetchcoder"
- Set `fetchcoder.apiUrl` to `http://localhost:8080`

### Restart After Changes

**API Server changes:**
```bash
make restart
```

**Extension code changes:**
- If in debug mode (F5): Just reload the Extension Development Host window
- If installed: Re-package and reinstall

---

## 🐛 Troubleshooting

### "API request failed: Connection refused"

**Cause:** API server not running

**Fix:**
```bash
make start
```

### "Server already running but extension can't connect"

**Cause:** Old process hung

**Fix:**
```bash
make stop
make start
```

### "Files created in wrong directory"

**Cause:** Extension not reloaded after update

**Fix:**
- If debugging: Stop (Shift+F5) and restart (F5)
- If installed: Reload VS Code window (`Ctrl+Shift+P` → "Reload Window")

### "Request timed out after 60 seconds"

**Cause:** FetchCoder process hung or taking too long

**Fix:**
- Usually resolves itself
- If persistent: `make restart`
- Check logs: `make logs`

### Port 3000 already in use

**Fix:**
```bash
# Find what's using it
ss -tlnp | grep 3000

# Use different port
PORT=8080 make start
```

---

## 📝 Daily Usage Workflow

### Morning (Start work):
```bash
cd /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension
make start
```

### During work:
- Open VS Code
- Open your project
- Press `Ctrl+Shift+F C` to use FetchCoder
- Code, chat, create files!

### Evening (End work):
```bash
make stop
```

---

## 🔄 Development Workflow

### Making changes to extension:

```bash
# 1. Edit files in src/
vim src/api/fetchcoderClient.ts

# 2. Compile
npm run compile

# 3. Test
# - If debugging: Reload Extension Development Host
# - If installed: make package && reinstall
```

### Making changes to API server:

```bash
# 1. Edit api-server.js
vim api-server/api-server.js

# 2. Restart
make restart

# 3. Test extension
```

---

## 📦 Installation on Another Machine

```bash
# 1. Clone repository
git clone https://github.com/MarklarMarklar/FetchCode-VSCode-Extension.git
cd FetchCode-VSCode-Extension

# 2. Setup
make dev

# 3. Package
make package

# 4. Install in VS Code
code --install-extension fetchcoder-vscode-*.vsix

# 5. Start server
make start
```

---

## 🌟 Quick Reference

| What You Want | Command |
|---------------|---------|
| Start everything | `make start` |
| Stop everything | `make stop` |
| Check status | `make status` |
| View logs | `make logs` |
| Install extension | `make package` then install VSIX |
| Debug extension | Press F5 in Cursor/VS Code |
| Open chat | `Ctrl+Shift+F C` |
| Open compose | `Ctrl+Shift+F M` |

---

**Need more details?** See [STARTUP_GUIDE.md](./STARTUP_GUIDE.md) for comprehensive documentation.

**Having issues?** Check [Troubleshooting](#-troubleshooting) section above.

