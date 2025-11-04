import * as vscode from 'vscode';

interface ChatSession {
    id: string;
    timestamp: Date;
    title: string;
    messageCount: number;
}

export class HistoryViewProvider implements vscode.TreeDataProvider<HistoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HistoryItem | undefined | null | void> = new vscode.EventEmitter<HistoryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HistoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private sessions: ChatSession[] = [];

    constructor() {
        // Load sessions from workspace state if available
        this.loadSessions();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HistoryItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HistoryItem): Thenable<HistoryItem[]> {
        if (!element) {
            // Root level - show sessions
            return Promise.resolve(
                this.sessions.map(session => new HistoryItem(
                    session.title,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        command: 'fetchcoder.openSession',
                        title: 'Open Session',
                        arguments: [session.id]
                    }
                ))
            );
        }
        return Promise.resolve([]);
    }

    addSession(title: string): void {
        const session: ChatSession = {
            id: Date.now().toString(),
            timestamp: new Date(),
            title: title || `Session ${this.sessions.length + 1}`,
            messageCount: 0
        };
        this.sessions.unshift(session);
        this.saveSessions();
        this.refresh();
    }

    clearHistory(): void {
        this.sessions = [];
        this.saveSessions();
        this.refresh();
    }

    private loadSessions(): void {
        // In a real implementation, load from workspace state
        // For now, start with empty
        this.sessions = [];
    }

    private saveSessions(): void {
        // In a real implementation, save to workspace state
    }
}

class HistoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
        this.iconPath = new vscode.ThemeIcon('history');
    }

    contextValue = 'historyItem';
}

