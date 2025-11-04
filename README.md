# FetchCoder for VS Code

> AI-powered coding assistant that brings FetchCoder directly into VS Code

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/fetchai/fetchcoder-vscode)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

FetchCoder for VS Code integrates the powerful [FetchCoder](https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview) AI coding agent into Visual Studio Code, providing a Cursor-like experience with chat, compose mode, and intelligent code actions.

> **⚠️ Important:** This extension requires a custom REST API server (included in the `api-server/` directory) because the standard `fetchcoder serve` command doesn't implement the necessary REST endpoints. See [Prerequisites](#-prerequisites) below for setup instructions.

## ✨ Features

### 💬 Interactive Chat Panel
- Real-time streaming responses
- Syntax-highlighted code blocks
- Markdown rendering
- Conversation history
- Multiple specialized agents

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

## 📋 Prerequisites

Before using this extension, you need:

1. **FetchCoder installed globally**:
   ```bash
   npm install -g @fetchai/fetchcoder
   ```

2. **FetchCoder REST API server running**:
   
   **Important**: The standard `fetchcoder serve` command does not provide the REST API endpoints needed by this extension. Instead, use our custom REST API server:
   
   ```bash
   # Copy the API server files to ~/.fetchcoder/
   cp -r api-server/* ~/.fetchcoder/
   
   # Start the REST API server
   ~/.fetchcoder/start-api-server.sh
   ```
   
   The server will start on `http://localhost:3000` by default.
   
   See [api-server/README.md](api-server/README.md) for detailed documentation.

3. **VS Code version 1.80.0 or higher**

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

### Opening Chat
- Use keyboard shortcut: `Ctrl+Shift+F C` (Mac: `Cmd+Shift+F C`)
- Or command palette: `FetchCoder: Open Chat`
- Or click the FetchCoder icon in the activity bar

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
**Solution**: Ensure the REST API server is running:
```bash
~/.fetchcoder/start-api-server.sh
```

To verify it's running:
```bash
curl http://localhost:3000/health
```

### Raw JSON responses in chat
If you see raw JSON like `{"response":"..."}` instead of formatted text, restart the API server:
```bash
~/.fetchcoder/stop-api-server.sh
~/.fetchcoder/start-api-server.sh
```

Then reload VSCode window: `Ctrl+Shift+P` → "Developer: Reload Window"

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
- **Use specific agents**: Switch to specialized agents for better results (Build for compilation issues, Plan for architecture questions)
- **Compose for big changes**: Use Compose Mode instead of Chat for multi-file modifications
- **Keyboard shortcuts**: Learn the shortcuts to speed up your workflow

## 🙏 Acknowledgments

Built with ❤️ using:
- [FetchCoder](https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview) by Fetch.ai
- [VS Code Extension API](https://code.visualstudio.com/api)

---

**Happy Coding with FetchCoder! 🤖✨**

