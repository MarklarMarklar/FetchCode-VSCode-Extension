import * as vscode from 'vscode';
import * as path from 'path';
import { getFetchCoderClient, ChatMessage, StreamCallback } from '../api/fetchcoderClient';
import { FileOperations } from '../utils/fileOperations';
import { FileTracker } from '../utils/fileTracker';
import { DiffPanel } from './diffPanel';

export class ChatPanel {
    private static currentPanel: ChatPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];
    private messageHistory: ChatMessage[] = [];
    private currentAgent: string = 'general';

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'fetchcoderChat',
            'FetchCoder Chat',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
    }

    public static dispose() {
        ChatPanel.currentPanel?.disposePanel();
        ChatPanel.currentPanel = undefined;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        this.panel.webview.html = this.getHtmlContent();
        this.panel.onDidDispose(() => this.disposePanel(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'sendMessage':
                        await this.handleSendMessage(message.content);
                        break;
                    case 'clearHistory':
                        this.handleClearHistory();
                        break;
                    case 'switchAgent':
                        this.handleSwitchAgent(message.agent);
                        break;
                    case 'getContext':
                        await this.handleGetContext();
                        break;
                    case 'ready':
                        // Send workspace info when webview is ready
                        await this.sendWorkspaceInfo();
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    private async sendWorkspaceInfo() {
        const context = await FileOperations.getWorkspaceContext();
        this.panel.webview.postMessage({
            type: 'workspaceInfo',
            workspacePath: context.workspacePath || 'No workspace folder open'
        });
    }

    private async handleSendMessage(content: string) {
        const client = getFetchCoderClient();
        
        // Start tracking file changes FIRST before anything else
        const fileTracker = FileTracker.getInstance();
        fileTracker.startTracking();
        
        // Add user message to history
        this.messageHistory.push({
            role: 'user',
            content: content
        });

        // Send typing indicator
        this.panel.webview.postMessage({
            type: 'assistantTyping'
        });

        // Get workspace context if enabled
        const context = await FileOperations.getWorkspaceContext();
        
        // Log workspace path for debugging
        console.log('FetchCoder: Using workspace path:', context.workspacePath);
        if (!context.workspacePath) {
            console.warn('FetchCoder: No workspace path detected! Make sure a folder is opened.');
        }

        try {
            // Stream the response
            let fullResponse = '';
            const callback: StreamCallback = {
                onToken: (token: string) => {
                    this.panel.webview.postMessage({
                        type: 'streamToken',
                        token: token
                    });
                },
                onProgress: (progress: string) => {
                    // Send progress updates to show tool calls and file operations
                    this.panel.webview.postMessage({
                        type: 'progress',
                        text: progress
                    });
                },
                onComplete: (response: string) => {
                    fullResponse = response;
                    this.messageHistory.push({
                        role: 'assistant',
                        content: response
                    });
                    this.panel.webview.postMessage({
                        type: 'messageComplete',
                        content: response
                    });
                    
                    // Get file changes and add to diff panel
                    setTimeout(async () => {
                        console.log('FetchCoder: Scanning for file changes...');
                        const changes = await fileTracker.scanForChanges();
                        console.log('FetchCoder: Found', changes.length, 'changes');
                        changes.forEach(c => console.log('  -', c.operation, c.filePath));
                        
                        if (changes.length > 0) {
                            const diffPanel = DiffPanel.createOrShow(this.extensionUri);
                            changes.forEach(change => diffPanel.addFileChange(change));
                            
                            // Show notification
                            vscode.window.showInformationMessage(
                                `FetchCoder made ${changes.length} file change(s)`,
                                'View Changes'
                            ).then(selection => {
                                if (selection === 'View Changes') {
                                    vscode.commands.executeCommand('fetchcoder.openDiff');
                                }
                            });
                        } else {
                            console.log('FetchCoder: No file changes detected');
                        }
                    }, 1500); // Delay to ensure file system operations complete
                },
                onError: (error: Error) => {
                    this.panel.webview.postMessage({
                        type: 'error',
                        error: error.message
                    });
                }
            };

            await client.sendMessageStreaming({
                message: content,
                agent: this.currentAgent,
                context: context,
                history: this.messageHistory.slice(-10) // Last 10 messages for context
            }, callback);

        } catch (error: any) {
            this.panel.webview.postMessage({
                type: 'error',
                error: error.message || 'Failed to send message'
            });
        }
    }

    private async handleClearHistory() {
        this.messageHistory = [];
        
        // Clear session on server
        const context = await FileOperations.getWorkspaceContext();
        const client = getFetchCoderClient();
        
        try {
            await fetch(`${client.getBaseUrl()}/api/session/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    workspacePath: context.workspacePath
                })
            });
            console.log('FetchCoder: Session cleared on server');
        } catch (error) {
            console.error('FetchCoder: Failed to clear session on server:', error);
        }
        
        this.panel.webview.postMessage({
            type: 'historyCleared'
        });
    }

    private handleSwitchAgent(agent: string) {
        this.currentAgent = agent;
        const client = getFetchCoderClient();
        client.setAgent(agent);
        this.panel.webview.postMessage({
            type: 'agentSwitched',
            agent: agent
        });
    }

    private async handleGetContext() {
        const context = await FileOperations.getWorkspaceContext();
        this.panel.webview.postMessage({
            type: 'contextLoaded',
            context: context,
            workspacePath: context.workspacePath
        });
    }

    public sendMessage(message: string) {
        this.panel.webview.postMessage({
            type: 'injectMessage',
            message: message
        });
    }

    private disposePanel() {
        ChatPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private getHtmlContent(): string {
        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'chat.js')
        );
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'chat.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src ${this.panel.webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <title>FetchCoder Chat</title>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>FetchCoder Chat</h2>
            <div class="header-controls">
                <select id="agentSelector" class="agent-selector">
                    <option value="general">General</option>
                    <option value="build">Build</option>
                    <option value="plan">Plan</option>
                    <option value="agentverse">Agentverse</option>
                </select>
                <button id="clearBtn" class="btn-icon" title="Clear History">🗑️</button>
            </div>
        </div>
        <div id="chatMessages" class="chat-messages"></div>
        <div class="chat-input-container">
            <textarea id="chatInput" class="chat-input" placeholder="Ask FetchCoder anything..." rows="3"></textarea>
            <button id="sendBtn" class="send-btn">Send</button>
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}

