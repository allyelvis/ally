"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigParser = void 0;
const vscode = require("vscode");
// key = value
const RE_KEYVALPAIR = /(?<key>\w+)\s*=\s*(?<value>.+)/g;
class ConfigParser {
    static async parse(uri) {
        const result = {};
        const contents = (await vscode.workspace.fs.readFile(vscode.Uri.file(uri))).toString();
        const sect = "CLI";
        [...contents.matchAll(RE_KEYVALPAIR)].forEach((r) => {
            if (r && r.groups) {
                if (!result[sect]) {
                    result[sect] = {};
                }
                result[sect][r.groups.key] = r.groups.value;
            }
        });
        return result;
    }
}
exports.ConfigParser = ConfigParser;
//# sourceMappingURL=configParser.js.map