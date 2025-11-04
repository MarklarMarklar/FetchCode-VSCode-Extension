import * as vscode from 'vscode';
import { ComposePanel } from '../views/composePanel';
import { StatusBarManager } from '../views/statusBar';

export function registerComposeCommands(
    context: vscode.ExtensionContext,
    statusBar: StatusBarManager
) {
    // Open Compose Mode command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.openCompose', () => {
            ComposePanel.createOrShow(context.extensionUri);
        })
    );

    // Compose with Context command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.composeWithContext', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                ComposePanel.createOrShow(context.extensionUri);
                return;
            }

            const document = editor.document;
            const selection = editor.selection;
            
            let prompt = '';
            if (!selection.isEmpty) {
                const selectedText = document.getText(selection);
                const language = document.languageId;
                prompt = `Modify this ${language} code:\n\n\`\`\`${language}\n${selectedText}\n\`\`\`\n\nChanges: `;
            }

            ComposePanel.createOrShow(context.extensionUri, prompt);
        })
    );

    // Refactor Code command
    context.subscriptions.push(
        vscode.commands.registerCommand('fetchcoder.refactor', async (document?: vscode.TextDocument, range?: vscode.Range) => {
            if (!document || !range) {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No text selected');
                    return;
                }
                document = editor.document;
                range = editor.selection;
            }

            const selectedText = document.getText(range);
            if (!selectedText) {
                vscode.window.showWarningMessage('No text selected');
                return;
            }

            const language = document.languageId;
            const fileName = vscode.workspace.asRelativePath(document.uri);
            
            const prompt = `Refactor this ${language} code from ${fileName}:\n\n\`\`\`${language}\n${selectedText}\n\`\`\`\n\nPlease improve the code quality, readability, and maintainability.`;
            
            ComposePanel.createOrShow(context.extensionUri, prompt);
        })
    );
}

