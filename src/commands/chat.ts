import * as vscode from 'vscode';
import { ChatPanel } from '../views/chatPanel';
import { HistoryViewProvider } from '../views/historyView';
import { StatusBarManager } from '../views/statusBar';

export function registerChatCommands(
    context: vscode.ExtensionContext,
    historyProvider: HistoryViewProvider,
    statusBar: StatusBarManager
) {
    // Open Chat command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.openChat', () => {
            ChatPanel.createOrShow(context.extensionUri);
        })
    );

    // Send Selection to Chat command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.sendSelection', async (document?: vscode.TextDocument, range?: vscode.Range) => {
            ChatPanel.createOrShow(context.extensionUri);
            
            // Get selection from active editor if not provided
            if (!document || !range) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No text selected');
                    return;
                }
                document = editor.document;
                range = editor.selection;
            }

            const selectedText = document.getText(range);
            if (!selectedText) {
                vscode.window.showWarningMessage('No text selected');
                return;
            }

            const language = document.languageId;
            const message = `I have the following ${language} code:\n\n\`\`\`${language}\n${selectedText}\n\`\`\`\n\nWhat would you like to know about it?`;
            
            // Send message to chat panel
            setTimeout(() => {
                const panel = ChatPanel.createOrShow(context.extensionUri) as any;
                if (panel && panel.sendMessage) {
                    panel.sendMessage(message);
                }
            }, 100);
        })
    );

    // Explain Code command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.explain', async (document?: vscode.TextDocument, range?: vscode.Range) => {
            ChatPanel.createOrShow(context.extensionUri);
            
            if (!document || !range) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No text selected');
                    return;
                }
                document = editor.document;
                range = editor.selection;
            }

            const selectedText = document.getText(range);
            if (!selectedText) {
                vscode.window.showWarningMessage('No text selected');
                return;
            }

            const language = document.languageId;
            const message = `Please explain this ${language} code:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
            
            // Send message to chat panel
            setTimeout(() => {
                const panel = ChatPanel.createOrShow(context.extensionUri) as any;
                if (panel && panel.sendMessage) {
                    panel.sendMessage(message);
                }
            }, 100);
        })
    );

    // Fix Code command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.fix', async (
            document?: vscode.TextDocument,
            range?: vscode.Range,
            diagnostics?: vscode.Diagnostic[]
        ) => {
            ChatPanel.createOrShow(context.extensionUri);
            
            if (!document || !range) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No code to fix');
                    return;
                }
                document = editor.document;
                range = editor.selection.isEmpty 
                    ? new vscode.Range(0, 0, document.lineCount, 0)
                    : editor.selection;
            }

            const selectedText = document.getText(range);
            const language = document.languageId;
            
            let message = `Please fix the following ${language} code:\n\n\`\`\`${language}\n${selectedText}\n\`\`\``;
            
            if (diagnostics && diagnostics.length > 0) {
                message += '\n\nErrors to fix:\n';
                diagnostics.forEach(d => {
                    message += `- Line ${d.range.start.line + 1}: ${d.message}\n`;
                });
            }
            
            setTimeout(() => {
                const panel = ChatPanel.createOrShow(context.extensionUri) as any;
                if (panel && panel.sendMessage) {
                    panel.sendMessage(message);
                }
            }, 100);
        })
    );

    // Clear History command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.clearHistory', () => {
            vscode.window.showWarningMessage(
                'Clear all chat history?',
                'Yes',
                'No'
            ).then(selection => {
                if (selection === 'Yes') {
                    historyProvider.clearHistory();
                    vscode.window.showInformationMessage('Chat history cleared');
                }
            });
        })
    );

    // Check Connection command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.checkConnection', async () => {
            const { getFetchCoderClient } = require('../api/fetchcoderClient');
            const client = getFetchCoderClient();
            
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Checking FetchCoder API connection...',
                    cancellable: false
                },
                async () => {
                    const isHealthy = await client.checkHealth();
                    
                    if (isHealthy) {
                        vscode.window.showInformationMessage(
                            `✓ FetchCoder API is connected at ${client.getBaseUrl()}`
                        );
                        statusBar.setConnected(true);
                    } else {
                        vscode.window.showErrorMessage(
                            `✗ Unable to connect to FetchCoder API at ${client.getBaseUrl()}. Please ensure "fetchcoder serve" is running.`,
                            'Open Settings'
                        ).then(selection => {
                            if (selection === 'Open Settings') {
                                vscode.commands.executeCommand('workbench.action.openSettings', 'fetchcoder.apiUrl');
                            }
                        });
                        statusBar.setConnected(false);
                    }
                }
            );
        })
    );

    // Check Workspace command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.checkWorkspace', async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            
            if (workspaceFolder) {
                const workspacePath = workspaceFolder.uri.fsPath;
                vscode.window.showInformationMessage(
                    `✓ FetchCoder workspace: ${workspacePath}`
                );
            } else {
                vscode.window.showWarningMessage(
                    '⚠ No workspace folder is open. FetchCoder commands will run in the API server\'s directory.',
                    'Open Folder'
                ).then(selection => {
                    if (selection === 'Open Folder') {
                        vscode.commands.executeCommand('workbench.action.files.openFolder');
                    }
                });
            }
        })
    );
}

