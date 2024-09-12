"use strict";
/**
 * The pseudoterminal used by manim-sideview to output stdout.
 * The container implements the OutputChannel interface.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManimPseudoTerm = void 0;
const vscode = require("vscode");
const path = require("path");
const child_process_1 = require("child_process");
const util_1 = require("util");
const globals_1 = require("./globals");
// promisified Node executable (Node 10+)
const exec = (0, util_1.promisify)(child_process_1.exec);
const keys = {
    enter: "\r",
    backspace: "\x7f",
};
const actions = {
    cursorBack: "\x1b[D",
    deleteChar: "\x1b[P",
    columnZero: "^M",
    clear: "\x1b[2J\x1b[3J\x1b[;H",
};
const defPrompt = "MS";
// cleanup inconsitent line breaks
const formatText = (text) => `\r${text.split(/(\r?\n)/g).join("\r")}\r`;
/* A pseudoterminal implemented in the form of an outputchannel
this is so that they can be implemented without coupling directly
to how either form of output is used in the sideview */
class ManimPseudoTerm {
    constructor(name) {
        this.name = name;
        this.cwd = path.dirname(vscode.workspace.textDocuments[0]?.fileName || process.cwd());
        this.isRunning = false;
        this.writeEmitter = new vscode.EventEmitter();
        this.prompt = `${defPrompt} ${this.cwd}>`;
        this.intro = "Manim Extension XTerm\n\rServes as a terminal for logging purpose.\n\r\n\r" +
            `Extension Version ${globals_1.EXTENSION_VERSION}\n\r\n\r${this.prompt}`;
        this.content = "";
        this.appendedBefore = false;
        this.stickyNotes = "";
        this.pty = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.writeEmitter.fire(this.intro),
            close: () => { },
            handleInput: async (char) => {
                if (this.isRunning) {
                    return;
                }
                switch (char) {
                    case keys.enter:
                        // preserve the run command line for history
                        this.writeEmitter.fire(`\r\n${this.prompt}`);
                        if (this.content) {
                            this.isRunning = true;
                            try {
                                // run the command
                                const { stdout, stderr } = await exec(this.content, {
                                    encoding: "utf8",
                                    cwd: this.cwd,
                                });
                                if (stdout) {
                                    this.writeEmitter.fire(formatText(stdout));
                                }
                                if (stderr && stderr.length) {
                                    this.writeEmitter.fire(formatText(stderr));
                                }
                            }
                            catch (error) {
                                this.writeEmitter.fire(`\r${formatText(error.message)}`);
                            }
                            this.isRunning = false;
                            this.content = "";
                            this.writeEmitter.fire(`\r${this.prompt}`);
                        }
                    case keys.backspace:
                        if (!this.content || !this.content.length) {
                            return;
                        }
                        // Remove backspaced char
                        this.content = this.content.slice(0, -1);
                        this.writeEmitter.fire(actions.cursorBack);
                        this.writeEmitter.fire(actions.deleteChar);
                        return;
                    default:
                        // typing a new character
                        this.content += char;
                        this.writeEmitter.fire(char);
                }
            },
        };
        this.terminal = vscode.window.createTerminal({
            name: this.name,
            pty: this.pty,
        });
        this.name = name;
    }
    /**
     * Appends the string directly if the terminal has been appended to before.
     * Else waits until another `append` call is made.
     * This ensures that early append calls are made through.
     *
     * @param value
     */
    append(value) {
        if (!this.appendedBefore) {
            this.stickyNotes += value;
            this.appendedBefore = true;
            return;
        }
        this.writeEmitter.fire(`${this.stickyNotes}${value}`.replace(/\n/g, "\n\r"));
        this.stickyNotes = "";
    }
    /**
     * Appends the string directly if the terminal has been appended to before.
     * Else waits until another `append` call is made.
     * This ensures that early append calls are made through.
     * Additionally append the prompt.
     *
     * @param value
     */
    appendLine(value) {
        if (!this.appendedBefore) {
            this.stickyNotes += value;
            this.appendedBefore = true;
            return;
        }
        this.writeEmitter.fire(`${this.stickyNotes}${value}`.replace(/\n/g, "\n\r"));
        this.newPrompt();
        this.stickyNotes = "";
    }
    newPrompt() {
        this.isRunning = false;
        if (this.pty.handleInput) {
            this.pty.handleInput(keys.enter);
        }
    }
    replace(value) {
        this.clear();
        this.writeEmitter.fire(value);
    }
    clear() {
        this.writeEmitter.fire(actions.clear);
        this.writeEmitter.fire(this.intro);
    }
    show(column, preserveFocus) {
        this.terminal.show(preserveFocus || column);
    }
    hide() {
        this.terminal.hide();
    }
    dispose() {
        this.terminal.dispose();
    }
    isClosed() {
        return !!this.terminal.exitStatus;
    }
}
exports.ManimPseudoTerm = ManimPseudoTerm;
//# sourceMappingURL=pseudoTerm.js.map