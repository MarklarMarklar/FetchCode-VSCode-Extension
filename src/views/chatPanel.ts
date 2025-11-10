import * as vscode from 'vscode';
import * as path from 'path';
import { getFetchCoderClient, ChatMessage, StreamCallback } from '../api/fetchcoderClient';
import { FileOperations, FileContext } from '../utils/fileOperations';
import { FileTracker } from '../utils/fileTracker';
import { DiffPanel } from './diffPanel';

export class ChatPanel {
    private static currentPanel: ChatPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];
    private messageHistory: ChatMessage[] = [];
    private currentAgent: string = 'general';
    private attachedFiles: string[] = []; // Store attached file paths
    private attachedFolders: string[] = []; // Store attached folder paths

    public static createOrShow(extensionUri: vscode.Uri) {
        // Always use ViewColumn.Two to maintain split panel layout
        const column = vscode.ViewColumn.Two;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.panel.reveal(column);
            return ChatPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'fetchcoderChat',
            'FetchCoder Chat',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
        return ChatPanel.currentPanel;
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
                    case 'attachFile':
                        await this.handleAttachFile();
                        break;
                    case 'attachFolder':
                        await this.handleAttachFolder();
                        break;
                    case 'removeAttachment':
                        this.handleRemoveAttachment(message.path, message.isFolder);
                        break;
                    case 'dropFiles':
                        await this.handleDropFiles(message.uris);
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
        
        // SIMPLE APPROACH: Add file/folder paths directly to the message
        let enhancedMessage = content;
        
        if (this.attachedFiles.length > 0 || this.attachedFolders.length > 0) {
            enhancedMessage += '\n\n---\n';
            enhancedMessage += 'Context files (please read these files):\n';
            
            // Add attached files
            this.attachedFiles.forEach(file => {
                enhancedMessage += `- ${file}\n`;
            });
            
            // Add attached folders
            this.attachedFolders.forEach(folder => {
                enhancedMessage += `- ${folder}/ (folder - read all files in it)\n`;
            });
            
        }
        
        // Add user message to history
        this.messageHistory.push({
            role: 'user',
            content: enhancedMessage
        });

        // Send typing indicator
        this.panel.webview.postMessage({
            type: 'assistantTyping'
        });

        // Get workspace context (no longer sending file contents)
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
                message: enhancedMessage,
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

    private async handleAttachFile() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const fileUris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            defaultUri: workspaceFolder.uri,
            openLabel: 'Attach File(s)'
        });

        if (fileUris && fileUris.length > 0) {
            for (const fileUri of fileUris) {
                const relativePath = vscode.workspace.asRelativePath(fileUri);
                if (!this.attachedFiles.includes(relativePath)) {
                    this.attachedFiles.push(relativePath);
                }
            }
            this.updateAttachmentsUI();
            vscode.window.showInformationMessage(`Attached ${fileUris.length} file(s) to chat context`);
        }
    }

    private async handleAttachFolder() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const folderUris = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: true,
            defaultUri: workspaceFolder.uri,
            openLabel: 'Attach Folder(s)'
        });

        if (folderUris && folderUris.length > 0) {
            for (const folderUri of folderUris) {
                let relativePath = vscode.workspace.asRelativePath(folderUri);
                
                // If the folder IS the workspace root, use '.'
                if (folderUri.fsPath === workspaceFolder.uri.fsPath) {
                    relativePath = '.';
                }
                
                if (!this.attachedFolders.includes(relativePath)) {
                    this.attachedFolders.push(relativePath);
                }
            }
            this.updateAttachmentsUI();
            vscode.window.showInformationMessage(`Attached ${folderUris.length} folder(s) to chat context`);
        }
    }

    private handleRemoveAttachment(path: string, isFolder: boolean) {
        if (isFolder) {
            this.attachedFolders = this.attachedFolders.filter(f => f !== path);
        } else {
            this.attachedFiles = this.attachedFiles.filter(f => f !== path);
        }
        this.updateAttachmentsUI();
    }

    private updateAttachmentsUI() {
        this.panel.webview.postMessage({
            type: 'updateAttachments',
            attachedFiles: this.attachedFiles,
            attachedFolders: this.attachedFolders
        });
    }

    private async handleDropFiles(uris: string[]) {
        if (!uris || uris.length === 0) {
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        // Convert URI strings to VS Code URIs and process each
        for (const uriString of uris) {
            try {
                // Handle different URI formats
                let uri: vscode.Uri;
                if (uriString.startsWith('vscode-remote://')) {
                    // WSL/Remote URI - parse directly, VS Code knows how to handle these
                    uri = vscode.Uri.parse(uriString);
                } else if (uriString.startsWith('file://')) {
                    // Already a proper file URI
                    uri = vscode.Uri.parse(uriString);
                } else if (uriString.startsWith('vscode-resource://')) {
                    // VS Code resource URI
                    uri = vscode.Uri.parse(uriString.replace('vscode-resource://', 'file://'));
                } else {
                    // Assume it's a file path
                    uri = vscode.Uri.file(uriString);
                }
                
                // Check if file/folder exists
                const stat = await vscode.workspace.fs.stat(uri);
                
                // Get relative path from workspace
                const relativePath = vscode.workspace.asRelativePath(uri);
                
                // Check if it's a file or folder
                if (stat.type === vscode.FileType.Directory) {
                    // It's a folder
                    if (!this.attachedFolders.includes(relativePath)) {
                        this.attachedFolders.push(relativePath);
                        successCount++;
                    }
                } else if (stat.type === vscode.FileType.File) {
                    // It's a file
                    if (!this.attachedFiles.includes(relativePath)) {
                        this.attachedFiles.push(relativePath);
                        successCount++;
                    }
                }
            } catch (error: any) {
                console.error('Error processing dropped file:', uriString, error);
                errorCount++;
                vscode.window.showErrorMessage(`Failed to attach: ${error.message}`);
            }
        }
        
        // Update UI with new attachments
        this.updateAttachmentsUI();
        
        // Show success message
        if (successCount > 0) {
            vscode.window.showInformationMessage(
                `Attached ${successCount} item(s) to chat`
            );
        } else if (errorCount > 0) {
            vscode.window.showWarningMessage(
                `Failed to attach ${errorCount} item(s)`
            );
        } else {
            vscode.window.showInformationMessage('Items already attached');
        }
    }

    // No longer needed - we just add paths to the message now
    // FetchCoder will use its own tools to read the files

    public sendMessage(message: string) {
        this.panel.webview.postMessage({
            type: 'injectMessage',
            message: message
        });
    }

    public addFileAttachment(uri: vscode.Uri) {
        const relativePath = vscode.workspace.asRelativePath(uri);
        if (!this.attachedFiles.includes(relativePath)) {
            this.attachedFiles.push(relativePath);
            this.updateAttachmentsUI();
            this.panel.reveal(); // Bring chat panel to focus
            vscode.window.showInformationMessage(`Added ${path.basename(relativePath)} to chat context`);
        } else {
            vscode.window.showInformationMessage(`${path.basename(relativePath)} is already attached`);
        }
    }

    public addFolderAttachment(uri: vscode.Uri) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        
        // Convert to relative path from workspace root
        let relativePath = vscode.workspace.asRelativePath(uri);
        
        // If the folder IS the workspace root, use empty string or '.'
        if (uri.fsPath === workspaceFolder.uri.fsPath) {
            relativePath = '.';
        }
        
        if (!this.attachedFolders.includes(relativePath)) {
            this.attachedFolders.push(relativePath);
            this.updateAttachmentsUI();
            this.panel.reveal(); // Bring chat panel to focus
            vscode.window.showInformationMessage(`Added ${path.basename(relativePath)} folder to chat context`);
        } else {
            vscode.window.showInformationMessage(`${path.basename(relativePath)} folder is already attached`);
        }
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
        // Add cache busting to force reload of resources
        const timestamp = Date.now();
        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'chat.js')
        ) + `?v=${timestamp}`;
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'chat.css')
        ) + `?v=${timestamp}`;

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
        <div id="attachmentsContainer" class="attachments-container" style="display: none;">
            <div class="attachments-header">
                <span class="attachments-title">📎 Attached Context</span>
                <div class="attachments-actions">
                    <button id="attachFileBtn" class="btn-attach" title="Attach File">📄 File</button>
                    <button id="attachFolderBtn" class="btn-attach" title="Attach Folder">📁 Folder</button>
                </div>
            </div>
            <div id="attachmentsList" class="attachments-list"></div>
        </div>
        <div id="chatMessages" class="chat-messages"></div>
        <div class="chat-input-container">
            <div class="input-actions">
                <button id="attachFileBtnBottom" class="btn-icon-small" title="Attach File">📄</button>
                <button id="attachFolderBtnBottom" class="btn-icon-small" title="Attach Folder">📁</button>
            </div>
            <textarea id="chatInput" class="chat-input" placeholder="Ask FetchCoder anything..." rows="3"></textarea>
            <button id="sendBtn" class="send-btn">Send</button>
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}

