import * as vscode from 'vscode';
import * as path from 'path';
import { FetchCoderConfig } from '../config';

export interface FileContext {
    files?: Array<{ path: string; content: string }>;
    selection?: string;
    language?: string;
}

export class FileOperations {
    /**
     * Get current workspace context including open files and selection
     */
    static async getWorkspaceContext(): Promise<FileContext> {
        const context: FileContext = {};
        
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            if (!selection.isEmpty) {
                context.selection = editor.document.getText(selection);
            }
            context.language = editor.document.languageId;
        }

        // Get relevant files based on configuration
        const maxFiles = FetchCoderConfig.get('autoContextFiles');
        if (maxFiles > 0) {
            context.files = await this.getRelevantFiles(maxFiles);
        }

        return context;
    }

    /**
     * Get relevant files from workspace
     */
    static async getRelevantFiles(maxFiles: number): Promise<Array<{ path: string; content: string }>> {
        const files: Array<{ path: string; content: string }> = [];
        
        // Get currently open and recently modified files
        const openEditors = vscode.window.visibleTextEditors;
        
        for (const editor of openEditors.slice(0, maxFiles)) {
            const document = editor.document;
            if (document.uri.scheme === 'file') {
                const relativePath = vscode.workspace.asRelativePath(document.uri);
                files.push({
                    path: relativePath,
                    content: document.getText()
                });
            }
        }

        return files;
    }

    /**
     * Read file content
     */
    static async readFile(filePath: string): Promise<string> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }

            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            const content = await vscode.workspace.fs.readFile(fileUri);
            return Buffer.from(content).toString('utf8');
        } catch (error: any) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Write file content
     */
    static async writeFile(filePath: string, content: string): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }

            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            const contentBytes = Buffer.from(content, 'utf8');
            await vscode.workspace.fs.writeFile(fileUri, contentBytes);
        } catch (error: any) {
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Create a new file
     */
    static async createFile(filePath: string, content: string = ''): Promise<void> {
        await this.writeFile(filePath, content);
    }

    /**
     * Delete a file
     */
    static async deleteFile(filePath: string): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }

            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            await vscode.workspace.fs.delete(fileUri);
        } catch (error: any) {
            throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Search for text across workspace files
     */
    static async searchFiles(query: string, maxResults: number = 50): Promise<Array<{ path: string; line: number; text: string }>> {
        const results: Array<{ path: string; line: number; text: string }> = [];
        
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
        
        for (const file of files.slice(0, maxResults)) {
            try {
                const content = await vscode.workspace.fs.readFile(file);
                const text = Buffer.from(content).toString('utf8');
                const lines = text.split('\n');
                
                lines.forEach((line, index) => {
                    if (line.toLowerCase().includes(query.toLowerCase())) {
                        results.push({
                            path: vscode.workspace.asRelativePath(file),
                            line: index + 1,
                            text: line.trim()
                        });
                    }
                });
            } catch (error) {
                // Skip files that can't be read
                continue;
            }
        }

        return results;
    }

    /**
     * Apply a workspace edit (for multi-file changes)
     */
    static async applyWorkspaceEdit(changes: Array<{ path: string; content: string }>): Promise<boolean> {
        const edit = new vscode.WorkspaceEdit();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }

        for (const change of changes) {
            const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, change.path);
            
            // Read existing file to get full range
            try {
                const document = await vscode.workspace.openTextDocument(fileUri);
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                edit.replace(fileUri, fullRange, change.content);
            } catch (error) {
                // File doesn't exist, create it
                edit.createFile(fileUri, { ignoreIfExists: true });
                edit.insert(fileUri, new vscode.Position(0, 0), change.content);
            }
        }

        return await vscode.workspace.applyEdit(edit);
    }

    /**
     * Get all files in workspace
     */
    static async getAllFiles(pattern: string = '**/*', exclude: string = '**/node_modules/**'): Promise<string[]> {
        const files = await vscode.workspace.findFiles(pattern, exclude);
        return files.map(file => vscode.workspace.asRelativePath(file));
    }

    /**
     * Get file by relative path
     */
    static getFileUri(relativePath: string): vscode.Uri | undefined {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }
        return vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
    }
}

