import * as vscode from "vscode";
import * as fs from "fs";
import { rgb2css, parseASCIIArt } from "./utilities";

export default class PreviewerPanel {
  public static currentPanel: PreviewerPanel | undefined;

  public static readonly viewType = "asciiArtPreviewer";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static webviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
    return {
      enableScripts: true,
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

    panel.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case "writeFile":
          this._writePNG(message.base64, message.filename);
          break;
      }
    });

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

  public get defaultScale() : number {
    return this._getDefaultValue("defaultScale");
  }

  public get defaultBackgroundColor() : string {
    return this._getDefaultValue("defaultBackgroundColor");
  }

  public get defaultCharacterMode() : string {
    return this._getDefaultValue("defaultCharacterMode");
  }

  public get defaultDirectory() : string {
    return this._getDefaultValue("defaultDirectory");
  }

  public get defaultName() : string {
    const document = vscode.window.activeTextEditor?.document;

    if (document) {
      return this._pngFilename(document.fileName) || "";
    } else {
      return "";
    }
  }

  private _getDefaultValue(key : string) {
    return vscode.workspace.getConfiguration("ascii-art-previewer")[key];
  }

  private _pngFilename(filename: string) {
    return filename.split(/[\/\\]/).pop()?.replace(/\.[a-zA-Z0-9]+$/, "");
  }

  private _update() {
    if (this._panel.visible) {
      this._panel.webview.html = this._generatePreviewHtml();
    }
  }

  private _writePNG(base64: string, filename : string) {
    const openInCode = "Open in Code",
          openInOs = "Open in OS",
          openInFileManager = "Show in File Manager",
          fileUri = vscode.Uri.file(filename),
          buffer = Buffer.from(base64, 'base64');

    fs.writeFile(filename, buffer, (err) => {
      if (err) {
        vscode.window.showErrorMessage('PNG could not be saved to disk!', {detail: err.message});
      } else {
        vscode.window
          .showInformationMessage('PNG successfully saved to disk!', openInCode, openInOs, openInFileManager)
          .then((value) => {
            switch (value) {
              case openInCode:
                vscode.commands.executeCommand("vscode.open", fileUri);
                break;
              case openInOs:
                vscode.env.openExternal(fileUri);
                break;
              case openInFileManager:
                vscode.commands.executeCommand("revealFileInOS", fileUri);
                break;
              default:
                break;
            }
          });
      }
    });
  }

  private _generatePreviewHtml() : string {
    const webview = this._panel.webview;
    const stylePath = vscode.Uri.joinPath(this._extensionUri, 'previewer', 'main.css');
    const converterScriptPath = vscode.Uri.joinPath(this._extensionUri, "previewer", "main.js");
    const activeDocument = vscode.window.activeTextEditor?.document;

    var innerHtml, ascii;
    if (activeDocument) {
      ascii = activeDocument.getText();
      innerHtml = this._generateAsciiPreview(ascii);

      if (innerHtml) {
        innerHtml += this._generateAsciiConversionForm();
      } else {
        innerHtml = '<div class="preview-error">Open a well-structured ASCII to preview it as MIRC ASCII art.</div>';
      }
    } else {
      innerHtml = '<div class="preview-error">Open a file to preview it as MIRC ASCII art.</div>';
    }

		return `
      <!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; script-src 'unsafe-inline' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${webview.asWebviewUri(stylePath)}" rel="stylesheet">
				<title>ASCII Art Previewer</title>
			</head>
			<body>
        ${innerHtml}

        <script type="module" src="${webview.asWebviewUri(converterScriptPath)}"></script>

        <script>
          window.CURRENT_ASCII = \`${ascii}\`;
        </script>
			</body>
			</html>`;
  }

  private _generateAsciiConversionForm() : string {
    return `
      <div class="ascii-conversion-form">
        <fieldset>
          <legend>Convert to PNG</legend>

          <form id="ascii-conversion-form">
            <label for="ascii-art-image-converter-scale">Scale:</label>
            <input type="number" value="${this.defaultScale}" class="ascii-art-image-converter-scale input-number" name="scale" />

            <label for="ascii-art-image-converter-bgcolor">Background:</label>
            <input type="color" value="${this.defaultBackgroundColor}" class="ascii-art-image-converter-bgcolor" name="bgcolor" />

            <div>
              <p>Character mode:</p>

              <div>
                <input type="radio" class="ascii-art-image-converter-charmode input-radio" name="charmode" value="full" ${this.defaultCharacterMode === 'full' ? 'checked' : ''}/>
                <label for="ascii-art-image-converter-charmode-full">Full</label>
              </div>

              <div>
                <input type="radio" class="ascii-art-image-converter-charmode input-radio" name="charmode" value="minus-half" ${this.defaultCharacterMode === 'minus-half' ? 'checked' : ''} />
                <label for="ascii-art-image-converter-charmode-minus-half">Minus-half</label>
              </div>
            </div>

            <input type="text" name="dest-folder" value="${this.defaultDirectory}"></input>
            <input type="text" name="dest-file" value="${this.defaultName}"></input>
          </form>

          <br />

          <button id="ascii-convert-button">Convert</button>
        </fieldset>
      </div>
    `;
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
