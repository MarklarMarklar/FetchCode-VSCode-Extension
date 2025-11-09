import * as vscode from 'vscode';
import { FetchCoderConfig } from './config';
import { ChatPanel } from './views/chatPanel';
import { ComposePanel } from './views/composePanel';
import { DiffPanel } from './views/diffPanel';
import { HistoryViewProvider } from './views/historyView';
import { StatusBarManager } from './views/statusBar';
import { FetchCoderCodeActionProvider } from './providers/codeActionProvider';
import { FileTracker } from './utils/fileTracker';
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

    // Register diff command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.openDiff', () => {
            DiffPanel.createOrShow(context.extensionUri);
        })
    );
    
    // Test command to manually scan for changes
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.testScanChanges', async () => {
            const fileTracker = FileTracker.getInstance();
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open!');
                return;
            }
            
            vscode.window.showInformationMessage(`Starting tracking in: ${workspaceFolder.uri.fsPath}`);
            
            // Take snapshots NOW
            fileTracker.startTracking();
            
            vscode.window.showInformationMessage(`✅ Snapshots captured! NOW edit hello.py, add a NEW line, and save. You have 10 seconds.`);
            
            // Wait for user to make changes
            setTimeout(async () => {
                // Force VS Code to save all open files
                await vscode.workspace.saveAll();
                
                // Wait a bit more for file system to sync
                await new Promise(resolve => setTimeout(resolve, 500));
                
                console.log('Starting scan for changes...');
                const changes = await fileTracker.scanForChanges();
                console.log('Scan complete, changes:', changes);
                
                vscode.window.showInformationMessage(`Scan complete! Found ${changes.length} changes.`);
                
                if (changes.length > 0) {
                    // Create diff panel FIRST
                    console.log('Creating DiffPanel...');
                    const diffPanel = DiffPanel.createOrShow(context.extensionUri);
                    
                    // Add changes immediately
                    console.log('Adding changes to DiffPanel...');
                    changes.forEach(change => {
                        console.log('Adding change:', change.operation, change.filePath);
                        diffPanel.addFileChange(change);
                    });
                    
                    // Show notification
                    vscode.window.showInformationMessage(
                        `Found ${changes.length} change(s): ${changes.map(c => c.filePath).join(', ')}`
                    );
                } else {
                    vscode.window.showWarningMessage('No changes detected. The file content is identical to the snapshot.');
                }
            }, 10000); // Give user 10 seconds to make a change
        })
    );

    // Initialize file tracker
    const fileTracker = FileTracker.getInstance();
    context.subscriptions.push({
        dispose: () => fileTracker.dispose()
    });

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
    DiffPanel.dispose();
}

