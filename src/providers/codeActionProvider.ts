import * as vscode from 'vscode';
import { getFetchCoderClient } from '../api/fetchcoderClient';

export class FetchCoderCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.Refactor,
        vscode.CodeActionKind.RefactorExtract,
        vscode.CodeActionKind.RefactorRewrite
    ];

    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[] | undefined> {
        const actions: vscode.CodeAction[] = [];

        // Only provide actions if there's a selection or diagnostics
        if (range.isEmpty && context.diagnostics.length === 0) {
            return actions;
        }

        // Add "Ask FetchCoder" action
        const askAction = this.createAskFetchCoderAction(document, range);
        actions.push(askAction);

        // Add "Explain Code" action for selections
        if (!range.isEmpty) {
            const explainAction = this.createExplainAction(document, range);
            actions.push(explainAction);

            const refactorAction = this.createRefactorAction(document, range);
            actions.push(refactorAction);
        }

        // Add "Fix with FetchCoder" for diagnostics
        if (context.diagnostics.length > 0) {
            const fixAction = this.createFixAction(document, range, context.diagnostics);
            actions.push(fixAction);
        }

        return actions;
    }

    private createAskFetchCoderAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction(
            '💬 Ask FetchCoder',
            vscode.CodeActionKind.Empty
        );
        action.command = {
            command: 'fetchcoder.sendSelection',
            title: 'Ask FetchCoder',
            arguments: [document, range]
        };
        return action;
    }

    private createExplainAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction(
            '📖 Explain with FetchCoder',
            vscode.CodeActionKind.Empty
        );
        action.command = {
            command: 'fetchcoder.explain',
            title: 'Explain Code',
            arguments: [document, range]
        };
        return action;
    }

    private createRefactorAction(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction {
        const action = new vscode.CodeAction(
            '🔧 Refactor with FetchCoder',
            vscode.CodeActionKind.Refactor
        );
        action.command = {
            command: 'fetchcoder.refactor',
            title: 'Refactor Code',
            arguments: [document, range]
        };
        return action;
    }

    private createFixAction(
        document: vscode.TextDocument,
        range: vscode.Range,
        diagnostics: readonly vscode.Diagnostic[]
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            '🤖 Fix with FetchCoder',
            vscode.CodeActionKind.QuickFix
        );
        action.command = {
            command: 'fetchcoder.fix',
            title: 'Fix Code',
            arguments: [document, range, diagnostics]
        };
        action.diagnostics = [...diagnostics];
        action.isPreferred = false;
        return action;
    }
}

