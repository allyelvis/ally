"use strict";
/* eslint-disable @typescript-eslint/naming-convention */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebviewResource = exports.insertContext = exports.getNonce = exports.BASE_PROGRESS_BAR_COLOR = exports.loadGlobals = exports.PACKAGE_JSON = exports.EXTENSION_VERSION = exports.updateFallbackManimCfg = exports.PATHS = exports.getUserConfiguration = exports.getImageOutputPath = exports.getVideoOutputPath = exports.getDefaultMainConfig = exports.FALLBACK_CONFIG = exports.Log = exports.DefaultTerminalName = exports.LOGGER = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
exports.LOGGER = vscode.window.createOutputChannel("Manim Sideview");
exports.DefaultTerminalName = "manim-exc";
class Log {
    static format(level, msg) {
        const date = new Date();
        return `[${date.toLocaleDateString()} ${date.getHours()}:${date.getMinutes()}] ${level.toUpperCase()}: ${msg}`;
    }
    static logs(level, msg, formatter = Log.format) {
        exports.LOGGER.appendLine(formatter(level, msg));
        return msg;
    }
    static info(msg) {
        return Log.logs("info", msg);
    }
    static warn(msg) {
        return Log.logs("warn", msg);
    }
    static error(msg) {
        return Log.logs("error", msg);
    }
}
exports.Log = Log;
// default configurations, these values are set through ./local/manim.cfg.json
exports.FALLBACK_CONFIG = {
    media_dir: "",
    video_dir: "",
    images_dir: "",
    quality: "",
    image_name: "",
    quality_map: {},
};
function getDefaultMainConfig() {
    return { ...exports.FALLBACK_CONFIG };
}
exports.getDefaultMainConfig = getDefaultMainConfig;
function getVideoOutputPath(config, extension = ".mp4") {
    if (!Object.keys(exports.FALLBACK_CONFIG.quality_map).includes(config.manimConfig.quality)) {
        vscode.window.showErrorMessage(Log.error(`Manim Sideview: The quality "${config.manimConfig.quality}" provided in the configuration is invalid.`));
        return;
    }
    let quality = exports.FALLBACK_CONFIG.quality_map[config.manimConfig.quality];
    return insertContext({
        "{quality}": quality,
        "{media_dir}": config.manimConfig.media_dir,
        "{module_name}": config.moduleName,
    }, path.join(config.manimConfig.video_dir, `${config.sceneName}${extension}`));
}
exports.getVideoOutputPath = getVideoOutputPath;
/**
 * @param config running config that provides the output path
 * @param loggedImageName logged name of the image file
 * @param extension extension of the image file
 * @returns
 */
function getImageOutputPath(config, loggedImageName, extension = ".png") {
    return insertContext({
        "{media_dir}": config.manimConfig.media_dir,
        "{module_name}": config.moduleName,
        // fallback inference variables
        "{version}": `ManimCE_${getUserConfiguration("manimExecutableVersion")}`,
        "{scene_name}": config.sceneName,
        "{extension}": extension,
    }, path.join(config.manimConfig.images_dir, loggedImageName || exports.FALLBACK_CONFIG.image_name));
}
exports.getImageOutputPath = getImageOutputPath;
/**
 * Gets the user set configuration property, if it's not found somehow, will
 * fallback to using package.json set valus.
 *
 * @param property
 * @returns
 */
function getUserConfiguration(property) {
    let value = vscode.workspace
        .getConfiguration("manim-sideview")
        .get(property);
    if (value === undefined) {
        const propertyDict = exports.PACKAGE_JSON["contributes"]["configuration"]["properties"][`manim-sideview.${property}`];
        if (propertyDict["type"] === "boolean") {
            return (propertyDict["default"] === "true"
                ? true
                : false);
        }
    }
    return value;
}
exports.getUserConfiguration = getUserConfiguration;
// Loaded on activation
exports.PATHS = {};
function updateFallbackManimCfg(updated, saveUpdated = true) {
    Object.keys(exports.FALLBACK_CONFIG).forEach((ky) => {
        if (updated[ky]) {
            exports.FALLBACK_CONFIG[ky] = updated[ky];
        }
    });
    if (saveUpdated) {
        fs.writeFile(exports.PATHS.cfgMap.fsPath, JSON.stringify(exports.FALLBACK_CONFIG), () => { });
    }
}
exports.updateFallbackManimCfg = updateFallbackManimCfg;
exports.PACKAGE_JSON = {};
async function loadGlobals(ctx) {
    Log.info("Loading globals.");
    const pathsToLoad = {
        cfgMap: "assets/local/manim.cfg.json",
        mobjVersion: "assets/mobjects/mobject_version.txt",
        mobjGalleryParameters: "assets/mobjects/gallery_parameters.json",
        mobjImgs: "assets/mobjects/",
    };
    Object.keys(pathsToLoad).forEach((tp) => {
        exports.PATHS[tp] = vscode.Uri.joinPath(ctx.extensionUri, pathsToLoad[tp]);
    });
    Log.info("Loaded all resource paths.");
    const cfg = JSON.parse((await vscode.workspace.fs.readFile(exports.PATHS.cfgMap)).toString());
    updateFallbackManimCfg(cfg, false);
    exports.PACKAGE_JSON = JSON.parse(fs
        .readFileSync(vscode.Uri.joinPath(ctx.extensionUri, "package.json").fsPath)
        .toString());
    exports.EXTENSION_VERSION = exports.PACKAGE_JSON["version"];
    Log.info("Successfully loaded all globals.");
}
exports.loadGlobals = loadGlobals;
// base values for running in-time configurations
exports.BASE_PROGRESS_BAR_COLOR = "var(--vscode-textLink-foreground)";
/**
 * Provide a nonce for inline scripts inside webviews, this is necessary for
 * script execution.
 * @returns nonce
 */
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
exports.getNonce = getNonce;
/**
 * Replaces {variables} with a given map - sorta like how Python string
 * formatting works.
 *
 * @param context Context Variables
 * @param payload The string using the ctx variables
 * @returns
 */
function insertContext(context, payload) {
    var path = payload;
    Object.keys(context).forEach((k) => {
        if (path.includes(k)) {
            path = path.replace(new RegExp(k, "g"), context[k]);
        }
    });
    return path;
}
exports.insertContext = insertContext;
/**
 * Used in webviews to load the html, js and css paths in one call.
 *
 * @param extensionUri
 * @param viewName
 * @returns WebviewResources
 */
function getWebviewResource(extensionUri, viewName) {
    return {
        css: vscode.Uri.joinPath(extensionUri, `webview/${viewName}/${viewName}.css`),
        js: vscode.Uri.joinPath(extensionUri, `webview/${viewName}/${viewName}.js`),
        html: vscode.Uri.joinPath(extensionUri, `webview/${viewName}/${viewName}.html`),
    };
}
exports.getWebviewResource = getWebviewResource;
//# sourceMappingURL=globals.js.map