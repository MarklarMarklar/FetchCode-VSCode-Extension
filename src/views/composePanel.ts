import * as vscode from 'vscode';
import { getFetchCoderClient } from '../api/fetchcoderClient';
import { FileOperations } from '../utils/fileOperations';

interface FileChange {
    path: string;
    oldContent: string;
    newContent: string;
    action: 'modify' | 'create' | 'delete';
}

export class ComposePanel {
    private static currentPanel: ComposePanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];
    private pendingChanges: FileChange[] = [];
    private currentAgent: string = 'general';

    public static createOrShow(extensionUri: vscode.Uri, initialPrompt?: string) {
        const column = vscode.ViewColumn.Two;

        if (ComposePanel.currentPanel) {
            ComposePanel.currentPanel.panel.reveal(column);
            if (initialPrompt) {
                ComposePanel.currentPanel.setPrompt(initialPrompt);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'fetchcoderCompose',
            'FetchCoder Compose',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        ComposePanel.currentPanel = new ComposePanel(panel, extensionUri, initialPrompt);
    }

    public static dispose() {
        ComposePanel.currentPanel?.disposePanel();
        ComposePanel.currentPanel = undefined;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, initialPrompt?: string) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        this.panel.webview.html = this.getHtmlContent();
        this.panel.onDidDispose(() => this.disposePanel(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'compose':
                        await this.handleCompose(message.prompt);
                        break;
                    case 'acceptChange':
                        await this.handleAcceptChange(message.index);
                        break;
                    case 'rejectChange':
                        this.handleRejectChange(message.index);
                        break;
                    case 'acceptAll':
                        await this.handleAcceptAll();
                        break;
                    case 'rejectAll':
                        this.handleRejectAll();
                        break;
                    case 'viewDiff':
                        await this.handleViewDiff(message.index);
                        break;
                }
            },
            null,
            this.disposables
        );

        if (initialPrompt) {
            setTimeout(() => this.setPrompt(initialPrompt), 100);
        }
    }

    private setPrompt(prompt: string) {
        this.panel.webview.postMessage({
            type: 'setPrompt',
            prompt: prompt
        });
    }

    private async handleCompose(prompt: string) {
        const client = getFetchCoderClient();
        
        this.panel.webview.postMessage({ type: 'composing' });

        try {
            // Get workspace context
            const context = await FileOperations.getWorkspaceContext();
            
            // Enhanced prompt for code generation
            const enhancedPrompt = `${prompt}\n\nPlease provide specific file changes in the following format:\nFILE: path/to/file.ext\nACTION: create|modify|delete\nCONTENT:\n\`\`\`\n[file content here]\n\`\`\``;

            const response = await client.sendMessage({
                message: enhancedPrompt,
                agent: this.currentAgent,
                context: context
            });

            if (response.error) {
                this.panel.webview.postMessage({
                    type: 'error',
                    error: response.error
                });
                return;
            }

            // Parse response for file changes
            const changes = this.parseFileChanges(response.response);
            
            if (changes.length === 0) {
                this.panel.webview.postMessage({
                    type: 'response',
                    response: response.response
                });
                return;
            }

            this.pendingChanges = changes;
            
            this.panel.webview.postMessage({
                type: 'changesReady',
                changes: changes.map(c => ({
                    path: c.path,
                    action: c.action,
                    linesAdded: c.newContent.split('\n').length,
                    linesRemoved: c.oldContent.split('\n').length
                }))
            });

        } catch (error: any) {
            this.panel.webview.postMessage({
                type: 'error',
                error: error.message
            });
        }
    }

    private parseFileChanges(response: string): FileChange[] {
        const changes: FileChange[] = [];
        
        // Look for file change patterns in the response
        const fileBlockRegex = /FILE:\s*([^\n]+)\s*\nACTION:\s*(create|modify|delete)\s*\nCONTENT:\s*```[\w]*\n([\s\S]*?)```/gi;
        
        let match;
        while ((match = fileBlockRegex.exec(response)) !== null) {
            const [, filePath, action, content] = match;
            changes.push({
                path: filePath.trim(),
                oldContent: '', // Will be filled when applying
                newContent: content.trim(),
                action: action.toLowerCase() as 'modify' | 'create' | 'delete'
            });
        }

        // Alternative: Look for code blocks with file paths
        if (changes.length === 0) {
            const codeBlockRegex = /```[\w]*:([^\n]+)\n([\s\S]*?)```/gi;
            while ((match = codeBlockRegex.exec(response)) !== null) {
                const [, filePath, content] = match;
                changes.push({
                    path: filePath.trim(),
                    oldContent: '',
                    newContent: content.trim(),
                    action: 'modify'
                });
            }
        }

        return changes;
    }

    private async handleAcceptChange(index: number) {
        if (index < 0 || index >= this.pendingChanges.length) {
            return;
        }

        const change = this.pendingChanges[index];
        
        try {
            // Load old content if it exists
            if (change.action === 'modify') {
                try {
                    change.oldContent = await FileOperations.readFile(change.path);
                } catch (error) {
                    // File doesn't exist, treat as create
                    change.action = 'create';
                }
            }

            // Apply the change
            if (change.action === 'delete') {
                await FileOperations.deleteFile(change.path);
            } else {
                await FileOperations.writeFile(change.path, change.newContent);
            }

            // Remove from pending
            this.pendingChanges.splice(index, 1);
            
            this.panel.webview.postMessage({
                type: 'changeApplied',
                index: index
            });

            vscode.window.showInformationMessage(`Applied changes to ${change.path}`);
            
            // Open the file
            const uri = FileOperations.getFileUri(change.path);
            if (uri) {
                await vscode.window.showTextDocument(uri);
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to apply changes: ${error.message}`);
        }
    }

    private handleRejectChange(index: number) {
        if (index < 0 || index >= this.pendingChanges.length) {
            return;
        }

        this.pendingChanges.splice(index, 1);
        
        this.panel.webview.postMessage({
            type: 'changeRejected',
            index: index
        });
    }

    private async handleAcceptAll() {
        const changes = [...this.pendingChanges];
        
        for (let i = 0; i < changes.length; i++) {
            await this.handleAcceptChange(0); // Always accept first since array shrinks
        }
        
        vscode.window.showInformationMessage(`Applied ${changes.length} changes`);
    }

    private handleRejectAll() {
        const count = this.pendingChanges.length;
        this.pendingChanges = [];
        
        this.panel.webview.postMessage({
            type: 'allRejected'
        });
        
        vscode.window.showInformationMessage(`Rejected ${count} changes`);
    }

    private async handleViewDiff(index: number) {
        if (index < 0 || index >= this.pendingChanges.length) {
            return;
        }

        const change = this.pendingChanges[index];
        
        try {
            // Load old content
            let oldContent = change.oldContent;
            if (!oldContent && change.action === 'modify') {
                try {
                    oldContent = await FileOperations.readFile(change.path);
                } catch (error) {
                    oldContent = '';
                }
            }

            // Create temporary documents for diff view
            const oldUri = vscode.Uri.parse(`untitled:${change.path}.old`);
            const newUri = vscode.Uri.parse(`untitled:${change.path}.new`);

            await vscode.workspace.openTextDocument(oldUri).then(doc => {
                return vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
            });

            await vscode.workspace.openTextDocument(newUri).then(doc => {
                return vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Two });
            });

            // Open diff
            await vscode.commands.executeCommand(
                'vscode.diff',
                oldUri,
                newUri,
                `${change.path} (Original ↔ Proposed)`
            );

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to show diff: ${error.message}`);
        }
    }

    private disposePanel() {
        ComposePanel.currentPanel = undefined;
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
            vscode.Uri.joinPath(this.extensionUri, 'media', 'compose.js')
        );
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'compose.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src ${this.panel.webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <title>FetchCoder Compose</title>
</head>
<body>
    <div class="compose-container">
        <div class="compose-header">
            <h2>FetchCoder Compose</h2>
            <p class="subtitle">Describe the changes you want to make</p>
        </div>
        
        <div class="compose-input-section">
            <textarea id="composeInput" class="compose-input" placeholder="E.g., 'Add error handling to the API endpoints' or 'Refactor the authentication logic into a separate module'..." rows="5"></textarea>
            <button id="composeBtn" class="compose-btn">Generate Changes</button>
        </div>

        <div id="responseSection" class="response-section hidden">
            <div id="responseText" class="response-text"></div>
        </div>

        <div id="changesSection" class="changes-section hidden">
            <div class="changes-header">
                <h3>Proposed Changes</h3>
                <div class="changes-actions">
                    <button id="acceptAllBtn" class="btn-success">Accept All</button>
                    <button id="rejectAllBtn" class="btn-danger">Reject All</button>
                </div>
            </div>
            <div id="changesList" class="changes-list"></div>
        </div>

        <div id="loadingIndicator" class="loading-indicator hidden">
            <div class="spinner"></div>
            <p>Generating changes...</p>
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}

