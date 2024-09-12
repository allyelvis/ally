"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateEngine = void 0;
const vscode = require("vscode");
const globals_1 = require("./globals");
class TemplateEngine {
    constructor(webview, resource, name, extensionUri) {
        this.webview = webview;
        this.resource = resource;
        this.name = name;
        this.extensionUri = extensionUri;
        this.resMap = {
            js: ` ${this.name}.js`,
            css: ` ${this.name}.css`,
        };
        /**
         * A list of preamble context variables that will be rendered without
         * explicit instructions.
         */
        this.preamble = {
            cspSource: this.webview.cspSource,
            [this.resMap.js]: this.webview.asWebviewUri(this.resource.js).toString(),
            [this.resMap.css]: this.webview.asWebviewUri(this.resource.css).toString(),
            nonce: (0, globals_1.getNonce)(),
            "codicon.css": this.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "node_modules", "@vscode/codicons", "dist", "codicon.css")),
        };
    }
    static async renderDoc(fp, globals) {
        return TemplateEngine.textRender((await vscode.workspace.fs.readFile(fp)).toString(), globals);
    }
    static createCSSRegex(property, pattern) {
        return new RegExp(`${property}\s*:\s*(${pattern})\s*;`);
    }
    static textRender(text, globals) {
        Object.keys(globals).forEach((varname) => {
            if (varname.startsWith(" ")) {
                text = text.replace(new RegExp(varname.trim(), "gi"), globals[varname]);
            }
            else {
                text = text.replace(new RegExp(`{{ ${varname} }}`, "gi"), globals[varname]);
            }
        });
        return text;
    }
    /**
     * Render an HTML template file with the given variable parameters and the
     * required preamble.
     *
     * Semantics
     * 'varname' : {{ varname }}
     *  OR
     * ' varname' : varname
     *
     * The latter replaces any first occurence of the varname with unbound
     * squiggly braces. It must be fed into the globals object with a leading
     * space.
     */
    async render(globals) {
        return TemplateEngine.textRender(TemplateEngine.textRender((await vscode.workspace.fs.readFile(this.resource.html)).toString(), this.preamble), globals);
    }
}
exports.TemplateEngine = TemplateEngine;
//# sourceMappingURL=templateEngine.js.map