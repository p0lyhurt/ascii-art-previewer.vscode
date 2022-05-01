import * as vscode from "vscode";
import { rgb2css, parseASCIIArt } from "./utilities";

export default class PreviewerPanel {
  public static currentPanel: PreviewerPanel | undefined;

  public static readonly viewType = "asciiArtPreviewer";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static webviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
      enableScripts: false,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, "previewer")]
    };
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    if (this.currentPanel) {
      this.currentPanel._panel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      this.viewType,
      "ASCII Art Previewer",
      {viewColumn: vscode.ViewColumn.Beside, preserveFocus: true},
      this.webviewOptions(extensionUri)
    );

    this.currentPanel = new this(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    panel.onDidDispose(_e => {
      this.dispose();
    }, null, this._disposables);

    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) { this._update(); }
    }, null, this._disposables);

    vscode.workspace.onDidChangeTextDocument(_e => {
      this._update();
    }, null, this._disposables);
  }

	public dispose() {
		PreviewerPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

  private _update() {
    if (this._panel.visible) {
      this._panel.webview.html = this._generatePreviewHtml();
    }
  }

  private _generatePreviewHtml() {
    const webview = this._panel.webview;
    const stylePath = vscode.Uri.joinPath(this._extensionUri, 'previewer', 'main.css');
    const activeDocument = vscode.window.activeTextEditor?.document;

    var innerHtml;
    if (activeDocument) {
      innerHtml = this._generateAsciiPreview(activeDocument.getText()) ||
        '<div class="preview-error">Open a well-structured ASCII to preview it as MIRC ASCII art.</div>';
    } else {
      innerHtml = '<div class="preview-error">Open a file to preview it as MIRC ASCII art.</div>';
    }

		return `
      <!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${webview.asWebviewUri(stylePath)}" rel="stylesheet">
				<title>ASCII Art Previewer</title>
			</head>
			<body>
        ${innerHtml}
			</body>
			</html>`;
  }

  private _generateAsciiPreview(ascii: string) {
    var html = "";

    const result = parseASCIIArt(ascii, (text, textColor, bgColor) => {
      html += `<span style="background-color: ${rgb2css(bgColor)}; color: ${rgb2css(textColor)};">${text}</span>`;
    }, () => html += "<br />");

    if (result) {
      return `<div class="ascii-preview">${html}</div>`;
    }
  }
}
