# Welcome to FetchCoder VS Code Extension Development

## What's in the folder

* `package.json` - Extension manifest defining commands, settings, and metadata
* `src/extension.ts` - Extension entry point where commands are registered
* `src/api/` - FetchCoder API client with streaming support
* `src/views/` - Webview panels for chat and compose mode
* `src/providers/` - Code action providers for inline suggestions
* `src/commands/` - Command implementations
* `src/utils/` - Utility functions for file operations
* `media/` - HTML, CSS, and JavaScript for webviews
* `test/` - Test suite

## Get up and running straight away

* Press `F5` to open a new window with your extension loaded
* Run your command from the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on Mac)
* Set breakpoints in your code inside `src/extension.ts` to debug
* Find output from your extension in the debug console

## Make changes

* You can relaunch the extension from the debug toolbar after changing code
* You can also reload (`Ctrl+R` or `Cmd+R` on Mac) the VS Code window to load changes

## Explore the API

* You can open the full set of our API at https://code.visualstudio.com/api

## Run tests

* Open the debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D` on Mac) and select `Extension Tests`
* Press `F5` to run the tests in a new window with your extension loaded
* See the output of the test result in the debug console
* Make changes to `test/extension.test.ts` or create new test files

## Go further

* [Follow UX guidelines](https://code.visualstudio.com/api/ux-guidelines/overview) to create extensions that seamlessly integrate with VS Code's native interface
* [Publish your extension](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) on the VS Code marketplace
* Automate builds by setting up [Continuous Integration](https://code.visualstudio.com/api/working-with-extensions/continuous-integration)

