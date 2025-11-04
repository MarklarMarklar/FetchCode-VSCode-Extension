# Changelog

All notable changes to the FetchCoder VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-04

### Added

#### Core Features
- **Interactive Chat Panel**: Real-time AI coding assistant with streaming responses
- **Compose Mode**: Multi-file editing with visual diff view for proposed changes
- **Inline Code Actions**: Quick fixes, refactoring, and explanations via right-click menu
- **Multiple AI Agents**: General, Build, Plan, and Agentverse specialized agents

#### Chat Features
- Markdown rendering with syntax-highlighted code blocks
- Conversation history management
- Agent switching within chat interface
- Context-aware responses (automatically includes open files)
- Streaming responses for real-time feedback

#### Compose Features
- Multi-file change proposals with visual diffs
- Accept/reject individual changes or all at once
- Automatic file creation and modification
- Integration with VS Code's diff viewer

#### Code Actions
- "Ask FetchCoder" on any code selection
- "Explain with FetchCoder" for code explanations
- "Refactor with FetchCoder" for code improvements
- "Fix with FetchCoder" for error resolution with diagnostic context

#### UI Components
- Status bar indicator showing connection status and current agent
- Sidebar view for chat history
- Custom activity bar icon
- Context menu integration

#### Commands
- `fetchcoder.openChat` - Open chat panel
- `fetchcoder.openCompose` - Open compose mode
- `fetchcoder.sendSelection` - Send selected code to chat
- `fetchcoder.explain` - Explain selected code
- `fetchcoder.refactor` - Refactor selected code
- `fetchcoder.fix` - Fix code errors
- `fetchcoder.switchAgent` - Switch between AI agents
- `fetchcoder.clearHistory` - Clear chat history
- `fetchcoder.checkConnection` - Check API server connection

#### Keyboard Shortcuts
- `Ctrl+Shift+F C` - Open Chat
- `Ctrl+Shift+F M` - Open Compose Mode
- `Ctrl+Shift+F S` - Send Selection to Chat
- `Ctrl+Shift+F E` - Explain Code
- `Ctrl+Shift+F R` - Refactor Code
- `Ctrl+Shift+F F` - Fix Code
- `Ctrl+Shift+F A` - Switch Agent

#### Configuration Options
- `fetchcoder.apiUrl` - FetchCoder API server URL
- `fetchcoder.defaultAgent` - Default agent selection
- `fetchcoder.autoContextFiles` - Number of context files to include
- `fetchcoder.enableInlineActions` - Enable/disable inline code actions
- `fetchcoder.streamResponses` - Enable/disable streaming responses

#### Developer Features
- Comprehensive test suite
- ESLint configuration for code quality
- TypeScript strict mode enabled
- Source maps for debugging
- VS Code debugging configurations

### Technical Details
- Built with TypeScript 5.1+
- Uses VS Code Extension API 1.80+
- Streaming support via Server-Sent Events
- Real-time markdown rendering
- Async/await architecture throughout

### Documentation
- Comprehensive README with examples
- Troubleshooting guide
- Configuration documentation
- Contributing guidelines
- MIT License

## [Unreleased]

### Planned Features
- Session persistence across VS Code restarts
- Export chat conversations
- Custom prompt templates
- Multi-workspace support
- Inline diff editing
- AI-powered code completion
- Integration with VS Code's terminal
- Custom keybinding configuration UI

### Known Issues
- Large file operations may be slow
- Streaming may not work with all FetchCoder server versions
- Diff view for new files shows empty original

---

[0.1.0]: https://github.com/fetchai/fetchcoder-vscode/releases/tag/v0.1.0

