"use strict";
/* eslint-disable @typescript-eslint/naming-convention */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManimSideview = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
const globals_1 = require("./globals");
const configParser_1 = require("./configParser");
const player_1 = require("./player");
const gallery_1 = require("./gallery");
const pseudoTerm_1 = require("./pseudoTerm");
const CONFIG_SECTION = "CLI";
const RELEVANT_CONF_FLAGS = [
    "quality",
    "media_dir",
    "video_dir",
    "images_dir",
    "frame_rate",
];
const RE_SCENE_CLASS = /class\s+(?<name>\w+)\(\w*Scene\w*\):/g;
const RE_CFG_OPTIONS = /(\w+)\s?:\s?([^ ]*)/g;
const RE_FILE_READY = /File\s*ready\s*at[^']*'(?<path>[^']*)'/g;
// a process will be killed if this message is seen
const KILL_MSG = "Choose number corresponding to desired scene/arguments.\r\n(Use comma separated list for multiple entries)\r\nChoice(s):  ";
class JobStatusItemWrapper {
    constructor() {
        this.jobStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this.jobStatusItem.name = "job-indicator";
        this.jobStatusItem.command = "manim-sideview.removeCurrentJob";
        this.jobStatusItem.tooltip = "Mainm Sideview - Press to stop session.";
    }
    getItem() {
        return this.jobStatusItem;
    }
    setIcon(themeIcon) {
        this.jobStatusItem.text = `${themeIcon} Manim SV`;
    }
    setNew() {
        this.jobStatusItem.backgroundColor = new vscode.ThemeColor("button.hoverBackground");
        this.setIcon("$(vm-active)");
        this.setVisibility(true);
    }
    restoreStatus(job) {
        switch (job.status) {
            case 3 /* JobStatus.New */:
                this.setNew();
                break;
            case 1 /* JobStatus.Active */:
                this.setActive(job);
                break;
            case 0 /* JobStatus.Error */:
                this.setError(job);
                break;
            case 2 /* JobStatus.Running */:
                this.setRunning(job);
                break;
        }
    }
    setRunning(job) {
        if (job) {
            job.status = 2 /* JobStatus.Running */;
        }
        this.jobStatusItem.color = new vscode.ThemeColor("textLink.foreground");
        this.setIcon("$(sync~spin)");
        this.setVisibility(true);
    }
    setActive(job) {
        if (job) {
            job.status = 1 /* JobStatus.Active */;
        }
        this.jobStatusItem.color = new vscode.ThemeColor("textLink.foreground");
        this.setIcon("$(vm-running)");
        this.setVisibility(true);
    }
    setError(job) {
        if (job) {
            job.status = 0 /* JobStatus.Error */;
        }
        this.jobStatusItem.color = new vscode.ThemeColor("minimap.errorHighlight");
        this.setIcon("$(vm-outline)");
        this.setVisibility(true);
    }
    setVisibility(activeJob) {
        if (activeJob) {
            this.jobStatusItem.show();
        }
        else {
            this.jobStatusItem.hide();
        }
    }
}
class ManimSideview {
    constructor(ctx) {
        this.ctx = ctx;
        this.manimCfgPath = "";
        this.autoPlayCommand = "vscePlay {sourcePath}";
        this.activeJobs = {};
        this.mediaPlayer = new player_1.MediaPlayer(this.ctx.extensionUri, this.ctx.subscriptions);
        this.gallery = new gallery_1.Gallery(this.ctx.extensionUri, this.ctx.subscriptions);
        this.lastChosenSceneNames = {};
        this.ctx = ctx;
        this.jobStatusItem = new JobStatusItemWrapper();
        this.ctx.subscriptions.push(this.jobStatusItem.getItem());
    }
    /**
     * @param srcPath optional path to the source file for directed rendering,
     * if left empty, the active text document is used
     * @param autoRun optional boolean to denote whether if this call is from
     * an automated process like RunOnSave
     */
    async run(srcPath, autoRun) {
        let activeJob = srcPath
            ? this.getActiveJob(typeof srcPath === "string" ? srcPath : srcPath.fsPath)
            : null;
        let doc;
        // If we couldn't obtain the active job by the srcPath provided (if it has been)
        // We fallback to fetching the active text editor's document without the
        // requirement for active jobs.
        if (activeJob) {
            doc = activeJob.config.document;
        }
        else {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                if (!autoRun) {
                    vscode.window.showErrorMessage(globals_1.Log.error("Manim Sideview: You need to select a valid Python source file."));
                }
                return;
            }
            doc = editor.document;
            activeJob = this.getActiveJob(doc.fileName);
        }
        // load/reload every time the program is running
        let manimConfig = await this.getManimConfigFile(doc.uri.fsPath);
        let isUsingCfgFile = false;
        if (manimConfig) {
            isUsingCfgFile = true;
            if (!activeJob || !activeJob.config.isUsingCfgFile) {
                // loaded the file config for the first time
                vscode.window.showInformationMessage(globals_1.Log.info("Manim Sideview: Loaded a configuration file from the current working directory!"));
            }
        }
        else {
            // if we fail load it / we're not using a file: we'll use fallback values
            manimConfig = (0, globals_1.getDefaultMainConfig)();
        }
        let runningCfg;
        if (activeJob) {
            activeJob.config.manimConfig = manimConfig;
            activeJob.config.isUsingCfgFile = isUsingCfgFile;
            runningCfg = activeJob.config;
        }
        else {
            globals_1.Log.info("Asking user for the new scene name.");
            const newSceneName = await this.getRenderingSceneName(doc.uri);
            if (!newSceneName) {
                return;
            }
            runningCfg = this.getNewRunningConfig(doc, newSceneName, isUsingCfgFile, manimConfig);
        }
        this.runConfig(runningCfg);
    }
    stopProcess(process) {
        if (!process) {
            process = this.process;
        }
        if (process) {
            process.kill();
        }
    }
    async removeAllJobs() {
        this.activeJobs = {};
        this.manimCfgPath = "";
        this.refreshJobStatus();
    }
    async removeJob(srcPath) {
        const job = this.getActiveJob(srcPath);
        if (job) {
            delete this.activeJobs[job.config.srcPath];
            this.refreshJobStatus();
        }
    }
    refreshJobStatus() {
        const activeJob = this.getActiveJob();
        if (activeJob !== null) {
            this.jobStatusItem.restoreStatus(activeJob);
        }
        else {
            this.jobStatusItem.setVisibility(false);
        }
    }
    async setConfigFilePath() {
        const uri = await vscode.window.showOpenDialog({
            canSelectFolders: false,
            canSelectMany: false,
            title: "Open manim.cfg",
            filters: { config: ["cfg", "config", "ini"] },
        });
        if (uri) {
            const pth = path.normalize(uri[0].path);
            this.manimCfgPath =
                pth.startsWith("\\") || pth.startsWith("/") ? pth.substring(1) : pth;
        }
    }
    async renderNewScene(runningCfgSrcPath) {
        const job = this.getActiveJob(runningCfgSrcPath);
        if (!job) {
            vscode.window.showErrorMessage(globals_1.Log.error("Manim Sideview: Select a Python source file to render a new scene."));
            return;
        }
        const newSceneName = await this.getRenderingSceneName(job.config.document.uri);
        if (!newSceneName) {
            return;
        }
        job.config.sceneName = newSceneName;
        this.run(runningCfgSrcPath);
    }
    async getRenderingSceneName(srcFileUri) {
        const contents = (await vscode.workspace.fs.readFile(srcFileUri))
            .toString()
            .replace(/\r|\n/g, "");
        const sceneClasses = [...contents.matchAll(RE_SCENE_CLASS)].map((m) => `$(run-all) ${m.groups?.name}`);
        const moreOption = "I'll provide it myself!";
        // we will let the user input custom names by default
        let choice = moreOption;
        if (sceneClasses) {
            if (Object.keys(this.lastChosenSceneNames).includes(srcFileUri.fsPath)) {
                const lastChosenSceneName = this.lastChosenSceneNames[srcFileUri.fsPath];
                const decorlastChosenSceneName = `$(run-all) ${lastChosenSceneName}`;
                if (sceneClasses.includes(decorlastChosenSceneName)) {
                    sceneClasses.splice(sceneClasses.indexOf(decorlastChosenSceneName), 1);
                    sceneClasses.push(`$(refresh) ${lastChosenSceneName}`);
                }
            }
            sceneClasses.push(moreOption);
            const pick = await vscode.window.showQuickPick(sceneClasses, {
                title: "Manim Sideview: Pick your scene name!",
                placeHolder: "Search..",
            });
            if (pick) {
                choice = pick;
            }
            else {
                globals_1.Log.error("Try Again! You didn't pick a scene name.");
                return;
            }
        }
        const isCustomInput = choice === moreOption;
        if (isCustomInput || !sceneClasses) {
            const pick = await vscode.window.showInputBox({
                prompt: "Manim Sideview: Input the name of your scene",
            });
            if (pick) {
                choice = pick;
            }
            else {
                globals_1.Log.error("Try Again! You didn't input a custom scene name.");
                return;
            }
        }
        const sceneName = choice
            ?.replace("$(run-all)", "")
            .replace("$(refresh)", "")
            .trim();
        if (sceneName) {
            this.lastChosenSceneNames[srcFileUri.fsPath] = sceneName;
            return sceneName;
        }
        else {
            globals_1.Log.error("Try Again! You provided an invalid scene name.");
            return;
        }
    }
    showMobjectGallery() {
        this.gallery.show();
    }
    syncMobjectGallery() {
        this.gallery.synchronize(true);
    }
    auditTextEditorChange(editor) {
        if (editor && editor.document.languageId === "python") {
            this.gallery.setLastActiveEditor(editor);
        }
    }
    async syncFallbackManimConfig() {
        vscode.window.showInformationMessage(globals_1.Log.info("Manim Sideview: Preparing to sync fallback manim configurations..."));
        const process = (0, child_process_1.spawn)(path.normalize((0, globals_1.getUserConfiguration)("defaultManimPath")), ["cfg", "show"]);
        let fullStdout = "";
        process.stdout.on("data", function (data) {
            fullStdout += data.toString();
        });
        process.on("close", function (_, __) {
            const payload = fullStdout
                .split("\r\n\r\n\r\n")
                .find((p) => p.includes("CLI"))
                ?.replace(/\r\n/g, " ");
            if (!payload) {
                return;
            }
            const matches = payload?.match(RE_CFG_OPTIONS);
            if (!matches) {
                return;
            }
            const cfgOptions = {};
            matches?.forEach((op) => {
                const options = op.split(":");
                cfgOptions[options[0].trim()] = options[1].trim();
            });
            (0, globals_1.updateFallbackManimCfg)(cfgOptions);
            vscode.window.showInformationMessage("Manim Sideview: Successfully updated internal defaults for manim.cfg files.");
        });
    }
    /**
     * Creates necessary arguments and solutions to run per a running configuration.
     *
     * @param config the running config
     */
    async runConfig(config) {
        globals_1.Log.info(`Attempting to render via the running configuration ${JSON.stringify(config, null, 4)},\n{\n\t"predictedVideoOutputPath": ${(0, globals_1.getVideoOutputPath)(config)},\n\t"predictedImageOutputPath": ${(0, globals_1.getImageOutputPath)(config, "{version}")}\n}`);
        const cliArgs = [config.srcPath];
        if (!config.isUsingCfgFile) {
            (0, globals_1.getUserConfiguration)("commandLineArgs")
                .trim()
                .split(" ")
                .forEach((arg) => (arg ? cliArgs.push(arg) : undefined));
        }
        cliArgs.push(config.sceneName.trim());
        let out;
        if ((0, globals_1.getUserConfiguration)("outputToTerminal")) {
            this.ensureOutputChannelCreation();
            this.outputPseudoTerm.cwd = config.srcRootFolder;
            this.outputPseudoTerm.isRunning = true;
            out = this.outputPseudoTerm;
        }
        else {
            out = this.outputChannel;
        }
        this.render(cliArgs, config, out);
    }
    /**
     * Execution of a generic terminal command.
     *
     * @param commandInput full command string with arguments
     * @param cwd current working directory
     * @param outputChannel output channel
     */
    executeTerminalCommand(commandInput, cwd) {
        let cli = vscode.window.terminals.find((t) => t.name === globals_1.DefaultTerminalName);
        if (!cli) {
            cli = vscode.window.createTerminal({
                name: globals_1.DefaultTerminalName,
                cwd: cwd,
                hideFromUser: true,
                message: "This is an internal terminal for executing post-render manim commands!",
            });
        }
        else {
            cli.sendText(`cd "${cwd}"`);
        }
        cli.sendText(commandInput);
    }
    async render(args, config, outputChannel) {
        const cwd = config.srcRootFolder;
        const command = path.normalize((0, globals_1.getUserConfiguration)("defaultManimPath"));
        const autoPreview = (0, globals_1.getUserConfiguration)("autoPreview");
        // log a fake command execution line
        outputChannel.append(`${command} ${args.join(" ")}\n`);
        if ((0, globals_1.getUserConfiguration)("focusOutputOnRun")) {
            outputChannel.show(true);
        }
        // prepare for the new process by killing the existing old process
        if (this.process) {
            this.process.kill();
        }
        const startTime = new Date();
        const process = (0, child_process_1.spawn)(command, args, { cwd: cwd, shell: false });
        globals_1.Log.info(`[${process.pid}] Spawned a new process for command execution.`);
        this.process = process;
        this.jobStatusItem.setRunning(this.getActiveJob(config.srcPath));
        if (!process || !process.stdout || !process.stderr || !process.stdin) {
            outputChannel.appendLine(globals_1.Log.info(`[${process.pid}] Execution returned code=911 in Process: ${process.pid}, stdout: ${process.stdout}, stdout: ${process.stderr}`));
            return vscode.window
                .showErrorMessage("Manim Sideview: Fatal error, please look at the output channel.", "Show Log")
                .then((value) => value === "Show Log"
                ? vscode.commands.executeCommand("manim-sideview.showOutputChannel")
                : null);
        }
        process.on("error", (err) => {
            if (!process.killed) {
                outputChannel.append(err.toString());
            }
        });
        // we'll keep a closure because this.process is capable of going undefined
        // at any given time, but we still want valid references
        let stdoutLogbook = "";
        process.stdout.on("data", (data) => {
            if (!process.killed) {
                const dataStr = data.toString();
                stdoutLogbook += dataStr;
                globals_1.Log.info(`[${process.pid}] Relaying stdout output "${dataStr
                    .replace(/\r\n/g, "\\n")
                    .replace(/    /g, "\\t")}"`);
                outputChannel.append(dataStr);
                if (stdoutLogbook.includes(KILL_MSG)) {
                    globals_1.Log.error(`[${process.pid}] Kill message is sent, ending the process.`);
                    outputChannel.append("\r\n" +
                        globals_1.Log.error(`[${process.pid}] Your selected scene name class no longer exists in the source file.`) +
                        "\r\n");
                    this.removeJob(config.srcPath);
                    this.stopProcess(process);
                    return;
                }
            }
        });
        process.on("close", async (code, signal) => {
            const elapsedTime = (new Date().getTime() - startTime.getTime()) / 1000;
            if (signal === "SIGTERM") {
                code = 1;
            }
            outputChannel.appendLine(globals_1.Log.info(`[${process.pid}] Execution returned code=${code} in ${elapsedTime} seconds ${code === 1 ? "returned signal " + signal : ""} ${signal === "SIGTERM"
                ? "Cause: An old process has been terminated due to a termination signal."
                : ""}`) + "\n");
            const isMainProcess = this.process && this.process.pid === process.pid;
            if (isMainProcess) {
                this.process = undefined;
            }
            if (signal === "SIGTERM") {
                if (isMainProcess) {
                    this.jobStatusItem.setError(this.getActiveJob(config.srcPath));
                }
                return;
            }
            if (code !== 0) {
                this.jobStatusItem.setError(this.getActiveJob(config.srcPath));
                return;
            }
            // the logging below is only reqired for manim executable commands
            // parse out outputFileType and loggedImageName from the logbook
            let outputFileType;
            let loggedImageName;
            // the file output signifier
            const fileReSignifier = [...stdoutLogbook.matchAll(RE_FILE_READY)];
            if (fileReSignifier.length > 0) {
                const fileIdentifier = fileReSignifier.find((m) => m.groups?.path.replace(/ |\r|\n/g, "").endsWith(".png"));
                if (fileIdentifier) {
                    outputFileType = player_1.PlayableMediaType.Image;
                    loggedImageName = fileIdentifier.groups?.path
                        .replace(/ |\r|\n/g, "")
                        .split(/\\|\//g)
                        .pop();
                }
                else {
                    outputFileType = player_1.PlayableMediaType.Video;
                }
                globals_1.Log.info(`[${process.pid}] ${outputFileType === player_1.PlayableMediaType.Image ? "Image" : "Video"} output detected.`);
            }
            if (outputFileType === undefined) {
                const fileType = await vscode.window.showWarningMessage(globals_1.Log.warn(`Manim Sideview: Unable to infer the file-type for "${config.sceneName}". Please select below.`), "Video", "Image");
                if (!fileType) {
                    return;
                }
                outputFileType =
                    fileType === "Video"
                        ? player_1.PlayableMediaType.Video
                        : player_1.PlayableMediaType.Image;
            }
            const mediaPath = outputFileType === player_1.PlayableMediaType.Video
                ? (0, globals_1.getVideoOutputPath)(config)
                : (0, globals_1.getImageOutputPath)(config, loggedImageName);
            if (!mediaPath) {
                return;
            }
            const fullMediaPath = vscode.Uri.file(path.join(config.srcRootFolder, mediaPath));
            if (!fs.existsSync(fullMediaPath.fsPath)) {
                vscode.window
                    .showErrorMessage(globals_1.Log.error(`Manim Sideview: Estimated output file does not exist at "${fullMediaPath.fsPath}"` +
                    " Make sure that the designated video directories are reflected" +
                    " in the extension log."), "Show Log")
                    .then((value) => value === "Show Log"
                    ? vscode.commands.executeCommand("manim-sideview.showOutputChannel")
                    : null);
                this.jobStatusItem.setError(this.getActiveJob(config.srcPath));
                return;
            }
            if (autoPreview) {
                // we'll open a side view if we can find the file
                this.mediaPlayer.playMedia(fullMediaPath, config, outputFileType || player_1.PlayableMediaType.Video);
            }
            const terminalCommand = (0, globals_1.getUserConfiguration)("terminalCommand");
            if (terminalCommand) {
                this.executeTerminalCommand((0, globals_1.insertContext)({
                    "{outputPath}": fullMediaPath.fsPath,
                    "{sourcePath}": config.srcPath,
                    "{sceneName}": config.sceneName.trim(),
                }, terminalCommand), config.srcRootFolder);
            }
            if (Object.keys(this.activeJobs).includes(config.srcPath)) {
                this.jobStatusItem.setActive(this.getActiveJob(config.srcPath));
                return;
            }
            // the preview is treated as a new job
            globals_1.Log.info(`New job added for "${config.srcPath}" as ${JSON.stringify(config, null, 4)}`);
            this.activeJobs[config.srcPath] = {
                config: config,
                status: 3 /* JobStatus.New */,
            };
            this.jobStatusItem.setNew();
        });
    }
    ensureOutputChannelCreation() {
        if (!this.outputChannel) {
            this.outputChannel = vscode.window.createOutputChannel("manim");
        }
        if (!this.outputPseudoTerm || this.outputPseudoTerm.isClosed()) {
            this.outputPseudoTerm = new pseudoTerm_1.ManimPseudoTerm("manim");
        }
    }
    /**
     * Evaluate a job if it exists from the currently active document or from
     * a source path if given. If the currently active document is the manim
     * sideview webview, the last job will be returned.
     *
     * @param srcPath
     * @returns Job | null
     */
    getActiveJob(srcPath) {
        let path;
        if (!srcPath) {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== "python") {
                return null;
            }
            path = editor.document.fileName;
        }
        else {
            path = srcPath;
        }
        return this.activeJobs[path] || null;
    }
    /**
     * Finds the manim.cfg file and if exists returns a
     * ManimConfig object.
     *
     * Returns false if there is a problem with the manim config, undefined if
     * it is undefined.
     *
     * @param srcfilePath
     * @returns ManimConfig | undefined | false
     */
    async getManimConfigFile(srcfilePath) {
        const rootPath = path.join(srcfilePath, "../");
        const filePath = this.manimCfgPath
            ? this.manimCfgPath
            : path.join(rootPath, "manim.cfg");
        if (!fs.existsSync(filePath)) {
            return;
        }
        globals_1.Log.info(`Parsing configuration file at ${filePath}.`);
        try {
            var parsedConfig = await configParser_1.ConfigParser.parse(filePath);
        }
        catch (e) {
            vscode.window.showErrorMessage(globals_1.Log.error("Manim Sideview: Failed parsing the manim.cfg file, ignoring the file."));
            return;
        }
        if (!Object.keys(parsedConfig).includes(CONFIG_SECTION)) {
            vscode.window.showErrorMessage(globals_1.Log.error(`Manim Sideview: Config file is missing the [${CONFIG_SECTION}] section.`));
            return;
        }
        const cliConfig = parsedConfig[CONFIG_SECTION];
        // we always need a fully configured ManimConfig so this requires us to
        // start from fallback values
        let manimConfig = (0, globals_1.getDefaultMainConfig)();
        for (const flag of RELEVANT_CONF_FLAGS) {
            if (Object.keys(cliConfig).includes(flag)) {
                manimConfig[flag] = cliConfig[flag];
                globals_1.Log.info(`Set flag "${flag}" to ${cliConfig[flag]}.`);
            }
        }
        return manimConfig;
    }
    getNewRunningConfig(doc, sceneName, isUsingCfgFile, manimConfig) {
        const srcPath = doc.uri.fsPath;
        globals_1.Log.info(`Creating a new configuration for file at path ${srcPath}`);
        const moduleName = path.basename(srcPath).slice(0, -3);
        const root = path.join(doc.uri.fsPath, "../");
        return {
            srcRootFolder: root,
            srcPath: srcPath,
            moduleName: moduleName,
            isUsingCfgFile: isUsingCfgFile,
            manimConfig: manimConfig,
            document: doc,
            sceneName: sceneName,
        };
    }
}
exports.ManimSideview = ManimSideview;
//# sourceMappingURL=sideview.js.map