"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gallery = void 0;
const vscode = require("vscode");
const globals_1 = require("./globals");
const fs = require("fs");
const fs_1 = require("fs");
const path = require("path");
const yaml = require("yaml");
const axios_1 = require("axios");
const templateEngine_1 = require("./templateEngine");
const GITHUB_ROOT_DIR = "https://raw.githubusercontent.com/kolibril13/mobject-gallery/main/";
// gallery synchronization files
const GITHUB_ENTRY_FILE = "https://raw.githubusercontent.com/kolibril13/mobject-gallery/main/html_configuration.yaml";
class Gallery {
    constructor(extensionUri, disposables) {
        this.extensionUri = extensionUri;
        this.disposables = disposables;
        this.mobjectsPath = vscode.Uri.joinPath(this.extensionUri, "assets/mobjects");
        this.loads = (0, globals_1.getWebviewResource)(this.extensionUri, "gallery");
        this.manimIconsPath = {
            dark: vscode.Uri.joinPath(this.extensionUri, "assets/images/dark_logo.png"),
            light: vscode.Uri.joinPath(this.extensionUri, "assets/images/light_logo.png"),
        };
    }
    setLastActiveEditor(editor) {
        this.lastActiveEditor = editor;
    }
    async show() {
        this.panel = vscode.window.createWebviewPanel("mobject-gallery", "Mobject Gallery", {
            viewColumn: vscode.ViewColumn.Beside,
            preserveFocus: true,
        }, {
            enableScripts: true,
            enableForms: false,
        });
        const loadable = globals_1.PATHS.mobjGalleryParameters;
        const imageMapping = JSON.parse((await vscode.workspace.fs.readFile(loadable)).toString());
        var images = "";
        const panel = this.panel;
        Object.keys(imageMapping).forEach((title) => {
            images += `<h2>${title}</h2>`;
            imageMapping[title].forEach((imgMap) => {
                const code = imgMap.code.replace(/"/g, "'");
                images += `<img class="image-button" src=${panel.webview.asWebviewUri(vscode.Uri.joinPath(this.mobjectsPath, imgMap.image_path))} alt="${code}">`;
            });
        });
        const engine = new templateEngine_1.TemplateEngine(this.panel.webview, this.loads, "gallery", this.extensionUri);
        this.panel.iconPath = this.manimIconsPath;
        this.panel.webview.html = await engine.render({
            mobjects: images,
            version: (await vscode.workspace.fs.readFile(globals_1.PATHS.mobjVersion)).toString(),
        });
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, undefined, this.disposables);
        this.panel.webview.onDidReceiveMessage((message) => {
            if (message.command === "update" ||
                message.command === "download-again") {
                return this.synchronize(message.command === "download-again");
            }
            else {
                this.insertCode(message.code);
            }
        }, undefined, this.disposables);
    }
    getPreviousEditor() {
        if (!vscode.window.activeTextEditor) {
            vscode.commands.executeCommand("workbench.action.focusPreviousGroup");
        }
        return vscode.window.activeTextEditor;
    }
    /**
     * Fix indentations into user configured settings.
     *
     * @param code
     * @param editor
     * @returns string
     */
    static adaptiveIndent(code, editor) {
        const before = editor.document.getText(new vscode.Range(new vscode.Position(editor.selection.active.line, 0), editor.selection.active));
        var tab = "\t";
        if (editor.options.insertSpaces && editor.options.tabSize) {
            if (typeof editor.options.tabSize === "string") {
                var tabSize = parseInt(editor.options.tabSize);
            }
            else {
                var tabSize = editor.options.tabSize;
            }
            tab = " ".repeat(tabSize);
        }
        if (!before.trim()) {
            const replacable = `\n${tab}`;
            code = code
                .replace(/\n    /g, replacable)
                .replace(/^\t/g, replacable)
                .replace(/\n/g, "\n" + before);
        }
        return code;
    }
    static getPreviousEditor() {
        if (!vscode.window.activeTextEditor) {
            vscode.commands.executeCommand("workbench.action.focusPreviousGroup");
        }
        return vscode.window.activeTextEditor;
    }
    async insertCode(code) {
        const lastEditor = this.lastActiveEditor
            ? this.lastActiveEditor
            : Gallery.getPreviousEditor();
        if (!lastEditor) {
            return vscode.window.showErrorMessage("Manim Sideview: You need to place a cursor somewhere to insert the code.");
        }
        code = Gallery.adaptiveIndent(code, lastEditor);
        lastEditor
            .edit((e) => {
            e.insert(lastEditor.selection.active, code);
        })
            .then(() => {
            vscode.commands
                .executeCommand("workbench.action.focusPreviousGroup")
                .then(() => lastEditor.revealRange(new vscode.Range(lastEditor.selection.active, lastEditor.selection.active)));
        });
    }
    async synchronize(forceDownload) {
        const localVersion = (await vscode.workspace.fs.readFile(globals_1.PATHS.mobjVersion)).toString();
        const root = globals_1.PATHS.mobjImgs.fsPath;
        var { data } = await axios_1.default.get(GITHUB_ENTRY_FILE);
        data = yaml.parse(data); // Parse yaml
        let newVersion = data["user_content_version"];
        // Related to https://github.com/kolibril13/mobject-gallery/issues/3
        const galleryParameters = data["gallery_parameters_path"];
        if (!forceDownload) {
            if (!newVersion) {
                vscode.window.showErrorMessage("Manim Sideview: Version descriptor in remote location missing. Please try again later.");
                return;
            }
            if (newVersion === localVersion) {
                vscode.window.showInformationMessage("Manim Sideview: You're already up to date!");
                return;
            }
        }
        else if (!newVersion) {
            newVersion = localVersion;
        }
        vscode.window.showInformationMessage("Manim Sideview: Please wait a moment while we pull remote assets...");
        var { data } = await axios_1.default.get(GITHUB_ROOT_DIR + galleryParameters);
        await fs_1.promises.writeFile(globals_1.PATHS.mobjGalleryParameters.fsPath, JSON.stringify(data));
        const objectLists = Object.values(data);
        for (const [index, entry] of objectLists.entries()) {
            const allObjects = entry;
            for (const mObj of allObjects) {
                let imagePath = mObj.image_path;
                var { data } = await (0, axios_1.default)({
                    method: "get",
                    url: GITHUB_ROOT_DIR + imagePath,
                    responseType: "stream",
                });
                data.pipe(fs.createWriteStream(path.join(root, imagePath)));
                if (index >= objectLists.length - 1) {
                    await fs_1.promises.writeFile(globals_1.PATHS.mobjVersion.fsPath, newVersion);
                    vscode.window.showInformationMessage(`Manim Sideview: Successfully downloaded all assets to version ${newVersion}! Please reload the webview.`);
                }
            }
        }
    }
}
exports.Gallery = Gallery;
//# sourceMappingURL=gallery.js.map