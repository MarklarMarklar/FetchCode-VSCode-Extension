# FetchCoder Extension - Quick Start

## 🚀 Start Everything in One Command

```bash
cd /home/marklar/fetch-VSC-extension/FetchCode-VSCode-Extension
make start
```

## 📋 Quick Commands

```bash
# Start API server
make start

# Stop API server
make stop

# Restart API server
make restart

# Check server status
make status

# View live logs
make logs

# Setup everything for development
make dev

# Package extension for installation
make package
```

## 🎯 Most Common Workflow

### For Daily Use:

```bash
# 1. Start the server
make start

# 2. Open VS Code and use the extension
#    - Ctrl+Shift+F C for chat
#    - Ctrl+Shift+F M for compose mode

# 3. Stop when done
make stop
```

### For Development:

```bash
# 1. Setup and start server
make dev

# 2. In Cursor/VS Code:
#    - Press F5 to launch Extension Development Host
#    - Make changes and reload (Ctrl+R in Extension Host)

# 3. View logs if needed
make logs
```

## 🔧 Manual Commands (if you prefer)

### Start Server:
```bash
./api-server/start-api-server.sh
```

### Stop Server:
```bash
./api-server/stop-api-server.sh
```

### Check Status:
```bash
curl http://localhost:3000/health
```

## 📝 Notes

- **Server must be running** for the extension to work
- **Default port**: 3000 (change with `PORT=8080 make start`)
- **Logs location**: `./api-server/api-server.log`
- **API endpoint**: `http://localhost:3000`

## 🆘 Troubleshooting

### Server won't start (port in use):
```bash
make stop
# Wait 2 seconds
make start
```

### Extension not connecting:
1. Check server is running: `make status`
2. Reload VS Code window: Ctrl+Shift+P → "Reload Window"
3. Check VS Code setting: `fetchcoder.apiUrl` = `http://localhost:3000`

### View errors:
```bash
make logs
# Or
tail -50 ./api-server/api-server.log
```

---

**Full documentation**: See [STARTUP_GUIDE.md](./STARTUP_GUIDE.md)

