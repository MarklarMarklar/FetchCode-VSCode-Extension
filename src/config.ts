import * as vscode from 'vscode';

export interface FetchCoderConfiguration {
    apiUrl: string;
    defaultAgent: 'general' | 'build' | 'plan' | 'agentverse';
    autoContextFiles: number;
    enableInlineActions: boolean;
    streamResponses: boolean;
    asi1ApiKey: string;
    agentverseApiKey: string;
}

export class FetchCoderConfig {
    private static config: vscode.WorkspaceConfiguration;

    static initialize() {
        this.config = vscode.workspace.getConfiguration('fetchcoder');
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('fetchcoder')) {
                this.config = vscode.workspace.getConfiguration('fetchcoder');
            }
        });
    }

    static get<K extends keyof FetchCoderConfiguration>(key: K): FetchCoderConfiguration[K] {
        return this.config.get<FetchCoderConfiguration[K]>(key)!;
    }

    static getAll(): FetchCoderConfiguration {
        return {
            apiUrl: this.get('apiUrl'),
            defaultAgent: this.get('defaultAgent'),
            autoContextFiles: this.get('autoContextFiles'),
            enableInlineActions: this.get('enableInlineActions'),
            streamResponses: this.get('streamResponses'),
            asi1ApiKey: this.get('asi1ApiKey'),
            agentverseApiKey: this.get('agentverseApiKey')
        };
    }

    static async set<K extends keyof FetchCoderConfiguration>(
        key: K,
        value: FetchCoderConfiguration[K],
        global: boolean = false
    ): Promise<void> {
        await this.config.update(key, value, global ? vscode.ConfigurationTarget.Global : vscode.ConfigurationTarget.Workspace);
    }
}

