"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const path = require("path");
const vscode = require("vscode");
const globals_1 = require("./globals");
const sideview_1 = require("./sideview");
async function activate(context) {
    globals_1.Log.info("Activating extension.");
    await (0, globals_1.loadGlobals)(context);
    const sideview = new sideview_1.ManimSideview(context);
    context.subscriptions.push(vscode.commands.registerCommand("manim-sideview.run", (...args) => sideview.run(...args)), vscode.commands.registerCommand("manim-sideview.removeAllJobs", () => sideview.removeAllJobs()), vscode.commands.registerCommand("manim-sideview.stop", () => sideview.stopProcess()), vscode.commands.registerCommand("manim-sideview.renderNewScene", (...args) => sideview.renderNewScene(...args)), vscode.commands.registerCommand("manim-sideview.removeCurrentJob", () => sideview.removeJob()), vscode.commands.registerCommand("manim-sideview.showMobjectGallery", () => sideview.showMobjectGallery()), vscode.commands.registerCommand("manim-sideview.syncMobjectGallery", () => sideview.syncMobjectGallery()), vscode.commands.registerCommand("manim-sideview.syncManimConfig", () => sideview.syncFallbackManimConfig()), vscode.commands.registerCommand("manim-sideview.showOutputChannel", () => globals_1.LOGGER.show(true)), vscode.commands.registerCommand("manim-sideview.showExtensionManimConfig", () => vscode.workspace
        .openTextDocument(path.join(context.extensionPath, "./assets/local/manim.cfg.json"))
        .then((doc) => vscode.window.showTextDocument(doc))), vscode.commands.registerCommand("manim-sideview.showManimExecTerminal", () => {
        const cli = vscode.window.terminals.find((t) => t.name === globals_1.DefaultTerminalName);
        if (cli) {
            cli.show();
        }
        else {
            vscode.window.showErrorMessage("Manim Sideview: There is no internal execution terminal open.");
        }
    }));
    vscode.workspace.onDidSaveTextDocument((e) => {
        if ((0, globals_1.getUserConfiguration)("runOnSave")) {
            vscode.commands.executeCommand("manim-sideview.run", e.fileName, true);
        }
    }, null, context.subscriptions);
    vscode.window.onDidChangeActiveTextEditor((e) => {
        sideview.refreshJobStatus();
        sideview.auditTextEditorChange(e);
    }, null, context.subscriptions);
    globals_1.Log.info("Activated extension.");
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map