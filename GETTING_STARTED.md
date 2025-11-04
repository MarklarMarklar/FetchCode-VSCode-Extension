# Getting Started with FetchCoder for VS Code

This guide will help you get started with the FetchCoder VS Code extension.

## Prerequisites

Before using the extension, ensure you have:

1. **VS Code 1.80.0 or higher** installed
2. **Node.js** installed (for FetchCoder)
3. **FetchCoder** installed globally

### Installing FetchCoder

```bash
npm install -g @fetchai/fetchcoder
```

## Starting FetchCoder API Server

The extension requires the FetchCoder API server to be running:

```bash
fetchcoder serve
```

By default, this starts the server on `http://localhost:3000`.

**Keep this terminal running while using the extension!**

### Using a Different Port

If port 3000 is already in use:

```bash
fetchcoder serve --port 8080
```

Then configure the extension:
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "fetchcoder"
3. Set "Fetchcoder: Api Url" to `http://localhost:8080`

## Installing the Extension

### From VSIX File

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X`)
4. Click the `...` menu at the top
5. Select "Install from VSIX..."
6. Choose the downloaded `.vsix` file
7. Reload VS Code when prompted

## First Steps

### 1. Check Connection

After installation:

1. Look at the status bar (bottom right)
2. You should see "✓ 🤖 FetchCoder: General"
3. If you see "✗" instead, the server isn't running

**Tip**: Run the command "FetchCoder: Check API Connection" to verify

### 2. Open Chat

Press `Ctrl+Shift+F C` (or `Cmd+Shift+F C` on Mac)

A chat panel will open on the side. Try asking:
- "How do I create a REST API in Express?"
- "Explain closures in JavaScript"
- "Write a function to sort an array"

### 3. Try Code Actions

1. Open any code file
2. Select a function or code block
3. Right-click on the selection
4. Look for FetchCoder options:
   - **Ask FetchCoder** - Ask a question about the code
   - **Explain with FetchCoder** - Get an explanation
   - **Refactor with FetchCoder** - Improve the code
   - **Fix with FetchCoder** - Fix errors

### 4. Use Compose Mode

For larger changes across multiple files:

1. Press `Ctrl+Shift+F M` (or `Cmd+Shift+F M` on Mac)
2. Describe what you want to change, e.g.:
   - "Add error handling to all API endpoints"
   - "Extract the authentication logic into auth.ts"
   - "Add TypeScript types to all functions"
3. Review the proposed changes
4. Accept or reject individual changes

## Key Features

### Chat Interface

**What it does**: Interactive AI assistant for coding questions

**How to use**:
- Press `Ctrl+Shift+F C` to open
- Type your question
- Get real-time streaming responses
- Code blocks are syntax highlighted

**Tips**:
- Include code in your questions for better context
- The extension automatically includes your open files
- Use specific questions for better answers

### Compose Mode

**What it does**: Multi-file editing with AI assistance

**How to use**:
- Press `Ctrl+Shift+F M` to open
- Describe the changes you want
- Review proposed changes in diff view
- Accept/reject changes individually or all at once

**Best for**:
- Refactoring across multiple files
- Adding features that touch several files
- Large-scale code changes

### Inline Actions

**What it does**: Quick AI actions from right-click menu

**How to use**:
1. Select code
2. Right-click
3. Choose a FetchCoder action

**Actions available**:
- **Ask** - Ask anything about the code
- **Explain** - Get a detailed explanation
- **Refactor** - Improve code quality
- **Fix** - Fix errors (also appears on red squiggles)

### Agent Switching

**What it does**: Use specialized AI agents for different tasks

**Agents available**:
- **General** - All-purpose coding assistant (default)
- **Build** - Compilation and dependency issues
- **Plan** - Architecture and design decisions
- **Agentverse** - Fetch.ai agent development

**How to switch**:
- Click the status bar item (bottom right)
- Or press `Ctrl+Shift+F A`
- Select the agent you want

## Keyboard Shortcuts

| Windows/Linux | Mac | Action |
|--------------|-----|--------|
| `Ctrl+Shift+F C` | `Cmd+Shift+F C` | Open Chat |
| `Ctrl+Shift+F M` | `Cmd+Shift+F M` | Open Compose |
| `Ctrl+Shift+F S` | `Cmd+Shift+F S` | Send Selection to Chat |
| `Ctrl+Shift+F E` | `Cmd+Shift+F E` | Explain Code |
| `Ctrl+Shift+F R` | `Cmd+Shift+F R` | Refactor Code |
| `Ctrl+Shift+F F` | `Cmd+Shift+F F` | Fix Code |
| `Ctrl+Shift+F A` | `Cmd+Shift+F A` | Switch Agent |

## Common Workflows

### Workflow 1: Understanding Code

1. Open a file with unfamiliar code
2. Select a function or class
3. Press `Ctrl+Shift+F E` (Explain)
4. Read the explanation in the chat panel

### Workflow 2: Fixing Errors

1. Notice red squiggles (errors) in your code
2. Click the lightbulb icon
3. Select "Fix with FetchCoder"
4. Review the suggested fix
5. Apply if it looks good

### Workflow 3: Refactoring

1. Select code that needs improvement
2. Press `Ctrl+Shift+F R` (Refactor)
3. Review proposed changes in Compose mode
4. Accept the changes you want
5. The files are updated automatically

### Workflow 4: Building Features

1. Open Compose mode (`Ctrl+Shift+F M`)
2. Type: "Add user authentication with JWT"
3. Wait for AI to generate the code
4. Review each file change
5. Accept the changes
6. Test the new feature

## Tips for Best Results

### Be Specific

❌ "Make this better"
✅ "Refactor this to use async/await instead of callbacks"

### Provide Context

Include relevant information:
- What language you're using
- What you're trying to achieve
- What errors you're seeing

### Use the Right Agent

- **General**: Most questions
- **Build**: Compilation errors, dependencies
- **Plan**: "How should I structure this?"
- **Agentverse**: Fetch.ai specific code

### Review AI Suggestions

Always review AI-generated code:
- Check for security issues
- Verify it matches your requirements
- Test thoroughly before committing

## Troubleshooting

### "Unable to connect to FetchCoder API"

**Problem**: Extension can't reach the API server

**Solution**:
1. Make sure FetchCoder server is running:
   ```bash
   fetchcoder serve
   ```
2. Check the status bar for connection status
3. Run "FetchCoder: Check API Connection"

### No Response from AI

**Problem**: Messages sent but no response

**Possible causes**:
- Server is overwhelmed
- Network issues
- API key problems (if using custom keys)

**Solution**:
1. Check server terminal for errors
2. Restart FetchCoder server
3. Try a simpler question first

### Extension Not Working

**Problem**: Extension doesn't activate

**Solution**:
1. Check VS Code version (must be 1.80.0+)
2. Reload window: `Ctrl+Shift+P` → "Developer: Reload Window"
3. Check extension logs: `Ctrl+Shift+P` → "Developer: Show Logs"

## Getting Help

- **Documentation**: [FetchCoder Docs](https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview)
- **Issues**: [GitHub Issues](https://github.com/fetchai/fetchcoder-vscode/issues)
- **Community**: [Discord](https://discord.gg/fetchai)

## Next Steps

Now that you're set up:

1. Try all the keyboard shortcuts
2. Experiment with different agents
3. Use Compose mode for a real refactoring
4. Read the [README](README.md) for more details

Happy coding with FetchCoder! 🤖✨

