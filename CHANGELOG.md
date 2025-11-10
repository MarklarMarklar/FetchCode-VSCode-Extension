# Changelog

All notable changes to the FetchCoder VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.3] - 2025-11-10

### Added
- **⚙️ Settings Panel**: New built-in settings UI accessible via gear icon (⚙️) in chat header
  - Configure ASI1 and Agentverse API keys directly in VS Code
  - Set API server URL
  - Configure default agent and auto-context files
  - Toggle features (streaming responses, inline actions)
  - Test connection button to verify API server connectivity
- **API Key Configuration**: Support for setting API keys via VS Code settings
  - Keys are properly passed to FetchCoder CLI as environment variables (`ASI1_API_KEY`, `AGENTVERSE_API_KEY`)
  - Follows FetchCoder's configuration priority (env vars → user config → VS Code settings → defaults)
  - Enables full agent network capabilities and Fetch.ai decentralized network access

### Changed
- **Renamed API Key**: Changed from `fetchaiApiKey` to `asi1ApiKey` to match FetchCoder's documentation
- **API Server Enhancement**: Now properly extracts API keys from HTTP headers and passes them as environment variables to CLI
- **Clear Chat Button**: Removed confirmation dialog - now clears instantly with a single click

### Fixed
- API keys are now correctly passed to FetchCoder CLI processes via environment variables
- API server properly propagates API keys from extension to CLI for each request

### Technical Details
- Added `settingsPanel.ts` for settings UI management
- Created `settings.css` and `settings.js` for settings panel styling and interaction
- Updated API server to read headers and inject environment variables
- Enhanced `FetchCoderClient` to send proper API key headers

## [0.2.0] - 2025-11-10

### Changed - SIMPLIFIED APPROACH! 🎉
- **Much Simpler File Attachment**: Now just adds file/folder paths to your message (like Cursor does)
- **No more complex API server changes** - FetchCoder uses its own tools to read files
- **More reliable** - No need to read/send file contents, manage API server installations
- **Works immediately** - Just attach files and they're added as paths to your message

### How it works now
- Attach files/folders using UI or context menu
- Your message automatically gets the paths appended
- FetchCoder sees: "your question\n\n---\nContext files:\n- file1.py\n- folder/"
- FetchCoder uses its built-in read tools to access the files
- Simple, reliable, just like Cursor!

### Removed
- Complex file content reading and sending
- API server prompt modifications
- File context handling complexity

## [0.1.8] - 2025-11-10

### Fixed
- **Removed Strict CLI Check**: Extension no longer blocks activation if FetchCoder CLI detection fails in VS Code environment
- API server now uses `fetchcoder` command from PATH instead of hardcoded `~/.fetchcoder/bin/fetchcoder`
- Fixed "FetchCoder CLI is not installed" error when CLI is installed via npm/nvm (VS Code doesn't inherit shell PATH)
- **Improved File Context Recognition**: FetchCoder now clearly understands when files are attached

### Changed
- `isFetchCoderCliInstalled()` now checks PATH first, then falls back to ~/.fetchcoder/bin location
- API server `FETCHCODER_BIN` is now flexible and respects the system PATH
- **Enhanced prompt formatting** for attached files - clearly labels them as "ATTACHED FILES" with explicit instructions
- When user says "this file" or "these files", AI now knows they mean the attached files
- Added visual separators and file numbering for better file context recognition

## [0.1.7] - 2025-11-10

### Fixed
- **Critical: API Server Now Reads Attached Files**: Fixed the API server to actually include attached file contents when sending to FetchCoder CLI
- The API server was receiving context files but ignoring them - now they're properly included in the prompt
- Added logging to track when files are received and included in the API request

### Added
- Detailed API request logging to help debug context issues
- Shows file paths, content sizes, and previews in console logs

## [0.1.6] - 2025-11-10

### Fixed
- **Folder Attachment Bug**: Fixed issue where attached folders weren't being read correctly
- Improved path handling to convert absolute paths to relative paths
- Added special handling for workspace root folder attachments
- Added detailed logging for debugging attachment issues

### Changed
- Enhanced file filtering logic for folder attachments
- Better error messages and warnings for file reading issues

## [0.1.5] - 2025-11-10

### Added

#### File & Folder Attachment System
- **Attach Files to Chat**: Add individual files to chat context via UI buttons or context menu
- **Attach Folders to Chat**: Add entire folders to chat context for comprehensive code understanding
- **Visual Attachment Management**: See all attached files and folders in a dedicated UI section
- **Explorer Context Menu Integration**: Right-click any file or folder in VS Code Explorer to add to chat
- **Persistent Attachments**: Attachments remain throughout the chat session
- **Easy Removal**: Remove individual attachments with a single click

#### New Commands
- `fetchcoder.addFileToChat` - Add file from Explorer to chat context
- `fetchcoder.addFolderToChat` - Add folder from Explorer to chat context

#### UI Improvements
- Attachments panel showing all attached files and folders
- Attachment buttons in chat input area for quick access
- File and folder icons for better visual distinction
- Collapsible attachment section that auto-hides when empty

### Changed
- Enhanced context system to automatically include attached files and folders in API requests
- Improved file reading to handle both individual files and folder contents

### Benefits
- No more need to mention full file paths in chat messages
- Can reference files using relative paths or just filenames
- Better code understanding with folder-level context
- More natural conversation with the AI assistant

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

