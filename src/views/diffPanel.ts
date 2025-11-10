import * as vscode from 'vscode';
import * as path from 'path';

interface FileChange {
    filePath: string;
    operation: 'created' | 'modified' | 'deleted';
    timestamp: number;
    oldContent?: string;
    newContent?: string;
}

export class DiffPanel {
    private static currentPanel: DiffPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];
    private fileChanges: FileChange[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.Two;

        if (DiffPanel.currentPanel) {
            DiffPanel.currentPanel.panel.reveal(column);
            return DiffPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'fetchcoderDiff',
            'FetchCoder Changes',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        DiffPanel.currentPanel = new DiffPanel(panel, extensionUri);
        return DiffPanel.currentPanel;
    }

    public static dispose() {
        DiffPanel.currentPanel?.disposePanel();
        DiffPanel.currentPanel = undefined;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this.panel = panel;
        this.extensionUri = extensionUri;

        this.panel.webview.html = this.getHtmlContent();
        this.panel.onDidDispose(() => this.disposePanel(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'ready':
                        // Webview is ready, send current changes
                        console.log('DiffPanel webview is ready, sending', this.fileChanges.length, 'changes');
                        this.updateWebview();
                        break;
                    case 'viewDiff':
                        await this.showDiff(message.filePath);
                        break;
                    case 'clearChanges':
                        this.clearChanges();
                        break;
                    case 'revertChange':
                        await this.revertChange(message.filePath);
                        break;
                    case 'revertAll':
                        await this.revertAllChanges();
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    public addFileChange(change: FileChange) {
        console.log('DiffPanel: Adding change:', change.operation, change.filePath);
        this.fileChanges.push(change);
        this.updateWebview();
    }

    public clearChanges() {
        this.fileChanges = [];
        this.updateWebview();
    }

    private updateWebview() {
        const message = {
            type: 'updateChanges',
            changes: this.fileChanges.map(c => ({
                filePath: c.filePath,
                operation: c.operation,
                timestamp: c.timestamp
            }))
        };
        console.log('DiffPanel: Sending to webview:', JSON.stringify(message));
        this.panel.webview.postMessage(message);
    }

    private async showDiff(filePath: string) {
        console.log('showDiff called for:', filePath);
        console.log('Available changes:', this.fileChanges.map(c => c.filePath));
        
        const change = this.fileChanges.find(c => c.filePath === filePath);
        if (!change) {
            console.error('Change not found:', filePath);
            vscode.window.showErrorMessage(`Change not found: ${filePath}`);
            return;
        }

        console.log('Found change:', change.operation, 'with old content length:', change.oldContent?.length);

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        console.log('Workspace folder:', workspaceFolder.uri.fsPath);

        try {
            if (change.operation === 'created') {
                // Just open the new file
                const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
                const doc = await vscode.workspace.openTextDocument(fileUri);
                await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
                return;
            }

            if (change.operation === 'deleted') {
                vscode.window.showInformationMessage(`File was deleted: ${filePath}`);
                return;
            }

            // For modified files, show diff
            const oldContent = change.oldContent || '';
            const newContent = change.newContent || '';

            // Create temporary documents for diff view
            const oldUri = vscode.Uri.parse(`untitled:${path.basename(filePath)} (Before)`);
            const newUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);

            // Create a temporary document with old content
            const oldDoc = await vscode.workspace.openTextDocument(oldUri);
            const edit = new vscode.WorkspaceEdit();
            edit.insert(oldUri, new vscode.Position(0, 0), oldContent);
            await vscode.workspace.applyEdit(edit);

            // Open diff view
            await vscode.commands.executeCommand(
                'vscode.diff',
                oldUri,
                newUri,
                `${path.basename(filePath)} (Before ↔ After)`,
                { preview: false, viewColumn: vscode.ViewColumn.One }
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to show diff: ${error.message}`);
        }
    }

    private async revertChange(filePath: string) {
        const change = this.fileChanges.find(c => c.filePath === filePath);
        if (!change) {
            vscode.window.showErrorMessage(`Change not found: ${filePath}`);
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, change.filePath);

        try {
            switch (change.operation) {
                case 'modified':
                    // Restore old content
                    if (change.oldContent !== undefined) {
                        await vscode.workspace.fs.writeFile(
                            fullPath,
                            Buffer.from(change.oldContent, 'utf8')
                        );
                        vscode.window.showInformationMessage(`✓ Reverted: ${change.filePath}`);
                    } else {
                        vscode.window.showErrorMessage('No backup content available for this file');
                        return;
                    }
                    break;

                case 'created':
                    // Delete the file that was created
                    await vscode.workspace.fs.delete(fullPath);
                    vscode.window.showInformationMessage(`✓ Deleted: ${change.filePath}`);
                    break;

                case 'deleted':
                    // Recreate the file with old content
                    if (change.oldContent !== undefined) {
                        await vscode.workspace.fs.writeFile(
                            fullPath,
                            Buffer.from(change.oldContent, 'utf8')
                        );
                        vscode.window.showInformationMessage(`✓ Restored: ${change.filePath}`);
                    } else {
                        vscode.window.showErrorMessage('No backup content available for this file');
                        return;
                    }
                    break;
            }

            // Remove from changes list
            this.fileChanges = this.fileChanges.filter(c => c.filePath !== filePath);
            this.updateWebview();

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to revert ${filePath}: ${error.message}`);
        }
    }

    private async revertAllChanges() {
        if (this.fileChanges.length === 0) {
            vscode.window.showInformationMessage('No changes to revert');
            return;
        }

        const confirmed = await vscode.window.showWarningMessage(
            `Revert all ${this.fileChanges.length} change(s)? This will undo all modifications, deletions, and creations.`,
            { modal: true },
            'Revert All',
            'Cancel'
        );

        if (confirmed !== 'Revert All') {
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        const changes = [...this.fileChanges]; // Create a copy to iterate

        for (const change of changes) {
            try {
                await this.revertChange(change.filePath);
                successCount++;
            } catch (error) {
                errorCount++;
            }
        }

        if (successCount > 0) {
            vscode.window.showInformationMessage(
                `✓ Reverted ${successCount} change(s)` +
                (errorCount > 0 ? ` (${errorCount} failed)` : '')
            );
        }
    }

    private disposePanel() {
        DiffPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private getHtmlContent(): string {
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'diff.css')
        );
        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'diff.js')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src ${this.panel.webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <title>FetchCoder Changes</title>
</head>
<body>
    <div class="diff-container">
        <div class="diff-header">
            <h2>File Changes</h2>
            <div class="header-buttons">
                <button id="revertAllBtn" class="btn-warning">↩️ Revert All</button>
                <button id="clearBtn" class="btn-secondary">Clear All</button>
            </div>
        </div>
        <div id="changesList" class="changes-list">
            <div class="empty-state">No changes yet. FetchCoder will track file modifications here.</div>
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}


