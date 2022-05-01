// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import PreviewerPanel from "./previewer-panel";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('ASCII Art Previewer activated.');

	let disposable = vscode.commands.registerCommand('ascii-art-previewer.show', () => {
		PreviewerPanel.createOrShow(context.extensionUri);
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
