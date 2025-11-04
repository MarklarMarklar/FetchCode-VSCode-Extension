import * as vscode from 'vscode';
import { FetchCoderConfig } from './config';
import { ChatPanel } from './views/chatPanel';
import { ComposePanel } from './views/composePanel';
import { HistoryViewProvider } from './views/historyView';
import { StatusBarManager } from './views/statusBar';
import { FetchCoderCodeActionProvider } from './providers/codeActionProvider';
import { registerChatCommands } from './commands/chat';
import { registerComposeCommands } from './commands/compose';
import { registerAgentCommands } from './commands/agents';

let statusBarManager: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('FetchCoder extension is now active!');

    // Initialize configuration
    FetchCoderConfig.initialize();

    // Initialize status bar
    statusBarManager = new StatusBarManager();
    context.subscriptions.push(statusBarManager);

    // Register history view provider
    const historyViewProvider = new HistoryViewProvider();
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('fetchcoderHistory', historyViewProvider)
    );

    // Register code action provider
    if (FetchCoderConfig.get('enableInlineActions')) {
        const codeActionProvider = new FetchCoderCodeActionProvider();
        context.subscriptions.push(
            vscode.languages.registerCodeActionsProvider(
                { scheme: 'file', language: '*' },
                codeActionProvider,
                {
                    providedCodeActionKinds: FetchCoderCodeActionProvider.providedCodeActionKinds
                }
            )
        );
    }

    // Register all commands
    registerChatCommands(context, historyViewProvider, statusBarManager);
    registerComposeCommands(context, statusBarManager);
    registerAgentCommands(context, statusBarManager);

    // Check API connection on startup
    checkApiConnection();
}

async function checkApiConnection() {
    try {
        const config = FetchCoderConfig.getAll();
        const response = await fetch(`${config.apiUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            vscode.window.showInformationMessage('FetchCoder: Connected to API server');
        } else {
            showConnectionError();
        }
    } catch (error) {
        showConnectionError();
    }
}

function showConnectionError() {
    vscode.window.showWarningMessage(
        'FetchCoder: Unable to connect to API server. Please ensure "fetchcoder serve" is running.',
        'Open Settings'
    ).then(selection => {
        if (selection === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'fetchcoder.apiUrl');
        }
    });
}

export function deactivate() {
    // Cleanup
    ChatPanel.dispose();
    ComposePanel.dispose();
}

