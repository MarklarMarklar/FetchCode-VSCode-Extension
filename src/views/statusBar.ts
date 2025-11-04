import * as vscode from 'vscode';
import { getFetchCoderClient } from '../api/fetchcoderClient';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private currentAgent: string = 'general';
    private isConnected: boolean = false;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'fetchcoder.switchAgent';
        this.updateStatusBar();
        this.statusBarItem.show();
        
        // Check connection periodically
        this.checkConnection();
        setInterval(() => this.checkConnection(), 30000); // Every 30 seconds
    }

    private async checkConnection() {
        const client = getFetchCoderClient();
        this.isConnected = await client.checkHealth();
        this.updateStatusBar();
    }

    setAgent(agent: string) {
        this.currentAgent = agent;
        const client = getFetchCoderClient();
        client.setAgent(agent);
        this.updateStatusBar();
    }

    getAgent(): string {
        return this.currentAgent;
    }

    setConnected(connected: boolean) {
        this.isConnected = connected;
        this.updateStatusBar();
    }

    private updateStatusBar() {
        const icon = this.isConnected ? '$(check)' : '$(x)';
        const agentIcon = this.getAgentIcon(this.currentAgent);
        
        this.statusBarItem.text = `${icon} ${agentIcon} FetchCoder: ${this.capitalizeFirst(this.currentAgent)}`;
        this.statusBarItem.tooltip = this.isConnected 
            ? `FetchCoder connected (${this.currentAgent} agent)\nClick to switch agent`
            : 'FetchCoder disconnected\nPlease run "fetchcoder serve"';
        
        this.statusBarItem.backgroundColor = this.isConnected 
            ? undefined 
            : new vscode.ThemeColor('statusBarItem.errorBackground');
    }

    private getAgentIcon(agent: string): string {
        switch (agent) {
            case 'general': return '$(robot)';
            case 'build': return '$(tools)';
            case 'plan': return '$(lightbulb)';
            case 'agentverse': return '$(globe)';
            default: return '$(robot)';
        }
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showProgress(message: string) {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: message
            },
            async () => {
                // Progress shown until returned promise resolves
                return new Promise<void>(resolve => {
                    // This will be resolved by the caller
                    setTimeout(resolve, 100);
                });
            }
        );
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}

