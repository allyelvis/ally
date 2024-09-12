"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaPlayer = exports.PlayableMediaType = void 0;
const vscode = require("vscode");
const globals_1 = require("./globals");
const templateEngine_1 = require("./templateEngine");
// eslint-disable-next-line @typescript-eslint/naming-convention
exports.PlayableMediaType = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Video: 0,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Image: 1,
};
class MediaPlayer {
    constructor(extensionUri, disposables) {
        this.extensionUri = extensionUri;
        this.disposables = disposables;
        this.manimIconsPath = {
            dark: vscode.Uri.joinPath(this.extensionUri, "assets/images/dark_logo.png"),
            light: vscode.Uri.joinPath(this.extensionUri, "assets/images/light_logo.png"),
        };
    }
    parseProgressStyle(colorStr) {
        if (!colorStr) {
            colorStr = globals_1.BASE_PROGRESS_BAR_COLOR;
        }
        else if (colorStr.includes(";") ||
            colorStr.includes('"') ||
            colorStr.includes("'")) {
            // prevents html injections
            colorStr = globals_1.BASE_PROGRESS_BAR_COLOR;
        }
        else if (!colorStr.startsWith("#")) {
            colorStr = `var(--vscode-${colorStr.replace(/\./g, "-")});`;
        }
        return `style="background-color: ${colorStr}"`;
    }
    asCacheBreakingWebviewUri(webveiw, uri) {
        return `${webveiw.asWebviewUri(uri).toString()}?t=${new Date().getTime()}`;
    }
    async playMedia(mediaUri, config, mediaType) {
        if (this.recentMediaPanel) {
            const resource = this.asCacheBreakingWebviewUri(this.recentMediaPanel.webview, mediaUri);
            return this.recentMediaPanel.webview.postMessage({
                command: "reload",
                mediaType: mediaType,
                resource: resource,
                outputFile: mediaUri.fsPath,
                sourceFile: config.srcPath,
                moduleName: config.sceneName,
            });
        }
        const panel = vscode.window.createWebviewPanel(mediaUri.path, "Manim Sideview", {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
        }, {
            localResourceRoots: [
                vscode.Uri.joinPath(vscode.Uri.file(config.document.uri.fsPath), "../"),
                this.extensionUri,
            ],
            enableScripts: true,
        });
        const engine = new templateEngine_1.TemplateEngine(panel.webview, (0, globals_1.getWebviewResource)(this.extensionUri, "player"), "player", this.extensionUri);
        // the property key to set the resource url to
        const srcReplacementKey = mediaType === exports.PlayableMediaType.Video ? "videoDir" : "imageDir";
        // the property variable key from the HTML document to hide
        const hideKey = mediaType === exports.PlayableMediaType.Video
            ? "imageHideState"
            : "videoHideState";
        panel.iconPath = this.manimIconsPath;
        panel.webview.html = await engine.render({
            [srcReplacementKey]: this.asCacheBreakingWebviewUri(panel.webview, mediaUri),
            [hideKey]: "hidden",
            outputFile: mediaUri.fsPath,
            sourceFile: config.srcPath,
            moduleName: config.sceneName,
            previewShowProgressOnIdle: (0, globals_1.getUserConfiguration)("previewShowProgressOnIdle")
                ? ""
                : " hidden-controls",
            previewProgressStyle: this.parseProgressStyle((0, globals_1.getUserConfiguration)("previewProgressColor")),
            loop: (0, globals_1.getUserConfiguration)("previewLooping") ? "loop" : "",
            autoplay: (0, globals_1.getUserConfiguration)("previewAutoPlay") ? "autoplay" : "",
        });
        panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                // Executes a manim-sideview command and then executes run command
                case "executeSelfCommand":
                    globals_1.Log.info(`Executing command "manim-sideview.${message.name}" as requested by webview.`);
                    vscode.commands.executeCommand(`manim-sideview.${message.name}`, ...message.args);
                    break;
                case "errorMessage":
                    vscode.window.showErrorMessage(globals_1.Log.error(message.text));
                    break;
            }
        }, undefined, this.disposables);
        panel.onDidDispose(() => {
            if (panel === this.recentMediaPanel) {
                this.recentMediaPanel = undefined;
            }
        }, undefined, this.disposables);
        this.recentMediaPanel = panel;
    }
}
exports.MediaPlayer = MediaPlayer;
//# sourceMappingURL=player.js.map