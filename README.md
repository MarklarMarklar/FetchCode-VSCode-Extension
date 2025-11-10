# FetchCoder for VS Code

> AI-powered coding assistant that brings FetchCoder directly into VS Code

[![Version](https://img.shields.io/badge/version-0.3.2-blue.svg)](https://github.com/fetchai/fetchcoder-vscode)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

FetchCoder for VS Code integrates the powerful [FetchCoder](https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview) AI coding agent into Visual Studio Code, providing a Cursor-like experience with chat, compose mode, and intelligent code actions.

> **⚠️ Important:** This extension requires a custom REST API server (included in the `api-server/` directory) because the standard `fetchcoder serve` command doesn't implement the necessary REST endpoints. See [Prerequisites](#-prerequisites) below for setup instructions.

## ✨ Features

### 💬 Interactive Chat Panel
- Real-time streaming responses with progress indicators
- Syntax-highlighted code blocks
- Markdown rendering
- Conversation history and context awareness
- Multiple specialized agents
- Workspace-aware: automatically works in your project directory
- Live progress updates showing tool calls and file operations
- **File/Folder Attachments**: Add context by attaching files or folders using multiple methods:
  - **Chat Interface**: Click the 📄 or 📁 buttons in the chat panel
  - **Context Menu**: Right-click files/folders in Explorer → "FetchCoder: Add to Chat Context"
  - **Drag & Drop**: Drag files/folders from Explorer into the chat panel (**hold Shift** to prevent opening in editor)

### 🎨 Compose Mode
- Multi-file editing with AI assistance
- Visual diff view for proposed changes
- Accept/reject individual changes
- Atomic multi-file operations

### 🔧 Inline Code Actions
- Quick fixes with AI suggestions
- Code explanation on selection
- Smart refactoring suggestions
- Error fixing with diagnostics context

### 🤖 Multiple AI Agents
- **General**: Multi-step tasks and research
- **Build**: Compilation and dependency management
- **Plan**: Architecture design and planning
- **Agentverse**: Production-ready Fetch.ai agents

### 📊 Automatic Diff Viewer
- **Automatic change tracking**: Snapshots workspace before FetchCoder runs
- **Visual change list**: See all files created, modified, or deleted
- **Native diff viewing**: Click any change to view side-by-side diff
- **Real-time updates**: Changes appear automatically after each operation
- **Change history**: Review all modifications made during your session

## 📋 Prerequisites

Before using this extension, you need:

1. **FetchCoder CLI installed globally**:
   ```bash
   npm install -g @fetchai/fetchcoder
   ```

2. **VS Code version 1.80.0 or higher**

3. **API Server Setup** (Automated):
   
   The extension will automatically set up and start the API server on first launch! Just click "Setup Now" when prompted.
   
   **Manual setup** (if needed):
   - Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
   - Run: `FetchCoder: Setup API Server`
   - The extension will automatically copy files and start the server
   
   **Note**: The standard `fetchcoder serve` command doesn't provide the REST endpoints we need, so this extension includes a custom API server that wraps the FetchCoder CLI.

## 🚀 Installation

### From VSIX (Manual)
1. Download the `.vsix` file from releases
2. Open VS Code
3. Go to Extensions (`Ctrl+Shift+X`)
4. Click the `...` menu → "Install from VSIX..."
5. Select the downloaded `.vsix` file

### From Source
```bash
# Clone the repository
git clone https://github.com/fetchai/fetchcoder-vscode.git
cd fetchcoder-vscode

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm install -g @vscode/vsce
vsce package

# Install the generated .vsix file in VS Code
```

## 🎯 Usage

### First Time Setup
On first launch, the extension will prompt you to set up the API server:
1. Click **"Setup Now"** when prompted
2. The extension automatically installs and starts the API server
3. You'll see a confirmation: "✅ FetchCoder API server is ready!"
4. Start coding with AI assistance!

### API Server Management
Control the API server from the Command Palette:
- `FetchCoder: Setup API Server` - Install and configure the server
- `FetchCoder: Start API Server` - Start the server
- `FetchCoder: Stop API Server` - Stop the server
- `FetchCoder: Check API Server Status` - View server status

The server runs at `http://localhost:3000` and starts automatically when you open VS Code.

### Opening Chat
- Use keyboard shortcut: `Ctrl+Shift+F C` (Mac: `Cmd+Shift+F C`)
- Or command palette: `FetchCoder: Open Chat`
- Or click the FetchCoder icon in the activity bar

### Attaching Files/Folders to Chat
Add files or folders as context for more accurate AI responses. You can attach in three ways:

**1. From Chat Interface:**
- Click the 📄 button to attach files
- Click the 📁 button to attach folders
- Attached items appear in the "📎 Attached Context" section

**2. From Context Menu:**
- Right-click any file in the Explorer
- Select "FetchCoder: Add to Chat Context"
- Or right-click a folder and select the same option

**3. Drag and Drop:**
- Drag files/folders from the Explorer
- Drop them into the chat panel
- **Important**: Hold **Shift** while dropping to prevent opening the file in the editor
- Files appear instantly in the attachments section

Attached files/folders are automatically included when you send messages, giving FetchCoder direct access to read and reference them.

### Using Compose Mode
1. Press `Ctrl+Shift+F M` (Mac: `Cmd+Shift+F M`)
2. Describe the changes you want to make
3. Review proposed changes with diff view
4. Accept or reject individual changes

### Inline Code Actions
1. Select code in the editor
2. Right-click → FetchCoder options
3. Or use quick actions (lightbulb icon)
4. Choose: Ask, Explain, Refactor, or Fix

### Viewing Changes with Diff Viewer
1. After FetchCoder makes changes, a notification appears
2. Click "View Changes" or use command palette: `FetchCoder: Open Diff Viewer`
3. See list of all modified, created, and deleted files
4. Click "View" on any file to see side-by-side diff
5. Changes are tracked automatically for every operation

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+F C` | Open Chat |
| `Ctrl+Shift+F M` | Open Compose Mode |
| `Ctrl+Shift+F S` | Send Selection to Chat |
| `Ctrl+Shift+F E` | Explain Code |
| `Ctrl+Shift+F R` | Refactor Code |
| `Ctrl+Shift+F F` | Fix Code |
| `Ctrl+Shift+F A` | Switch Agent |

*Replace `Ctrl` with `Cmd` on macOS*

## ⚙️ Configuration

Configure the extension in VS Code settings (`Ctrl+,`):

```json
{
  // FetchCoder API server URL
  "fetchcoder.apiUrl": "http://localhost:3000",
  
  // Default agent to use
  "fetchcoder.defaultAgent": "general",
  
  // Number of relevant files to include in context
  "fetchcoder.autoContextFiles": 5,
  
  // Enable inline code actions
  "fetchcoder.enableInlineActions": true,
  
  // Enable streaming responses
  "fetchcoder.streamResponses": true
}
```

## 🔑 API Keys

FetchCoder comes with default test API keys. For production use, set your own:

### ASI1 API Key (Required)
1. Visit [https://asi1.ai](https://asi1.ai)
2. Sign up and generate your API key
3. Set the key in FetchCoder:
   ```bash
   echo 'ASI1_API_KEY=your-key-here' >> ~/.fetchcoder/.env
   ```

### Agentverse API Key (Optional)
1. Visit [https://agentverse.ai/settings/api-keys](https://agentverse.ai/settings/api-keys)
2. Generate your API key
3. Set the key:
   ```bash
   echo 'AGENTVERSE_API_KEY=your-key-here' >> ~/.fetchcoder/.env
   ```

## 🐛 Troubleshooting

### "Unable to connect to FetchCoder API"
**Solution**: The API server may not be running. Try:
1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: `FetchCoder: Check API Server Status`
3. If not running, click "Start Server" or run `FetchCoder: Start API Server`

**Manual verification**:
```bash
curl http://localhost:3000/health
```

### API Server Won't Start
1. Check if FetchCoder CLI is installed:
   ```bash
   ls ~/.fetchcoder/bin/fetchcoder
   ```
2. If not found, install FetchCoder:
   ```bash
   npm install -g @fetchai/fetchcoder
   ```
3. Re-run: `FetchCoder: Setup API Server`

### Server Already Running on Port 3000
If port 3000 is in use, stop any existing server:
```bash
# Check what's using port 3000
lsof -i :3000
# Or use the extension command
```
Run: `FetchCoder: Stop API Server`

### Raw JSON responses in chat
If you see raw JSON like `{"response":"..."}`:
1. Run: `FetchCoder: Stop API Server`
2. Run: `FetchCoder: Start API Server`
3. Reload VSCode: `Ctrl+Shift+P` → "Developer: Reload Window"

### Connection on different port
If running the API server on a different port:
```bash
PORT=8080 ~/.fetchcoder/start-api-server.sh
```
Then update VS Code settings:
```json
{
  "fetchcoder.apiUrl": "http://localhost:8080"
}
```

### Extension not activating
1. Check VS Code version (must be 1.80.0+)
2. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"
3. Check extension logs: `Ctrl+Shift+P` → "Developer: Show Logs" → "Extension Host"

## 📖 Examples

### Example 1: Code Explanation
1. Select a function in your code
2. Press `Ctrl+Shift+F E`
3. Get a detailed explanation in the chat panel

### Example 2: Multi-File Refactoring
1. Open Compose Mode (`Ctrl+Shift+F M`)
2. Type: "Extract authentication logic into a separate auth.ts file"
3. Review the proposed changes
4. Accept all or individual changes

### Example 3: Bug Fixing
1. Select code with errors (red squiggles)
2. Click the lightbulb icon
3. Select "Fix with FetchCoder"
4. Get AI-powered fix suggestions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [FetchCoder Documentation](https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview)
- [Fetch.ai](https://fetch.ai)
- [Innovation Lab](https://innovationlab.fetch.ai)
- [Issue Tracker](https://github.com/fetchai/fetchcoder-vscode/issues)

## 💡 Tips

- **Context is key**: The extension automatically includes relevant open files in your requests
- **Attach files for precision**: Use drag-and-drop (hold Shift), context menu, or chat buttons to attach specific files/folders for more accurate responses
- **Workspace awareness**: FetchCoder automatically works in your current workspace folder - files are created/modified in the right location
- **Conversational context**: The chat remembers your conversation history, so you can ask follow-up questions naturally
- **Track changes**: Check the Diff Viewer to see exactly what FetchCoder modified in your project
- **Use specific agents**: Switch to specialized agents for better results (Build for compilation issues, Plan for architecture questions)
- **Compose for big changes**: Use Compose Mode instead of Chat for multi-file modifications
- **Keyboard shortcuts**: Learn the shortcuts to speed up your workflow
- **Progress indicators**: Watch the live progress updates to see what FetchCoder is doing in real-time

## 🙏 Acknowledgments

Built with ❤️ using:
- [FetchCoder](https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview) by Fetch.ai
- [VS Code Extension API](https://code.visualstudio.com/api)

---

**Happy Coding with FetchCoder! 🤖✨**

