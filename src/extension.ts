import * as vscode from 'vscode';
import { FetchCoderConfig } from './config';
import { ChatPanel } from './views/chatPanel';
import { ComposePanel } from './views/composePanel';
import { DiffPanel } from './views/diffPanel';
import { HistoryViewProvider } from './views/historyView';
import { StatusBarManager } from './views/statusBar';
import { FetchCoderCodeActionProvider } from './providers/codeActionProvider';
import { FileTracker } from './utils/fileTracker';
import { ApiServerManager } from './utils/apiServerManager';
import { registerChatCommands } from './commands/chat';
import { registerComposeCommands } from './commands/compose';
import { registerAgentCommands } from './commands/agents';

let statusBarManager: StatusBarManager;
let apiServerManager: ApiServerManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('FetchCoder extension is now active!');

    // Initialize API Server Manager
    apiServerManager = ApiServerManager.getInstance(context);

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

    // Register API server management commands
    registerApiServerCommands(context);

    // Auto-setup API server on first activation (non-blocking)
    autoSetupApiServer(context).catch(error => {
        console.error('FetchCoder: Error during auto-setup:', error);
        vscode.window.showErrorMessage(
            'FetchCoder: Auto-setup failed. You can manually setup using: FetchCoder: Setup API Server',
            'Setup Now'
        ).then(selection => {
            if (selection === 'Setup Now') {
                vscode.commands.executeCommand('fetchcoder.setupApiServer');
            }
        });
    });

    // Dispose API server manager
    context.subscriptions.push({
        dispose: () => apiServerManager.dispose()
    });
}

/**
 * Automatically setup and start API server on first run or if not running
 */
async function autoSetupApiServer(context: vscode.ExtensionContext) {
    const status = await apiServerManager.getStatus();
    
    // Check if FetchCoder CLI is installed
    if (!apiServerManager.isFetchCoderCliInstalled()) {
        const selection = await vscode.window.showWarningMessage(
            'FetchCoder CLI is not installed. Please install it first.',
            'Install Instructions',
            'Dismiss'
        );
        
        if (selection === 'Install Instructions') {
            vscode.env.openExternal(vscode.Uri.parse('https://innovationlab.fetch.ai/resources/docs/fetchcoder/overview'));
        }
        return;
    }

    // If not installed, offer to set up
    if (!status.installed) {
        const selection = await vscode.window.showInformationMessage(
            'FetchCoder API server needs to be set up. Set it up now?',
            'Setup Now',
            'Later'
        );
        
        if (selection === 'Setup Now') {
            try {
                const success = await apiServerManager.setup();
                if (success) {
                    vscode.window.showInformationMessage('✅ FetchCoder API server is ready!');
                } else {
                    vscode.window.showErrorMessage('Failed to start API server. Please check the logs.');
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Setup failed: ${error.message}`);
            }
        }
        return;
    }

    // If installed but not running, start it automatically
    if (status.installed && !status.running) {
        try {
            console.log('FetchCoder: API server not running, starting automatically...');
            const success = await apiServerManager.start();
            if (success) {
                console.log('FetchCoder: API server started successfully');
            } else {
                vscode.window.showWarningMessage(
                    'FetchCoder API server failed to start. You can try manually.',
                    'Start Server'
                ).then(selection => {
                    if (selection === 'Start Server') {
                        vscode.commands.executeCommand('fetchcoder.startApiServer');
                    }
                });
            }
        } catch (error) {
            console.error('FetchCoder: Error starting API server:', error);
        }
        return;
    }

    // Server is running, all good!
    if (status.running) {
        console.log('FetchCoder: API server is running at', status.url);
    }
}

/**
 * Register API server management commands
 */
function registerApiServerCommands(context: vscode.ExtensionContext) {
    // Setup API Server command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.setupApiServer', async () => {
            try {
                const success = await apiServerManager.setup();
                if (success) {
                    vscode.window.showInformationMessage('✅ FetchCoder API server setup complete!');
                } else {
                    vscode.window.showErrorMessage('Failed to setup API server');
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Setup failed: ${error.message}`);
            }
        })
    );

    // Start API Server command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.startApiServer', async () => {
            try {
                const running = await apiServerManager.isRunning();
                if (running) {
                    vscode.window.showInformationMessage('API server is already running');
                    return;
                }

                const success = await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Starting FetchCoder API server...',
                    cancellable: false
                }, async () => {
                    return await apiServerManager.start();
                });

                if (success) {
                    vscode.window.showInformationMessage('✅ FetchCoder API server started');
                } else {
                    vscode.window.showErrorMessage('Failed to start API server');
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to start: ${error.message}`);
            }
        })
    );

    // Stop API Server command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.stopApiServer', async () => {
            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Stopping FetchCoder API server...',
                    cancellable: false
                }, async () => {
                    await apiServerManager.stop();
                });
                
                vscode.window.showInformationMessage('FetchCoder API server stopped');
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to stop: ${error.message}`);
            }
        })
    );

    // Check API Server Status command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.checkApiServerStatus', async () => {
            const status = await apiServerManager.getStatus();
            
            const statusMessage = [
                `FetchCoder API Server Status:`,
                `• Installed: ${status.installed ? '✅' : '❌'}`,
                `• Running: ${status.running ? '✅' : '❌'}`,
                `• URL: ${status.url}`,
                `• Port: ${status.port}`
            ].join('\n');

            if (status.running) {
                vscode.window.showInformationMessage(statusMessage);
            } else if (status.installed) {
                vscode.window.showWarningMessage(statusMessage, 'Start Server').then(selection => {
                    if (selection === 'Start Server') {
                        vscode.commands.executeCommand('fetchcoder.startApiServer');
                    }
                });
            } else {
                vscode.window.showWarningMessage(statusMessage, 'Setup Now').then(selection => {
                    if (selection === 'Setup Now') {
                        vscode.commands.executeCommand('fetchcoder.setupApiServer');
                    }
                });
            }
        })
    );

    // Reinstall/Update API Server command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.reinstallApiServer', async () => {
            try {
                const confirm = await vscode.window.showWarningMessage(
                    'This will reinstall the API server files. The server will be restarted. Continue?',
                    'Yes, Reinstall',
                    'Cancel'
                );

                if (confirm !== 'Yes, Reinstall') {
                    return;
                }

                const success = await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Reinstalling FetchCoder API server...',
                    cancellable: false
                }, async (progress) => {
                    progress.report({ message: 'Stopping server...' });
                    await apiServerManager.install();
                    
                    progress.report({ message: 'Starting server...' });
                    return await apiServerManager.start();
                });

                if (success) {
                    vscode.window.showInformationMessage('✅ FetchCoder API server reinstalled and restarted!');
                } else {
                    vscode.window.showErrorMessage('API server reinstalled but failed to start. Try starting it manually.');
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Reinstall failed: ${error.message}`);
            }
        })
    );
}

export function deactivate() {
    // Cleanup
    ChatPanel.dispose();
    ComposePanel.dispose();
    DiffPanel.dispose();
}

