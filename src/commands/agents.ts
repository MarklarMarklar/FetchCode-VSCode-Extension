import * as vscode from 'vscode';
import { getFetchCoderClient } from '../api/fetchcoderClient';
import { StatusBarManager } from '../views/statusBar';

const AGENTS = [
    { label: 'General', value: 'general', description: 'Multi-step tasks and research' },
    { label: 'Build', value: 'build', description: 'Compilation and dependency management' },
    { label: 'Plan', value: 'plan', description: 'Architecture design and planning' },
    { label: 'Agentverse', value: 'agentverse', description: 'Production-ready Fetch.ai agents' }
];

export function registerAgentCommands(
    context: vscode.ExtensionContext,
    statusBar: StatusBarManager
) {
    // Switch Agent command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.switchAgent', async () => {
            const selected = await vscode.window.showQuickPick(AGENTS, {
                placeHolder: 'Select an agent',
                title: 'FetchCoder Agent'
            });

            if (selected) {
                const client = getFetchCoderClient();
                client.setAgent(selected.value);
                statusBar.setAgent(selected.value);
                
                vscode.window.showInformationMessage(
                    `Switched to ${selected.label} agent`
                );
            }
        })
    );

    // Agent-specific quick commands
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.useGeneralAgent', () => {
            const client = getFetchCoderClient();
            client.setAgent('general');
            statusBar.setAgent('general');
            vscode.window.showInformationMessage('Switched to General agent');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.useBuildAgent', () => {
            const client = getFetchCoderClient();
            client.setAgent('build');
            statusBar.setAgent('build');
            vscode.window.showInformationMessage('Switched to Build agent');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.usePlanAgent', () => {
            const client = getFetchCoderClient();
            client.setAgent('plan');
            statusBar.setAgent('plan');
            vscode.window.showInformationMessage('Switched to Plan agent');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.useAgentverseAgent', () => {
            const client = getFetchCoderClient();
            client.setAgent('agentverse');
            statusBar.setAgent('agentverse');
            vscode.window.showInformationMessage('Switched to Agentverse agent');
        })
    );
}

