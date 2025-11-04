import * as vscode from 'vscode';
import * as path from 'path';
import { getFetchCoderClient, ChatMessage, StreamCallback } from '../api/fetchcoderClient';
import { FileOperations } from '../utils/fileOperations';

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
                }
            },
            null,
            this.disposables
        );
    }

    private async handleSendMessage(content: string) {
        const client = getFetchCoderClient();
        
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

    private handleClearHistory() {
        this.messageHistory = [];
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
            context: context
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

