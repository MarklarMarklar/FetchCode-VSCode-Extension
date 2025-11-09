import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface FileChange {
    filePath: string;
    operation: 'created' | 'modified' | 'deleted';
    timestamp: number;
    oldContent?: string;
    newContent?: string;
}

export class FileTracker {
    private static instance: FileTracker;
    private fileSnapshots: Map<string, string> = new Map();
    private changes: FileChange[] = [];
    private watcher: vscode.FileSystemWatcher | undefined;

    private constructor() {
        this.setupWatcher();
    }

    public static getInstance(): FileTracker {
        if (!FileTracker.instance) {
            FileTracker.instance = new FileTracker();
        }
        return FileTracker.instance;
    }

    private setupWatcher() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        // Watch for file changes in the workspace
        this.watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceFolder, '**/*'),
            false, // don't ignore creates
            false, // don't ignore changes
            false  // don't ignore deletes
        );

        this.watcher.onDidCreate(uri => this.handleFileCreate(uri));
        this.watcher.onDidChange(uri => this.handleFileChange(uri));
        this.watcher.onDidDelete(uri => this.handleFileDelete(uri));
    }

    public startTracking() {
        this.changes = [];
        this.fileSnapshots.clear();
        
        // Take snapshots of existing files SYNCHRONOUSLY
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            console.log('FetchCoder FileTracker: Starting to track workspace:', workspaceFolder.uri.fsPath);
            const startTime = Date.now();
            this.snapshotWorkspace(workspaceFolder.uri.fsPath);
            const elapsed = Date.now() - startTime;
            console.log('FetchCoder FileTracker: Took snapshots of', this.fileSnapshots.size, 'files in', elapsed, 'ms');
        }
    }

    private snapshotWorkspace(dirPath: string) {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                // Skip common ignore patterns
                if (this.shouldIgnore(entry.name)) {
                    continue;
                }
                
                if (entry.isDirectory()) {
                    this.snapshotWorkspace(fullPath);
                } else if (entry.isFile()) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        this.fileSnapshots.set(fullPath, content);
                    } catch (e) {
                        // Skip binary files or files we can't read
                    }
                }
            }
        } catch (error) {
            // Directory not accessible
        }
    }

    private shouldIgnore(name: string): boolean {
        const ignorePatterns = [
            'node_modules',
            '.git',
            '.vscode',
            'out',
            'dist',
            'build',
            '.DS_Store',
            '__pycache__',
            '.pytest_cache',
            'venv',
            'env'
        ];
        return ignorePatterns.includes(name);
    }

    private async handleFileCreate(uri: vscode.Uri) {
        if (this.shouldIgnore(path.basename(uri.fsPath))) {
            return;
        }

        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const newContent = Buffer.from(content).toString('utf8');
            const relativePath = vscode.workspace.asRelativePath(uri);

            this.changes.push({
                filePath: relativePath,
                operation: 'created',
                timestamp: Date.now(),
                newContent: newContent
            });
        } catch (error) {
            // Ignore binary files
        }
    }

    private async handleFileChange(uri: vscode.Uri) {
        if (this.shouldIgnore(path.basename(uri.fsPath))) {
            return;
        }

        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const newContent = Buffer.from(content).toString('utf8');
            const oldContent = this.fileSnapshots.get(uri.fsPath);
            const relativePath = vscode.workspace.asRelativePath(uri);

            // Only track if we have a snapshot (meaning it changed after tracking started)
            if (oldContent !== undefined && oldContent !== newContent) {
                this.changes.push({
                    filePath: relativePath,
                    operation: 'modified',
                    timestamp: Date.now(),
                    oldContent: oldContent,
                    newContent: newContent
                });
                
                // Update snapshot
                this.fileSnapshots.set(uri.fsPath, newContent);
            }
        } catch (error) {
            // Ignore binary files
        }
    }

    private handleFileDelete(uri: vscode.Uri) {
        if (this.shouldIgnore(path.basename(uri.fsPath))) {
            return;
        }

        const relativePath = vscode.workspace.asRelativePath(uri);
        const oldContent = this.fileSnapshots.get(uri.fsPath);

        this.changes.push({
            filePath: relativePath,
            operation: 'deleted',
            timestamp: Date.now(),
            oldContent: oldContent
        });

        this.fileSnapshots.delete(uri.fsPath);
    }

    public async scanForChanges(): Promise<FileChange[]> {
        // Actively scan workspace and compare with snapshots
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            console.log('FetchCoder FileTracker: No workspace folder');
            return this.changes;
        }

        console.log('FetchCoder FileTracker: Scanning workspace for changes...');
        console.log('FetchCoder FileTracker: Have', this.fileSnapshots.size, 'file snapshots');
        await this.scanDirectory(workspaceFolder.uri.fsPath);
        console.log('FetchCoder FileTracker: Scan complete, found', this.changes.length, 'changes');
        return [...this.changes];
    }

    private async scanDirectory(dirPath: string) {
        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                
                if (this.shouldIgnore(entry.name)) {
                    continue;
                }
                
                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath);
                } else if (entry.isFile()) {
                    await this.checkFileChange(fullPath);
                }
            }
        } catch (error) {
            // Directory not accessible
        }
    }

    private async checkFileChange(filePath: string) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const oldContent = this.fileSnapshots.get(filePath);
            
            if (path.basename(filePath) === 'hello.py') {
                console.log('=== Checking hello.py ===');
                console.log('  Snapshot exists:', oldContent !== undefined);
                if (oldContent !== undefined) {
                    console.log('  Snapshot length:', oldContent.length);
                    console.log('  Current length:', content.length);
                    console.log('  Are equal:', oldContent === content);
                    console.log('  Snapshot preview:', oldContent.substring(0, 100));
                    console.log('  Current preview:', content.substring(0, 100));
                }
            }
            
            if (oldContent === undefined) {
                // New file created after tracking started
                const relativePath = vscode.workspace.asRelativePath(filePath);
                const existingChange = this.changes.find(
                    c => c.filePath === relativePath && c.operation === 'created'
                );
                
                if (!existingChange) {
                    console.log('  -> Marking as CREATED');
                    this.changes.push({
                        filePath: relativePath,
                        operation: 'created',
                        timestamp: Date.now(),
                        newContent: content
                    });
                }
            } else if (oldContent !== content) {
                // File was modified
                const relativePath = vscode.workspace.asRelativePath(filePath);
                const existingChange = this.changes.find(
                    c => c.filePath === relativePath && c.operation === 'modified'
                );
                
                if (!existingChange) {
                    console.log('  -> Marking as MODIFIED');
                    console.log('     Old length:', oldContent.length, 'New length:', content.length);
                    this.changes.push({
                        filePath: relativePath,
                        operation: 'modified',
                        timestamp: Date.now(),
                        oldContent: oldContent,
                        newContent: content
                    });
                }
            } else {
                console.log('  -> No change detected');
            }
        } catch (error) {
            console.log('Error checking file:', error);
        }
    }

    public getChanges(): FileChange[] {
        return [...this.changes];
    }

    public clearChanges() {
        this.changes = [];
        this.fileSnapshots.clear();
    }

    public dispose() {
        this.watcher?.dispose();
    }
}


