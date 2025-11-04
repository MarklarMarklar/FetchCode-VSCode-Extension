# Contributing to FetchCoder VS Code Extension

Thank you for your interest in contributing! This document provides guidelines for contributing to the FetchCoder VS Code extension.

## Development Setup

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher
- VS Code 1.80.0 or higher
- FetchCoder installed globally (`npm install -g @fetchai/fetchcoder`)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/fetchai/fetchcoder-vscode.git
   cd fetchcoder-vscode
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile TypeScript**
   ```bash
   npm run compile
   ```

4. **Start FetchCoder server**
   ```bash
   fetchcoder serve
   ```

5. **Run the extension**
   - Press `F5` in VS Code to open a new Extension Development Host window
   - Or use "Run > Start Debugging" from the menu

### Project Structure

```
fetchcoder-vscode/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── config.ts              # Configuration management
│   ├── api/
│   │   └── fetchcoderClient.ts # API client
│   ├── views/
│   │   ├── chatPanel.ts       # Chat webview
│   │   ├── composePanel.ts    # Compose webview
│   │   ├── historyView.ts     # History tree view
│   │   └── statusBar.ts       # Status bar manager
│   ├── providers/
│   │   └── codeActionProvider.ts # Code actions
│   ├── commands/
│   │   ├── chat.ts            # Chat commands
│   │   ├── compose.ts         # Compose commands
│   │   └── agents.ts          # Agent commands
│   └── utils/
│       └── fileOperations.ts  # File utilities
├── media/                     # Webview assets (HTML/CSS/JS)
├── test/                      # Tests
└── package.json               # Extension manifest
```

## Development Workflow

### Making Changes

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes in the appropriate files

3. Compile TypeScript:
   ```bash
   npm run compile
   ```

4. Run linting:
   ```bash
   npm run lint
   ```

5. Test your changes:
   - Press `F5` to launch the extension in debug mode
   - Test the affected functionality

### Code Style

- Follow TypeScript best practices
- Use strict type checking
- Add comments for complex logic
- Keep functions small and focused
- Use descriptive variable names

### Commit Messages

Follow conventional commit format:
- `feat: Add new feature`
- `fix: Fix bug in feature`
- `docs: Update documentation`
- `style: Format code`
- `refactor: Refactor code`
- `test: Add tests`
- `chore: Update dependencies`

## Testing

### Running Tests

```bash
npm test
```

### Writing Tests

Add tests in the `test/` directory:

```typescript
test('Should do something', async () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = await someFunction(input);
    
    // Assert
    assert.strictEqual(result, expected);
});
```

## Building and Packaging

### Build for Distribution

```bash
# Compile TypeScript
npm run compile

# Package as VSIX
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file that can be installed in VS Code.

## Submitting Changes

1. **Ensure all tests pass**:
   ```bash
   npm test
   ```

2. **Ensure linting passes**:
   ```bash
   npm run lint
   ```

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: Add amazing feature"
   ```

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**:
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Submit for review

## Pull Request Guidelines

- **Title**: Use a clear, descriptive title
- **Description**: Explain what changes you made and why
- **Tests**: Include tests for new features
- **Documentation**: Update README.md if needed
- **Screenshots**: Add screenshots for UI changes
- **Breaking Changes**: Clearly document any breaking changes

## Code Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release!

## Need Help?

- Check existing [issues](https://github.com/fetchai/fetchcoder-vscode/issues)
- Join our [Discord community](https://discord.gg/fetchai)
- Read the [FetchCoder documentation](https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🎉

