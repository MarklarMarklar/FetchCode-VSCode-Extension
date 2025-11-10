import * as vscode from 'vscode';
import { FetchCoderConfig } from '../config';

export class SettingsPanel {
    private static currentPanel: SettingsPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.One;

        if (SettingsPanel.currentPanel) {
            SettingsPanel.currentPanel.panel.reveal(column);
            return SettingsPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            'fetchcoderSettings',
            'FetchCoder Settings',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
        return SettingsPanel.currentPanel;
    }

    public static dispose() {
        SettingsPanel.currentPanel?.disposePanel();
        SettingsPanel.currentPanel = undefined;
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
                        await this.sendCurrentSettings();
                        break;
                    case 'saveSettings':
                        await this.handleSaveSettings(message.settings);
                        break;
                    case 'testConnection':
                        await this.handleTestConnection();
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    private async sendCurrentSettings() {
        const config = FetchCoderConfig.getAll();
        this.panel.webview.postMessage({
            type: 'settingsLoaded',
            settings: {
                apiUrl: config.apiUrl,
                asi1ApiKey: config.asi1ApiKey,
                agentverseApiKey: config.agentverseApiKey,
                defaultAgent: config.defaultAgent,
                streamResponses: config.streamResponses,
                enableInlineActions: config.enableInlineActions,
                autoContextFiles: config.autoContextFiles
            }
        });
    }

    private async handleSaveSettings(settings: any) {
        try {
            // Save each setting
            await FetchCoderConfig.set('apiUrl', settings.apiUrl, true);
            await FetchCoderConfig.set('asi1ApiKey', settings.asi1ApiKey, true);
            await FetchCoderConfig.set('agentverseApiKey', settings.agentverseApiKey, true);
            await FetchCoderConfig.set('defaultAgent', settings.defaultAgent, true);
            await FetchCoderConfig.set('streamResponses', settings.streamResponses, true);
            await FetchCoderConfig.set('enableInlineActions', settings.enableInlineActions, true);
            await FetchCoderConfig.set('autoContextFiles', settings.autoContextFiles, true);

            this.panel.webview.postMessage({
                type: 'saveSuccess',
                message: 'Settings saved successfully!'
            });

            vscode.window.showInformationMessage('FetchCoder settings saved successfully!');
        } catch (error: any) {
            this.panel.webview.postMessage({
                type: 'saveError',
                error: error.message || 'Failed to save settings'
            });
            vscode.window.showErrorMessage(`Failed to save settings: ${error.message}`);
        }
    }

    private async handleTestConnection() {
        try {
            const { getFetchCoderClient } = await import('../api/fetchcoderClient');
            const client = getFetchCoderClient();
            const isHealthy = await client.checkHealth();

            if (isHealthy) {
                this.panel.webview.postMessage({
                    type: 'connectionSuccess',
                    message: 'Successfully connected to FetchCoder API!'
                });
                vscode.window.showInformationMessage('✅ Connection successful!');
            } else {
                this.panel.webview.postMessage({
                    type: 'connectionError',
                    error: 'Could not connect to API server'
                });
                vscode.window.showWarningMessage('⚠️ Could not connect to API server. Make sure it is running.');
            }
        } catch (error: any) {
            this.panel.webview.postMessage({
                type: 'connectionError',
                error: error.message || 'Connection test failed'
            });
            vscode.window.showErrorMessage(`Connection test failed: ${error.message}`);
        }
    }

    private disposePanel() {
        SettingsPanel.currentPanel = undefined;
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
            vscode.Uri.joinPath(this.extensionUri, 'media', 'settings.js')
        );
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'settings.css')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src ${this.panel.webview.cspSource};">
    <link href="${styleUri}" rel="stylesheet">
    <title>FetchCoder Settings</title>
</head>
<body>
    <div class="settings-container">
        <div class="settings-header">
            <h1>⚙️ FetchCoder Settings</h1>
            <p>Configure your API keys and preferences</p>
        </div>
        
        <div class="settings-content">
            <div class="settings-section">
                <h2>🔑 API Keys</h2>
                <div class="settings-description">
                    Configure your API keys for Fetch.ai and Agentverse. These keys are stored securely in your VS Code settings.
                </div>
                
                <div class="form-group">
                    <label for="asi1ApiKey">ASI1 API Key</label>
                    <input type="password" id="asi1ApiKey" class="input-field" placeholder="Enter your ASI1 API key">
                    <span class="input-hint">Your ASI1 API key (set as ASI1_API_KEY)</span>
                </div>
                
                <div class="form-group">
                    <label for="agentverseApiKey">Agentverse API Key</label>
                    <input type="password" id="agentverseApiKey" class="input-field" placeholder="Enter your Agentverse API key">
                    <span class="input-hint">Your Agentverse API key (set as AGENTVERSE_API_KEY)</span>
                </div>
            </div>

            <div class="settings-section">
                <h2>🌐 API Server</h2>
                
                <div class="form-group">
                    <label for="apiUrl">API Server URL</label>
                    <input type="text" id="apiUrl" class="input-field" placeholder="http://localhost:3000">
                    <span class="input-hint">The URL of your FetchCoder API server</span>
                </div>
                
                <button id="testConnectionBtn" class="btn-secondary">Test Connection</button>
            </div>

            <div class="settings-section">
                <h2>🤖 Agent Settings</h2>
                
                <div class="form-group">
                    <label for="defaultAgent">Default Agent</label>
                    <select id="defaultAgent" class="input-field">
                        <option value="general">General</option>
                        <option value="build">Build</option>
                        <option value="plan">Plan</option>
                        <option value="agentverse">Agentverse</option>
                    </select>
                    <span class="input-hint">The default agent to use for new conversations</span>
                </div>
                
                <div class="form-group">
                    <label for="autoContextFiles">Auto Context Files</label>
                    <input type="number" id="autoContextFiles" class="input-field" min="0" max="20" value="5">
                    <span class="input-hint">Number of relevant files to include automatically</span>
                </div>
            </div>

            <div class="settings-section">
                <h2>⚡ Features</h2>
                
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="streamResponses" checked>
                        <span>Enable streaming responses</span>
                    </label>
                    <span class="input-hint">Show responses in real-time as they're generated</span>
                </div>
                
                <div class="form-group checkbox-group">
                    <label>
                        <input type="checkbox" id="enableInlineActions" checked>
                        <span>Enable inline code actions</span>
                    </label>
                    <span class="input-hint">Show quick fix and refactoring actions in the editor</span>
                </div>
            </div>
        </div>
        
        <div class="settings-footer">
            <div id="statusMessage" class="status-message"></div>
            <button id="saveBtn" class="btn-primary">Save Settings</button>
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}


