/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = void 0;
const vscode = __importStar(__webpack_require__(1));
const github_1 = __webpack_require__(2);
const util_1 = __webpack_require__(25);
function activate(context) {
    context.subscriptions.push(new github_1.GitHubAuthenticationProvider(context, util_1.AuthProviderType.github));
    let githubEnterpriseAuthProvider;
    if (vscode.workspace.getConfiguration().get('github-enterprise.uri')) {
        githubEnterpriseAuthProvider = new github_1.GitHubAuthenticationProvider(context, util_1.AuthProviderType.githubEnterprise);
        context.subscriptions.push(githubEnterpriseAuthProvider);
    }
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('github-enterprise.uri')) {
            if (!githubEnterpriseAuthProvider && vscode.workspace.getConfiguration().get('github-enterprise.uri')) {
                githubEnterpriseAuthProvider = new github_1.GitHubAuthenticationProvider(context, util_1.AuthProviderType.githubEnterprise);
                context.subscriptions.push(githubEnterpriseAuthProvider);
            }
        }
    }));
}
exports.activate = activate;


/***/ }),
/* 1 */
/***/ ((module) => {

"use strict";
module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitHubAuthenticationProvider = void 0;
const vscode = __importStar(__webpack_require__(1));
const uuid_1 = __webpack_require__(3);
const lodash_difference_1 = __importDefault(__webpack_require__(13));
const keychain_1 = __webpack_require__(14);
const githubServer_1 = __webpack_require__(15);
const utils_1 = __webpack_require__(20);
const experimentationService_1 = __webpack_require__(26);
const extension_telemetry_1 = __importDefault(__webpack_require__(112));
const logger_1 = __webpack_require__(113);
const cloudstudioServer_1 = __webpack_require__(114);
const util_1 = __webpack_require__(25);
class GitHubAuthenticationProvider {
    constructor(context, type) {
        this.context = context;
        this.type = type;
        this._sessionChangeEmitter = new vscode.EventEmitter();
        this._logger = (0, logger_1.getLogger)(this.type);
        this._keychain = new keychain_1.Keychain(this.context, `${this.type}.auth`, this._logger);
        this._accountsSeen = new Set();
        const { name, version, aiKey } = context.extension.packageJSON;
        this._telemetryReporter = new experimentationService_1.ExperimentationTelemetry(context, new extension_telemetry_1.default(name, version, aiKey));
        if (this.type === util_1.AuthProviderType.github) {
            this._githubServer = new githubServer_1.GitHubServer(
            // We only can use the Device Code flow when we have a full node environment because of CORS.
            context.extension.extensionKind === vscode.ExtensionKind.Workspace ||
                vscode.env.uiKind === vscode.UIKind.Desktop, this._logger, this._telemetryReporter);
        }
        else {
            this._githubServer = new githubServer_1.GitHubEnterpriseServer(this._logger, this._telemetryReporter);
        }
        // Contains the current state of the sessions we have available.
        this._sessionsPromise = this.readSessions().then(async (sessions) => {
            // fire telemetry after a second to allow the workbench to focus on loading
            setTimeout(() => sessions.forEach((s) => this.afterSessionLoad(s)), 1000);
            await (0, cloudstudioServer_1.getCloudStudioSessions)(sessions);
            await this.updateGitEmail(sessions);
            return sessions;
        });
        this._disposable = vscode.Disposable.from(this._telemetryReporter, this._githubServer, vscode.authentication.registerAuthenticationProvider(type, this._githubServer.friendlyName, this, {
            supportsMultipleAccounts: cloudstudioServer_1.isCloudStudio,
        }), this.context.secrets.onDidChange(() => this.checkForUpdates()));
    }
    dispose() {
        this._disposable.dispose();
    }
    get onDidChangeSessions() {
        return this._sessionChangeEmitter.event;
    }
    async getSessions(scopes) {
        // For GitHub scope list, order doesn't matter so we immediately sort the scopes
        const sortedScopes = scopes?.sort() || [];
        const scopesStr = sortedScopes.length ? sortedScopes.join(',') : 'all scopes';
        this._logger.info(`Getting sessions for ${scopesStr}...`);
        let sessions;
        try {
            sessions = await this._sessionsPromise;
        }
        catch (err) {
            this._logger.error(`[github-authentication] getSessions failed: `, err);
            return [];
        }
        const finalSessions = sortedScopes.length
            ? sessions.filter((session) => (0, lodash_difference_1.default)(scopes, session.scopes).length === 0)
            : sessions;
        this._logger.info(`Got ${finalSessions.length} sessions for ${scopesStr}...`);
        return finalSessions;
    }
    async afterSessionLoad(session) {
        // We only want to fire a telemetry if we haven't seen this account yet in this session.
        if (!this._accountsSeen.has(session.account.id)) {
            this._accountsSeen.add(session.account.id);
            this._githubServer.sendAdditionalTelemetryInfo(session.accessToken);
        }
    }
    async updateGitEmail(session) {
        if (session.length !== 0) {
            const { accessToken } = session[0];
            const email = await await this._githubServer.getEmail(accessToken);
            if (!email) {
                return;
            }
            try {
                cloudstudioServer_1.isCloudStudio && (await vscode.commands.executeCommand('cloudstudio.git.setGitEmail', email));
            }
            catch (error) {
                this._logger.info('cloudstudio.git.setGitEmail failed:', error);
            }
        }
    }
    async checkForUpdates() {
        const previousSessions = await this._sessionsPromise;
        this._sessionsPromise = this.readSessions();
        const storedSessions = await this._sessionsPromise;
        const added = [];
        const removed = [];
        storedSessions.forEach((session) => {
            const matchesExisting = previousSessions.some((s) => s.id === session.id);
            // Another window added a session to the keychain, add it to our state as well
            if (!matchesExisting) {
                this._logger.info('Adding session found in keychain');
                added.push(session);
            }
        });
        previousSessions.forEach((session) => {
            const matchesExisting = storedSessions.some((s) => s.id === session.id);
            // Another window has logged out, remove from our state
            if (!matchesExisting) {
                this._logger.info('Removing session no longer found in keychain');
                removed.push(session);
            }
        });
        if (added.length || removed.length) {
            this._sessionChangeEmitter.fire({ added, removed, changed: [] });
        }
    }
    async readSessions() {
        let sessionData;
        try {
            this._logger.info('Reading sessions from keychain...');
            const storedSessions = await this._keychain.getToken();
            if (!storedSessions) {
                return [];
            }
            this._logger.info('Got stored sessions!');
            try {
                sessionData = JSON.parse(storedSessions);
            }
            catch (e) {
                await this._keychain.deleteToken();
                throw e;
            }
        }
        catch (e) {
            this._logger.error(`Error reading token: ${e}`);
            return [];
        }
        // TODO: eventually remove this Set because we should only have one session per set of scopes.
        const scopesSeen = new Set();
        const sessionPromises = sessionData.map(async (session) => {
            // For GitHub scope list, order doesn't matter so we immediately sort the scopes
            const scopesStr = [...session.scopes].sort().join(' ');
            if (scopesSeen.has(scopesStr)) {
                return undefined;
            }
            let userInfo;
            if (!session.account) {
                try {
                    userInfo = await this._githubServer.getUserInfo(session.accessToken);
                    this._logger.info(`Verified session with the following scopes: ${scopesStr}`);
                }
                catch (e) {
                    // Remove sessions that return unauthorized response
                    if (e.message === 'Unauthorized') {
                        return undefined;
                    }
                }
            }
            this._logger.trace(`Read the following session from the keychain with the following scopes: ${scopesStr}`);
            scopesSeen.add(scopesStr);
            return {
                id: session.id,
                account: {
                    label: session.account
                        ? session.account.label ?? session.account.displayName ?? '<unknown>'
                        : userInfo?.accountName ?? '<unknown>',
                    id: session.account?.id ?? userInfo?.id ?? '<unknown>',
                },
                // we set this to session.scopes to maintain the original order of the scopes requested
                // by the extension that called getSession()
                scopes: session.scopes,
                accessToken: session.accessToken,
            };
        });
        const verifiedSessions = (await Promise.allSettled(sessionPromises))
            .filter((p) => p.status === 'fulfilled')
            .map((p) => p.value)
            .filter((p) => Boolean(p));
        this._logger.info(`Got ${verifiedSessions.length} verified sessions.`);
        if (verifiedSessions.length !== sessionData.length) {
            await this.storeSessions(verifiedSessions);
        }
        return verifiedSessions;
    }
    async storeSessions(sessions) {
        this._logger.info(`Storing ${sessions.length} sessions...`);
        this._sessionsPromise = Promise.resolve(sessions);
        await this._keychain.setToken(JSON.stringify(sessions));
        this._logger.info(`Stored ${sessions.length} sessions!`);
    }
    async createSession(scopes) {
        try {
            // For GitHub scope list, order doesn't matter so we use a sorted scope to determine
            // if we've got a session already.
            const sortedScopes = [...scopes].sort();
            /* __GDPR__
                      "login" : {
                          "owner": "TylerLeonhardt",
                          "comment": "Used to determine how much usage the GitHub Auth Provider gets.",
                          "scopes": { "classification": "PublicNonPersonalData", "purpose": "FeatureInsight", "comment": "Used to determine what scope combinations are being requested." }
                      }
                  */
            this._telemetryReporter?.sendTelemetryEvent('login', {
                scopes: JSON.stringify(scopes),
            });
            let token;
            if (cloudstudioServer_1.isCloudStudio) {
                token = await (0, cloudstudioServer_1.cloudStudioLogin)(sortedScopes);
            }
            else {
                const scopeString = sortedScopes.join(' ');
                token = await this._githubServer.login(scopeString);
            }
            const session = await this.tokenToSession(token, scopes);
            this.afterSessionLoad(session);
            const sessions = await this._sessionsPromise;
            const sessionIndex = sessions.findIndex((s) => s.id === session.id || (0, utils_1.arrayEquals)([...s.scopes].sort(), sortedScopes));
            if (sessionIndex > -1) {
                sessions.splice(sessionIndex, 1, session);
            }
            else {
                sessions.push(session);
            }
            await this.storeSessions(sessions);
            this._sessionChangeEmitter.fire({ added: [session], removed: [], changed: [] });
            this._logger.info('Login success!');
            this.updateGitEmail([session]);
            return session;
        }
        catch (e) {
            // If login was cancelled, do not notify user.
            if (e === 'Cancelled' || e.message === 'Cancelled') {
                /* __GDPR__
                            "loginCancelled" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users cancel the login flow." }
                        */
                this._telemetryReporter?.sendTelemetryEvent('loginCancelled');
                throw e;
            }
            /* __GDPR__
                      "loginFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users run into an error login flow." }
                  */
            this._telemetryReporter?.sendTelemetryEvent('loginFailed');
            vscode.window.showErrorMessage(`Sign in failed: ${e}`);
            this._logger.error(e);
            throw e;
        }
    }
    async tokenToSession(token, scopes) {
        const userInfo = await this._githubServer.getUserInfo(token);
        return {
            id: (0, uuid_1.v4)(),
            accessToken: token,
            account: { label: userInfo.accountName, id: userInfo.id },
            scopes,
        };
    }
    async removeSession(id) {
        try {
            /* __GDPR__
                      "logout" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often users log out of an account." }
                  */
            this._telemetryReporter?.sendTelemetryEvent('logout');
            this._logger.info(`Logging out of ${id}`);
            const sessions = await this._sessionsPromise;
            const sessionIndex = sessions.findIndex((session) => session.id === id);
            if (sessionIndex > -1) {
                const session = sessions[sessionIndex];
                sessions.splice(sessionIndex, 1);
                await this.storeSessions(sessions);
                this._sessionChangeEmitter.fire({ added: [], removed: [session], changed: [] });
            }
            else {
                this._logger.error('Session not found');
            }
        }
        catch (e) {
            /* __GDPR__
                      "logoutFailed" : { "owner": "TylerLeonhardt", "comment": "Used to determine how often logging out of an account fails." }
                  */
            this._telemetryReporter?.sendTelemetryEvent('logoutFailed');
            vscode.window.showErrorMessage(`Sign out failed: ${e}`);
            this._logger.error(e);
            throw e;
        }
    }
}
exports.GitHubAuthenticationProvider = GitHubAuthenticationProvider;


/***/ }),
/* 3 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "v1": () => (/* reexport safe */ _v1_js__WEBPACK_IMPORTED_MODULE_0__["default"]),
/* harmony export */   "v3": () => (/* reexport safe */ _v3_js__WEBPACK_IMPORTED_MODULE_1__["default"]),
/* harmony export */   "v4": () => (/* reexport safe */ _v4_js__WEBPACK_IMPORTED_MODULE_2__["default"]),
/* harmony export */   "v5": () => (/* reexport safe */ _v5_js__WEBPACK_IMPORTED_MODULE_3__["default"])
/* harmony export */ });
/* harmony import */ var _v1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _v3_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(7);
/* harmony import */ var _v4_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(10);
/* harmony import */ var _v5_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(11);





/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _rng_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5);
/* harmony import */ var _bytesToUuid_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);

 // **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;

var _clockseq; // Previous uuid creation time


var _lastMSecs = 0;
var _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];
  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189

  if (node == null || clockseq == null) {
    var seedBytes = options.random || (options.rng || _rng_js__WEBPACK_IMPORTED_MODULE_0__["default"])();

    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }

    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


  var msecs = options.msecs !== undefined ? options.msecs : Date.now(); // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock

  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

  var dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval


  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  } // Per 4.2.1.2 Throw error if too many uuids are requested


  if (nsecs >= 10000) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

  msecs += 12219292800000; // `time_low`

  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff; // `time_mid`

  var tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff; // `time_high_and_version`

  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

  b[i++] = clockseq & 0xff; // `node`

  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf || (0,_bytesToUuid_js__WEBPACK_IMPORTED_MODULE_1__["default"])(b);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v1);

/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ rng)
/* harmony export */ });
// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).
// getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
// find the complete implementation of crypto (msCrypto) on IE11.
var getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);
var rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
  }

  return getRandomValues(rnds8);
}

/***/ }),
/* 6 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];

for (var i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).substr(1));
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex; // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434

  return (bth[buf[i + 0]] + bth[buf[i + 1]] + bth[buf[i + 2]] + bth[buf[i + 3]] + '-' + bth[buf[i + 4]] + bth[buf[i + 5]] + '-' + bth[buf[i + 6]] + bth[buf[i + 7]] + '-' + bth[buf[i + 8]] + bth[buf[i + 9]] + '-' + bth[buf[i + 10]] + bth[buf[i + 11]] + bth[buf[i + 12]] + bth[buf[i + 13]] + bth[buf[i + 14]] + bth[buf[i + 15]]).toLowerCase();
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (bytesToUuid);

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _v35_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8);
/* harmony import */ var _md5_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(9);


var v3 = (0,_v35_js__WEBPACK_IMPORTED_MODULE_0__["default"])('v3', 0x30, _md5_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v3);

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "DNS": () => (/* binding */ DNS),
/* harmony export */   "URL": () => (/* binding */ URL),
/* harmony export */   "default": () => (/* export default binding */ __WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _bytesToUuid_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(6);


function uuidToBytes(uuid) {
  // Note: We assume we're being passed a valid uuid string
  var bytes = [];
  uuid.replace(/[a-fA-F0-9]{2}/g, function (hex) {
    bytes.push(parseInt(hex, 16));
  });
  return bytes;
}

function stringToBytes(str) {
  str = unescape(encodeURIComponent(str)); // UTF8 escape

  var bytes = [];

  for (var i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }

  return bytes;
}

var DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
var URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
/* harmony default export */ function __WEBPACK_DEFAULT_EXPORT__(name, version, hashfunc) {
  function generateUUID(value, namespace, buf, offset) {
    var off = buf && offset || 0;
    if (typeof value === 'string') value = stringToBytes(value);
    if (typeof namespace === 'string') namespace = uuidToBytes(namespace);

    if (!Array.isArray(value)) {
      throw TypeError('value must be an array of bytes');
    }

    if (!Array.isArray(namespace) || namespace.length !== 16) {
      throw TypeError('namespace must be uuid string or an Array of 16 byte values');
    } // Per 4.3


    var bytes = hashfunc(namespace.concat(value));
    bytes[6] = bytes[6] & 0x0f | version;
    bytes[8] = bytes[8] & 0x3f | 0x80;

    if (buf) {
      for (var idx = 0; idx < 16; ++idx) {
        buf[off + idx] = bytes[idx];
      }
    }

    return buf || (0,_bytesToUuid_js__WEBPACK_IMPORTED_MODULE_0__["default"])(bytes);
  } // Function#name is not settable on some platforms (#270)


  try {
    generateUUID.name = name; // eslint-disable-next-line no-empty
  } catch (err) {} // For CommonJS default export support


  generateUUID.DNS = DNS;
  generateUUID.URL = URL;
  return generateUUID;
}

/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/*
 * Browser-compatible JavaScript MD5
 *
 * Modification of JavaScript MD5
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */
function md5(bytes) {
  if (typeof bytes === 'string') {
    var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

    bytes = new Uint8Array(msg.length);

    for (var i = 0; i < msg.length; ++i) {
      bytes[i] = msg.charCodeAt(i);
    }
  }

  return md5ToHexEncodedArray(wordsToMd5(bytesToWords(bytes), bytes.length * 8));
}
/*
 * Convert an array of little-endian words to an array of bytes
 */


function md5ToHexEncodedArray(input) {
  var output = [];
  var length32 = input.length * 32;
  var hexTab = '0123456789abcdef';

  for (var i = 0; i < length32; i += 8) {
    var x = input[i >> 5] >>> i % 32 & 0xff;
    var hex = parseInt(hexTab.charAt(x >>> 4 & 0x0f) + hexTab.charAt(x & 0x0f), 16);
    output.push(hex);
  }

  return output;
}
/**
 * Calculate output length with padding and bit length
 */


function getOutputLength(inputLength8) {
  return (inputLength8 + 64 >>> 9 << 4) + 14 + 1;
}
/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */


function wordsToMd5(x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << len % 32;
  x[getOutputLength(len) - 1] = len;
  var a = 1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d = 271733878;

  for (var i = 0; i < x.length; i += 16) {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    a = md5ff(a, b, c, d, x[i], 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, x[i], 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, x[i], 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, x[i], 6, -198630844);
    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }

  return [a, b, c, d];
}
/*
 * Convert an array bytes to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */


function bytesToWords(input) {
  if (input.length === 0) {
    return [];
  }

  var length8 = input.length * 8;
  var output = new Uint32Array(getOutputLength(length8));

  for (var i = 0; i < length8; i += 8) {
    output[i >> 5] |= (input[i / 8] & 0xff) << i % 32;
  }

  return output;
}
/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */


function safeAdd(x, y) {
  var lsw = (x & 0xffff) + (y & 0xffff);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return msw << 16 | lsw & 0xffff;
}
/*
 * Bitwise rotate a 32-bit number to the left.
 */


function bitRotateLeft(num, cnt) {
  return num << cnt | num >>> 32 - cnt;
}
/*
 * These functions implement the four basic operations the algorithm uses.
 */


function md5cmn(q, a, b, x, s, t) {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5ff(a, b, c, d, x, s, t) {
  return md5cmn(b & c | ~b & d, a, b, x, s, t);
}

function md5gg(a, b, c, d, x, s, t) {
  return md5cmn(b & d | c & ~d, a, b, x, s, t);
}

function md5hh(a, b, c, d, x, s, t) {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5ii(a, b, c, d, x, s, t) {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (md5);

/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _rng_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(5);
/* harmony import */ var _bytesToUuid_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(6);



function v4(options, buf, offset) {
  if (typeof options === 'string') {
    buf = options === 'binary' ? new Uint8Array(16) : null;
    options = null;
  }

  options = options || {};
  var rnds = options.random || (options.rng || _rng_js__WEBPACK_IMPORTED_MODULE_0__["default"])(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    var start = offset || 0;

    for (var i = 0; i < 16; ++i) {
      buf[start + i] = rnds[i];
    }

    return buf;
  }

  return (0,_bytesToUuid_js__WEBPACK_IMPORTED_MODULE_1__["default"])(rnds);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v4);

/***/ }),
/* 11 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _v35_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8);
/* harmony import */ var _sha1_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(12);


var v5 = (0,_v35_js__WEBPACK_IMPORTED_MODULE_0__["default"])('v5', 0x50, _sha1_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v5);

/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// Adapted from Chris Veness' SHA1 code at
// http://www.movable-type.co.uk/scripts/sha1.html
function f(s, x, y, z) {
  switch (s) {
    case 0:
      return x & y ^ ~x & z;

    case 1:
      return x ^ y ^ z;

    case 2:
      return x & y ^ x & z ^ y & z;

    case 3:
      return x ^ y ^ z;
  }
}

function ROTL(x, n) {
  return x << n | x >>> 32 - n;
}

function sha1(bytes) {
  var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  var H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];

  if (typeof bytes === 'string') {
    var msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

    bytes = [];

    for (var i = 0; i < msg.length; ++i) {
      bytes.push(msg.charCodeAt(i));
    }
  }

  bytes.push(0x80);
  var l = bytes.length / 4 + 2;
  var N = Math.ceil(l / 16);
  var M = new Array(N);

  for (var _i = 0; _i < N; ++_i) {
    var arr = new Uint32Array(16);

    for (var j = 0; j < 16; ++j) {
      arr[j] = bytes[_i * 64 + j * 4] << 24 | bytes[_i * 64 + j * 4 + 1] << 16 | bytes[_i * 64 + j * 4 + 2] << 8 | bytes[_i * 64 + j * 4 + 3];
    }

    M[_i] = arr;
  }

  M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
  M[N - 1][14] = Math.floor(M[N - 1][14]);
  M[N - 1][15] = (bytes.length - 1) * 8 & 0xffffffff;

  for (var _i2 = 0; _i2 < N; ++_i2) {
    var W = new Uint32Array(80);

    for (var t = 0; t < 16; ++t) {
      W[t] = M[_i2][t];
    }

    for (var _t = 16; _t < 80; ++_t) {
      W[_t] = ROTL(W[_t - 3] ^ W[_t - 8] ^ W[_t - 14] ^ W[_t - 16], 1);
    }

    var a = H[0];
    var b = H[1];
    var c = H[2];
    var d = H[3];
    var e = H[4];

    for (var _t2 = 0; _t2 < 80; ++_t2) {
      var s = Math.floor(_t2 / 20);
      var T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[_t2] >>> 0;
      e = d;
      d = c;
      c = ROTL(b, 30) >>> 0;
      b = a;
      a = T;
    }

    H[0] = H[0] + a >>> 0;
    H[1] = H[1] + b >>> 0;
    H[2] = H[2] + c >>> 0;
    H[3] = H[3] + d >>> 0;
    H[4] = H[4] + e >>> 0;
  }

  return [H[0] >> 24 & 0xff, H[0] >> 16 & 0xff, H[0] >> 8 & 0xff, H[0] & 0xff, H[1] >> 24 & 0xff, H[1] >> 16 & 0xff, H[1] >> 8 & 0xff, H[1] & 0xff, H[2] >> 24 & 0xff, H[2] >> 16 & 0xff, H[2] >> 8 & 0xff, H[2] & 0xff, H[3] >> 24 & 0xff, H[3] >> 16 & 0xff, H[3] >> 8 & 0xff, H[3] & 0xff, H[4] >> 24 & 0xff, H[4] >> 16 & 0xff, H[4] >> 8 & 0xff, H[4] & 0xff];
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (sha1);

/***/ }),
/* 13 */
/***/ ((module) => {

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/**
 * A faster alternative to `Function#apply`, this function invokes `func`
 * with the `this` binding of `thisArg` and the arguments of `args`.
 *
 * @private
 * @param {Function} func The function to invoke.
 * @param {*} thisArg The `this` binding of `func`.
 * @param {Array} args The arguments to invoke `func` with.
 * @returns {*} Returns the result of `func`.
 */
function apply(func, thisArg, args) {
  switch (args.length) {
    case 0: return func.call(thisArg);
    case 1: return func.call(thisArg, args[0]);
    case 2: return func.call(thisArg, args[0], args[1]);
    case 3: return func.call(thisArg, args[0], args[1], args[2]);
  }
  return func.apply(thisArg, args);
}

/**
 * A specialized version of `_.includes` for arrays without support for
 * specifying an index to search from.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludes(array, value) {
  var length = array ? array.length : 0;
  return !!length && baseIndexOf(array, value, 0) > -1;
}

/**
 * This function is like `arrayIncludes` except that it accepts a comparator.
 *
 * @private
 * @param {Array} [array] The array to inspect.
 * @param {*} target The value to search for.
 * @param {Function} comparator The comparator invoked per element.
 * @returns {boolean} Returns `true` if `target` is found, else `false`.
 */
function arrayIncludesWith(array, value, comparator) {
  var index = -1,
      length = array ? array.length : 0;

  while (++index < length) {
    if (comparator(value, array[index])) {
      return true;
    }
  }
  return false;
}

/**
 * A specialized version of `_.map` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the new mapped array.
 */
function arrayMap(array, iteratee) {
  var index = -1,
      length = array ? array.length : 0,
      result = Array(length);

  while (++index < length) {
    result[index] = iteratee(array[index], index, array);
  }
  return result;
}

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/**
 * The base implementation of `_.findIndex` and `_.findLastIndex` without
 * support for iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Function} predicate The function invoked per iteration.
 * @param {number} fromIndex The index to search from.
 * @param {boolean} [fromRight] Specify iterating from right to left.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseFindIndex(array, predicate, fromIndex, fromRight) {
  var length = array.length,
      index = fromIndex + (fromRight ? 1 : -1);

  while ((fromRight ? index-- : ++index < length)) {
    if (predicate(array[index], index, array)) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} value The value to search for.
 * @param {number} fromIndex The index to search from.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function baseIndexOf(array, value, fromIndex) {
  if (value !== value) {
    return baseFindIndex(array, baseIsNaN, fromIndex);
  }
  var index = fromIndex - 1,
      length = array.length;

  while (++index < length) {
    if (array[index] === value) {
      return index;
    }
  }
  return -1;
}

/**
 * The base implementation of `_.isNaN` without support for number objects.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
 */
function baseIsNaN(value) {
  return value !== value;
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/**
 * Checks if a cache value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Symbol = root.Symbol,
    propertyIsEnumerable = objectProto.propertyIsEnumerable,
    splice = arrayProto.splice,
    spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map'),
    nativeCreate = getNative(Object, 'create');

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  return this.has(key) && delete this.__data__[key];
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries ? entries.length : 0;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  return getMapData(this, key)['delete'](key);
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  getMapData(this, key).set(key, value);
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values ? values.length : 0;

  this.__data__ = new MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of methods like `_.difference` without support
 * for excluding multiple arrays or iteratee shorthands.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {Array} values The values to exclude.
 * @param {Function} [iteratee] The iteratee invoked per element.
 * @param {Function} [comparator] The comparator invoked per element.
 * @returns {Array} Returns the new array of filtered values.
 */
function baseDifference(array, values, iteratee, comparator) {
  var index = -1,
      includes = arrayIncludes,
      isCommon = true,
      length = array.length,
      result = [],
      valuesLength = values.length;

  if (!length) {
    return result;
  }
  if (iteratee) {
    values = arrayMap(values, baseUnary(iteratee));
  }
  if (comparator) {
    includes = arrayIncludesWith;
    isCommon = false;
  }
  else if (values.length >= LARGE_ARRAY_SIZE) {
    includes = cacheHas;
    isCommon = false;
    values = new SetCache(values);
  }
  outer:
  while (++index < length) {
    var value = array[index],
        computed = iteratee ? iteratee(value) : value;

    value = (comparator || value !== 0) ? value : 0;
    if (isCommon && computed === computed) {
      var valuesIndex = valuesLength;
      while (valuesIndex--) {
        if (values[valuesIndex] === computed) {
          continue outer;
        }
      }
      result.push(value);
    }
    else if (!includes(values, computed, comparator)) {
      result.push(value);
    }
  }
  return result;
}

/**
 * The base implementation of `_.flatten` with support for restricting flattening.
 *
 * @private
 * @param {Array} array The array to flatten.
 * @param {number} depth The maximum recursion depth.
 * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
 * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
 * @param {Array} [result=[]] The initial result value.
 * @returns {Array} Returns the new flattened array.
 */
function baseFlatten(array, depth, predicate, isStrict, result) {
  var index = -1,
      length = array.length;

  predicate || (predicate = isFlattenable);
  result || (result = []);

  while (++index < length) {
    var value = array[index];
    if (depth > 0 && predicate(value)) {
      if (depth > 1) {
        // Recursively flatten arrays (susceptible to call stack limits).
        baseFlatten(value, depth - 1, predicate, isStrict, result);
      } else {
        arrayPush(result, value);
      }
    } else if (!isStrict) {
      result[result.length] = value;
    }
  }
  return result;
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.rest` which doesn't validate or coerce arguments.
 *
 * @private
 * @param {Function} func The function to apply a rest parameter to.
 * @param {number} [start=func.length-1] The start position of the rest parameter.
 * @returns {Function} Returns the new function.
 */
function baseRest(func, start) {
  start = nativeMax(start === undefined ? (func.length - 1) : start, 0);
  return function() {
    var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);

    while (++index < length) {
      array[index] = args[start + index];
    }
    index = -1;
    var otherArgs = Array(start + 1);
    while (++index < start) {
      otherArgs[index] = args[index];
    }
    otherArgs[start] = array;
    return apply(func, this, otherArgs);
  };
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * Checks if `value` is a flattenable `arguments` object or array.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
 */
function isFlattenable(value) {
  return isArray(value) || isArguments(value) ||
    !!(spreadableSymbol && value && value[spreadableSymbol]);
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to process.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Creates an array of `array` values not included in the other given arrays
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons. The order of result values is determined by the
 * order they occur in the first array.
 *
 * **Note:** Unlike `_.pullAll`, this method returns a new array.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Array
 * @param {Array} array The array to inspect.
 * @param {...Array} [values] The values to exclude.
 * @returns {Array} Returns the new array of filtered values.
 * @see _.without, _.xor
 * @example
 *
 * _.difference([2, 1], [2, 3]);
 * // => [1]
 */
var difference = baseRest(function(array, values) {
  return isArrayLikeObject(array)
    ? baseDifference(array, baseFlatten(values, 1, isArrayLikeObject, true))
    : [];
});

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
function isArguments(value) {
  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * This method is like `_.isArrayLike` except that it also checks if `value`
 * is an object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array-like object,
 *  else `false`.
 * @example
 *
 * _.isArrayLikeObject([1, 2, 3]);
 * // => true
 *
 * _.isArrayLikeObject(document.body.children);
 * // => true
 *
 * _.isArrayLikeObject('abc');
 * // => false
 *
 * _.isArrayLikeObject(_.noop);
 * // => false
 */
function isArrayLikeObject(value) {
  return isObjectLike(value) && isArrayLike(value);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8-9 which returns 'object' for typed array and other constructors.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = difference;


/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Keychain = void 0;
class Keychain {
    constructor(context, serviceId, Logger) {
        this.context = context;
        this.serviceId = serviceId;
        this.Logger = Logger;
    }
    async setToken(token) {
        try {
            return await this.context.secrets.store(this.serviceId, token);
        }
        catch (e) {
            // Ignore
            this.Logger.error(`Setting token failed: ${e}`);
        }
    }
    async getToken() {
        try {
            const secret = await this.context.secrets.get(this.serviceId);
            if (secret && secret !== '[]') {
                this.Logger.trace('Token acquired from secret storage.');
            }
            return secret;
        }
        catch (e) {
            // Ignore
            this.Logger.error(`Getting token failed: ${e}`);
            return Promise.resolve(undefined);
        }
    }
    async deleteToken() {
        try {
            return await this.context.secrets.delete(this.serviceId);
        }
        catch (e) {
            // Ignore
            this.Logger.error(`Deleting token failed: ${e}`);
            return Promise.resolve(undefined);
        }
    }
}
exports.Keychain = Keychain;


/***/ }),
/* 15 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GitHubEnterpriseServer = exports.GitHubServer = exports.NETWORK_ERROR = void 0;
const nls = __importStar(__webpack_require__(16));
const vscode = __importStar(__webpack_require__(1));
const node_fetch_1 = __importDefault(__webpack_require__(19));
const uuid_1 = __webpack_require__(3);
const utils_1 = __webpack_require__(20);
const env_1 = __webpack_require__(21);
const authServer_1 = __webpack_require__(22);
const path = __webpack_require__(23);
const util_1 = __webpack_require__(25);
const localize = nls.loadMessageBundle();
const CLIENT_ID = {}.IDE_EDITOR_SERVER_GITHUB_CLIENT_ID || '94d1f810aa2c6748ce01';
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
// TODO: change to stable when that happens
const GITHUB_TOKEN_URL = 'https://vscode.dev/codeExchangeProxyEndpoints/github/login/oauth/access_token';
exports.NETWORK_ERROR = 'network error';
const REDIRECT_URL_STABLE = 'https://vscode.dev/redirect';
const REDIRECT_URL_INSIDERS = 'https://insiders.vscode.dev/redirect';
class UriEventHandler extends vscode.EventEmitter {
    constructor(Logger) {
        super();
        this.Logger = Logger;
    }
    handleUri(uri) {
        this.Logger.trace('Handling Uri...');
        this.fire(uri);
    }
}
async function getScopes(token, serverUri, logger) {
    try {
        logger.info('Getting token scopes...');
        const result = await (0, node_fetch_1.default)(serverUri.toString(), {
            headers: {
                Authorization: `token ${token}`,
                'User-Agent': 'Visual-Studio-Code',
            },
        });
        if (result.ok) {
            const scopes = result.headers.get('X-OAuth-Scopes');
            return scopes ? scopes.split(',').map((scope) => scope.trim()) : [];
        }
        else {
            logger.error(`Getting scopes failed: ${result.statusText}`);
            throw new Error(result.statusText);
        }
    }
    catch (ex) {
        logger.error(ex.message);
        throw new Error(exports.NETWORK_ERROR);
    }
}
async function getUserInfo(token, serverUri, logger) {
    let result;
    try {
        logger.info('Getting user info...');
        result = await (0, node_fetch_1.default)(serverUri.toString(), {
            headers: {
                Authorization: `token ${token}`,
                'User-Agent': 'Visual-Studio-Code',
            },
        });
    }
    catch (ex) {
        logger.error(ex.message);
        throw new Error(exports.NETWORK_ERROR);
    }
    if (result.ok) {
        try {
            const json = await result.json();
            logger.info('Got account info!');
            return { id: json.id, accountName: json.login };
        }
        catch (e) {
            logger.error(`Unexpected error parsing response from GitHub: ${e.message ?? e}`);
            throw e;
        }
    }
    else {
        // either display the response message or the http status text
        let errorMessage = result.statusText;
        try {
            const json = await result.json();
            if (json.message) {
                errorMessage = json.message;
            }
        }
        catch (err) {
            // noop
        }
        logger.error(`Getting account info failed: ${errorMessage}`);
        throw new Error(errorMessage);
    }
}
async function getUserEmail(token, serverUri, logger) {
    let result;
    try {
        logger.info('Getting user email...');
        result = await (0, node_fetch_1.default)(serverUri.toString(), {
            headers: {
                Authorization: `token ${token}`,
                'User-Agent': 'Visual-Studio-Code',
            },
        });
    }
    catch (ex) {
        logger.error(ex.message);
        throw new Error(exports.NETWORK_ERROR);
    }
    if (result.ok) {
        try {
            const json = await result.json();
            logger.info('Got account email!');
            return json;
        }
        catch (e) {
            logger.error(`Unexpected error parsing response from GitHub: ${e.message ?? e}`);
            return [];
        }
    }
    else {
        // either display the response message or the http status text
        let errorMessage = result.statusText;
        try {
            const json = await result.json();
            if (json.message) {
                errorMessage = JSON.stringify(json);
            }
        }
        catch (err) {
            // noop
        }
        logger.error(`Getting email info failed: ${serverUri.toString()}, ${token}, ${errorMessage}`);
        return [];
    }
}
class GitHubServer {
    constructor(_supportDeviceCodeFlow, _logger, _telemetryReporter) {
        this._supportDeviceCodeFlow = _supportDeviceCodeFlow;
        this._logger = _logger;
        this._telemetryReporter = _telemetryReporter;
        this.friendlyName = 'GitHub';
        this.type = util_1.AuthProviderType.github;
        this._pendingNonces = new Map();
        this._codeExchangePromises = new Map();
        this._uriHandler = new UriEventHandler(this._logger);
        this.handleUri = (scopes) => (uri, resolve, reject) => {
            const query = new URLSearchParams(uri.query);
            const code = query.get('code');
            const nonce = query.get('nonce');
            if (!code) {
                reject(new Error('No code'));
                return;
            }
            if (!nonce) {
                reject(new Error('No nonce'));
                return;
            }
            const acceptedNonces = this._pendingNonces.get(scopes) || [];
            if (!acceptedNonces.includes(nonce)) {
                // A common scenario of this happening is if you:
                // 1. Trigger a sign in with one set of scopes
                // 2. Before finishing 1, you trigger a sign in with a different set of scopes
                // In this scenario we should just return and wait for the next UriHandler event
                // to run as we are probably still waiting on the user to hit 'Continue'
                this._logger.info('Nonce not found in accepted nonces. Skipping this execution...');
                return;
            }
            resolve(this.exchangeCodeForToken(code));
        };
        this._disposable = vscode.window.registerUriHandler(this._uriHandler);
        this.getRedirectEndpoint = vscode.commands
            .executeCommand('workbench.getCodeExchangeProxyEndpoints')
            .then((proxyEndpoints) => {
            // If we are running in insiders vscode.dev, then ensure we use the redirect route on that.
            let redirectUri = REDIRECT_URL_STABLE;
            if (proxyEndpoints?.github && new URL(proxyEndpoints.github).hostname === 'insiders.vscode.dev') {
                redirectUri = REDIRECT_URL_INSIDERS;
            }
            return redirectUri;
        });
    }
    async getEmail(token) {
        const emails = await getUserEmail(token, this.getServerUri('/user/emails'), this._logger);
        return emails?.find((item) => item.primary)?.email;
    }
    dispose() {
        this._disposable.dispose();
    }
    // TODO@joaomoreno TODO@TylerLeonhardt
    async isNoCorsEnvironment() {
        const uri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://vscode.github-authentication/dummy`));
        return ((uri.scheme === 'https' && /^((insiders\.)?vscode|github)\./.test(uri.authority)) ||
            (uri.scheme === 'http' && /^localhost/.test(uri.authority)));
    }
    async login(scopes) {
        this._logger.info(`Logging in for the following scopes: ${scopes}`);
        // Used for showing a friendlier message to the user when the explicitly cancel a flow.
        let userCancelled;
        const yes = localize('yes', 'Yes');
        const no = localize('no', 'No');
        const promptToContinue = async () => {
            if (userCancelled === undefined) {
                // We haven't had a failure yet so wait to prompt
                return;
            }
            const message = userCancelled
                ? localize('userCancelledMessage', 'Having trouble logging in? Would you like to try a different way?')
                : localize('otherReasonMessage', 'You have not yet finished authorizing this extension to use GitHub. Would you like to keep trying?');
            const result = await vscode.window.showWarningMessage(message, yes, no);
            if (result !== yes) {
                throw new Error('Cancelled');
            }
        };
        const nonce = (0, uuid_1.v4)();
        const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://vscode.github-authentication/did-authenticate?nonce=${encodeURIComponent(nonce)}`));
        const supported = (0, env_1.isSupportedEnvironment)(callbackUri);
        if (supported) {
            try {
                return await this.doLoginWithoutLocalServer(scopes, nonce, callbackUri);
            }
            catch (e) {
                this._logger.error(e);
                userCancelled = e.message ?? e === 'User Cancelled';
            }
        }
        // Starting a local server isn't supported in web
        if (vscode.env.uiKind === vscode.UIKind.Desktop) {
            try {
                await promptToContinue();
                return await this.doLoginWithLocalServer(scopes);
            }
            catch (e) {
                this._logger.error(e);
                userCancelled = e.message ?? e === 'User Cancelled';
            }
        }
        if (this._supportDeviceCodeFlow) {
            try {
                await promptToContinue();
                return await this.doLoginDeviceCodeFlow(scopes);
            }
            catch (e) {
                this._logger.error(e);
                userCancelled = e.message ?? e === 'User Cancelled';
            }
        }
        else if (!supported) {
            try {
                await promptToContinue();
                return await this.doLoginWithPat(scopes);
            }
            catch (e) {
                this._logger.error(e);
                userCancelled = e.message ?? e === 'User Cancelled';
            }
        }
        throw new Error(userCancelled ? 'Cancelled' : 'No auth flow succeeded.');
    }
    async doLoginWithoutLocalServer(scopes, nonce, callbackUri) {
        this._logger.info(`Trying without local server... (${scopes})`);
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('signingIn', 'Signing in to github.com...'),
            cancellable: true,
        }, async (_, token) => {
            const existingNonces = this._pendingNonces.get(scopes) || [];
            this._pendingNonces.set(scopes, [...existingNonces, nonce]);
            const redirectUri = await this.getRedirectEndpoint;
            const searchParams = new URLSearchParams([
                ['client_id', CLIENT_ID],
                ['redirect_uri', redirectUri],
                ['scope', scopes],
                ['state', encodeURIComponent(callbackUri.toString(true))],
            ]);
            const uri = vscode.Uri.parse(`${GITHUB_AUTHORIZE_URL}?${searchParams.toString()}`);
            await vscode.env.openExternal(uri);
            // Register a single listener for the URI callback, in case the user starts the login process multiple times
            // before completing it.
            let codeExchangePromise = this._codeExchangePromises.get(scopes);
            if (!codeExchangePromise) {
                codeExchangePromise = (0, utils_1.promiseFromEvent)(this._uriHandler.event, this.handleUri(scopes));
                this._codeExchangePromises.set(scopes, codeExchangePromise);
            }
            try {
                return await Promise.race([
                    codeExchangePromise.promise,
                    new Promise((_, reject) => setTimeout(() => reject('Cancelled'), 60000)),
                    (0, utils_1.promiseFromEvent)(token.onCancellationRequested, (_, __, reject) => {
                        reject('User Cancelled');
                    }).promise,
                ]);
            }
            finally {
                this._pendingNonces.delete(scopes);
                codeExchangePromise?.cancel.fire();
                this._codeExchangePromises.delete(scopes);
            }
        });
    }
    async doLoginWithLocalServer(scopes) {
        this._logger.info(`Trying with local server... (${scopes})`);
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('signingInAnotherWay', 'Signing in to github.com...'),
            cancellable: true,
        }, async (_, token) => {
            const redirectUri = await this.getRedirectEndpoint;
            const searchParams = new URLSearchParams([
                ['client_id', CLIENT_ID],
                ['redirect_uri', redirectUri],
                ['scope', scopes],
            ]);
            const loginUrl = `${GITHUB_AUTHORIZE_URL}?${searchParams.toString()}`;
            const server = new authServer_1.LoopbackAuthServer(path.join(__dirname, '../media'), loginUrl);
            const port = await server.start();
            let codeToExchange;
            try {
                vscode.env.openExternal(vscode.Uri.parse(`http://127.0.0.1:${port}/signin?nonce=${encodeURIComponent(server.nonce)}`));
                const { code } = await Promise.race([
                    server.waitForOAuthResponse(),
                    new Promise((_, reject) => setTimeout(() => reject('Cancelled'), 60000)),
                    (0, utils_1.promiseFromEvent)(token.onCancellationRequested, (_, __, reject) => {
                        reject('User Cancelled');
                    }).promise,
                ]);
                codeToExchange = code;
            }
            finally {
                setTimeout(() => {
                    void server.stop();
                }, 5000);
            }
            const accessToken = await this.exchangeCodeForToken(codeToExchange);
            return accessToken;
        });
    }
    async doLoginDeviceCodeFlow(scopes) {
        this._logger.info(`Trying device code flow... (${scopes})`);
        // Get initial device code
        const uri = `https://github.com/login/device/code?client_id=${CLIENT_ID}&scope=${scopes}`;
        const result = await (0, node_fetch_1.default)(uri, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
        });
        if (!result.ok) {
            throw new Error(`Failed to get one-time code: ${await result.text()}`);
        }
        const json = (await result.json());
        const modalResult = await vscode.window.showInformationMessage(localize('code.title', 'Your Code: {0}', json.user_code), {
            modal: true,
            detail: localize('code.detail', 'To finish authenticating, navigate to GitHub and paste in the above one-time code.'),
        }, 'Copy & Continue to GitHub');
        if (modalResult !== 'Copy & Continue to GitHub') {
            throw new Error('User Cancelled');
        }
        await vscode.env.clipboard.writeText(json.user_code);
        const uriToOpen = await vscode.env.asExternalUri(vscode.Uri.parse(json.verification_uri));
        await vscode.env.openExternal(uriToOpen);
        return await this.waitForDeviceCodeAccessToken(json);
    }
    async doLoginWithPat(scopes) {
        this._logger.info(`Trying to retrieve PAT... (${scopes})`);
        const token = await vscode.window.showInputBox({ prompt: 'GitHub Personal Access Token', ignoreFocusOut: true });
        if (!token) {
            throw new Error('User Cancelled');
        }
        const tokenScopes = await getScopes(token, this.getServerUri('/'), this._logger); // Example: ['repo', 'user']
        const scopesList = scopes.split(' '); // Example: 'read:user repo user:email'
        if (!scopesList.every((scope) => {
            const included = tokenScopes.includes(scope);
            if (included || !scope.includes(':')) {
                return included;
            }
            return scope.split(':').some((splitScopes) => {
                return tokenScopes.includes(splitScopes);
            });
        })) {
            throw new Error(`The provided token does not match the requested scopes: ${scopes}`);
        }
        return token;
    }
    async waitForDeviceCodeAccessToken(json) {
        return await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            cancellable: true,
            title: localize('progress', 'Open [{0}]({0}) in a new tab and paste your one-time code: {1}', json.verification_uri, json.user_code),
        }, async (_, token) => {
            const refreshTokenUri = `https://github.com/login/oauth/access_token?client_id=${CLIENT_ID}&device_code=${json.device_code}&grant_type=urn:ietf:params:oauth:grant-type:device_code`;
            // Try for 2 minutes
            const attempts = 120 / json.interval;
            for (let i = 0; i < attempts; i++) {
                await new Promise((resolve) => setTimeout(resolve, json.interval * 1000));
                if (token.isCancellationRequested) {
                    throw new Error('User Cancelled');
                }
                let accessTokenResult;
                try {
                    accessTokenResult = await (0, node_fetch_1.default)(refreshTokenUri, {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                        },
                    });
                }
                catch {
                    continue;
                }
                if (!accessTokenResult.ok) {
                    continue;
                }
                const accessTokenJson = await accessTokenResult.json();
                if (accessTokenJson.error === 'authorization_pending') {
                    continue;
                }
                if (accessTokenJson.error) {
                    throw new Error(accessTokenJson.error_description);
                }
                return accessTokenJson.access_token;
            }
            throw new Error('Cancelled');
        });
    }
    async exchangeCodeForToken(code) {
        this._logger.info('Exchanging code for token...');
        const proxyEndpoints = await vscode.commands.executeCommand('workbench.getCodeExchangeProxyEndpoints');
        const endpointUrl = proxyEndpoints?.github ? `${proxyEndpoints.github}login/oauth/access_token` : GITHUB_TOKEN_URL;
        const body = `code=${code}`;
        const result = await (0, node_fetch_1.default)(endpointUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': body.toString(),
            },
            body,
        });
        if (result.ok) {
            const json = await result.json();
            this._logger.info('Token exchange success!');
            return json.access_token;
        }
        else {
            const text = await result.text();
            const error = new Error(text);
            error.name = 'GitHubTokenExchangeError';
            throw error;
        }
    }
    getServerUri(path = '') {
        const apiUri = vscode.Uri.parse('https://api.github.com');
        return vscode.Uri.parse(`${apiUri.scheme}://${apiUri.authority}${path}`);
    }
    getUserInfo(token) {
        return getUserInfo(token, this.getServerUri('/user'), this._logger);
    }
    async sendAdditionalTelemetryInfo(token) {
        if (!vscode.env.isTelemetryEnabled) {
            return;
        }
        const nocors = await this.isNoCorsEnvironment();
        if (nocors) {
            return;
        }
        try {
            const result = await (0, node_fetch_1.default)('https://education.github.com/api/user', {
                headers: {
                    Authorization: `token ${token}`,
                    'faculty-check-preview': 'true',
                    'User-Agent': 'Visual-Studio-Code',
                },
            });
            if (result.ok) {
                const json = await result.json();
                /* __GDPR__
                            "session" : {
                                "owner": "TylerLeonhardt",
                                "isEdu": { "classification": "NonIdentifiableDemographicInfo", "purpose": "FeatureInsight" }
                            }
                        */
                this._telemetryReporter.sendTelemetryEvent('session', {
                    isEdu: json.student ? 'student' : json.faculty ? 'faculty' : 'none',
                });
            }
        }
        catch (e) {
            // No-op
        }
    }
    async checkEnterpriseVersion(token) {
        try {
            const result = await (0, node_fetch_1.default)(this.getServerUri('/meta').toString(), {
                headers: {
                    Authorization: `token ${token}`,
                    'User-Agent': 'Visual-Studio-Code',
                },
            });
            if (!result.ok) {
                return;
            }
            const json = await result.json();
            /* __GDPR__
                      "ghe-session" : {
                          "owner": "TylerLeonhardt",
                          "version": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                      }
                  */
            this._telemetryReporter.sendTelemetryEvent('ghe-session', {
                version: json.installed_version,
            });
        }
        catch {
            // No-op
        }
    }
}
exports.GitHubServer = GitHubServer;
class GitHubEnterpriseServer {
    constructor(_logger, telemetryReporter) {
        this._logger = _logger;
        this.telemetryReporter = telemetryReporter;
        this.friendlyName = 'GitHub Enterprise';
        this.type = util_1.AuthProviderType.githubEnterprise;
    }
    getEmail(token) {
        return null;
    }
    dispose() { }
    async login(scopes) {
        this._logger.info(`Logging in for the following scopes: ${scopes}`);
        const token = await vscode.window.showInputBox({ prompt: 'GitHub Personal Access Token', ignoreFocusOut: true });
        if (!token) {
            throw new Error('Sign in failed: No token provided');
        }
        const tokenScopes = await getScopes(token, this.getServerUri('/'), this._logger); // Example: ['repo', 'user']
        const scopesList = scopes.split(' '); // Example: 'read:user repo user:email'
        if (!scopesList.every((scope) => {
            const included = tokenScopes.includes(scope);
            if (included || !scope.includes(':')) {
                return included;
            }
            return scope.split(':').some((splitScopes) => {
                return tokenScopes.includes(splitScopes);
            });
        })) {
            throw new Error(`The provided token does not match the requested scopes: ${scopes}`);
        }
        return token;
    }
    getServerUri(path = '') {
        const apiUri = vscode.Uri.parse(vscode.workspace.getConfiguration('github-enterprise').get('uri') || '', true);
        return vscode.Uri.parse(`${apiUri.scheme}://${apiUri.authority}/api/v3${path}`);
    }
    async getUserInfo(token) {
        return getUserInfo(token, this.getServerUri('/user'), this._logger);
    }
    async sendAdditionalTelemetryInfo(token) {
        try {
            const result = await (0, node_fetch_1.default)(this.getServerUri('/meta').toString(), {
                headers: {
                    Authorization: `token ${token}`,
                    'User-Agent': 'Visual-Studio-Code',
                },
            });
            if (!result.ok) {
                return;
            }
            const json = await result.json();
            /* __GDPR__
                      "ghe-session" : {
                          "owner": "TylerLeonhardt",
                          "version": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                      }
                  */
            this.telemetryReporter.sendTelemetryEvent('ghe-session', {
                version: json.installed_version,
            });
        }
        catch {
            // No-op
        }
    }
}
exports.GitHubEnterpriseServer = GitHubEnterpriseServer;


/***/ }),
/* 16 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.config = exports.loadMessageBundle = void 0;
var ral_1 = __webpack_require__(17);
var common_1 = __webpack_require__(18);
var common_2 = __webpack_require__(18);
Object.defineProperty(exports, "MessageFormat", ({ enumerable: true, get: function () { return common_2.MessageFormat; } }));
Object.defineProperty(exports, "BundleFormat", ({ enumerable: true, get: function () { return common_2.BundleFormat; } }));
function loadMessageBundle(_file) {
    return function (key, message) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (typeof key === 'number') {
            throw new Error("Browser implementation does currently not support externalized strings.");
        }
        else {
            return common_1.localize.apply(void 0, __spreadArrays([key, message], args));
        }
    };
}
exports.loadMessageBundle = loadMessageBundle;
function config(options) {
    common_1.setPseudo((options === null || options === void 0 ? void 0 : options.locale.toLowerCase()) === 'pseudo');
    return loadMessageBundle;
}
exports.config = config;
ral_1.default.install(Object.freeze({
    loadMessageBundle: loadMessageBundle,
    config: config
}));
//# sourceMappingURL=main.js.map

/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
var _ral;
function RAL() {
    if (_ral === undefined) {
        throw new Error("No runtime abstraction layer installed");
    }
    return _ral;
}
(function (RAL) {
    function install(ral) {
        if (ral === undefined) {
            throw new Error("No runtime abstraction layer provided");
        }
        _ral = ral;
    }
    RAL.install = install;
})(RAL || (RAL = {}));
exports["default"] = RAL;
//# sourceMappingURL=ral.js.map

/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.config = exports.loadMessageBundle = exports.localize = exports.format = exports.setPseudo = exports.isPseudo = exports.isDefined = exports.BundleFormat = exports.MessageFormat = void 0;
var ral_1 = __webpack_require__(17);
var MessageFormat;
(function (MessageFormat) {
    MessageFormat["file"] = "file";
    MessageFormat["bundle"] = "bundle";
    MessageFormat["both"] = "both";
})(MessageFormat = exports.MessageFormat || (exports.MessageFormat = {}));
var BundleFormat;
(function (BundleFormat) {
    // the nls.bundle format
    BundleFormat["standalone"] = "standalone";
    BundleFormat["languagePack"] = "languagePack";
})(BundleFormat = exports.BundleFormat || (exports.BundleFormat = {}));
var LocalizeInfo;
(function (LocalizeInfo) {
    function is(value) {
        var candidate = value;
        return candidate && isDefined(candidate.key) && isDefined(candidate.comment);
    }
    LocalizeInfo.is = is;
})(LocalizeInfo || (LocalizeInfo = {}));
function isDefined(value) {
    return typeof value !== 'undefined';
}
exports.isDefined = isDefined;
exports.isPseudo = false;
function setPseudo(pseudo) {
    exports.isPseudo = pseudo;
}
exports.setPseudo = setPseudo;
function format(message, args) {
    var result;
    if (exports.isPseudo) {
        // FF3B and FF3D is the Unicode zenkaku representation for [ and ]
        message = '\uFF3B' + message.replace(/[aouei]/g, '$&$&') + '\uFF3D';
    }
    if (args.length === 0) {
        result = message;
    }
    else {
        result = message.replace(/\{(\d+)\}/g, function (match, rest) {
            var index = rest[0];
            var arg = args[index];
            var replacement = match;
            if (typeof arg === 'string') {
                replacement = arg;
            }
            else if (typeof arg === 'number' || typeof arg === 'boolean' || arg === void 0 || arg === null) {
                replacement = String(arg);
            }
            return replacement;
        });
    }
    return result;
}
exports.format = format;
function localize(_key, message) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    return format(message, args);
}
exports.localize = localize;
function loadMessageBundle(file) {
    return ral_1.default().loadMessageBundle(file);
}
exports.loadMessageBundle = loadMessageBundle;
function config(opts) {
    return ral_1.default().config(opts);
}
exports.config = config;
//# sourceMappingURL=common.js.map

/***/ }),
/* 19 */
/***/ ((module, exports) => {

"use strict";


// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
	// the only reliable means to get the global object is
	// `Function('return this')()`
	// However, this causes CSP violations in Chrome apps.
	if (typeof self !== 'undefined') { return self; }
	if (typeof window !== 'undefined') { return window; }
	if (typeof global !== 'undefined') { return global; }
	throw new Error('unable to locate global object');
}

var global = getGlobal();

module.exports = exports = global.fetch;

// Needed for TypeScript and Webpack.
if (global.fetch) {
	exports["default"] = global.fetch.bind(global);
}

exports.Headers = global.Headers;
exports.Request = global.Request;
exports.Response = global.Response;

/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StopWatch = exports.arrayEquals = exports.promiseFromEvent = exports.onceEvent = exports.filterEvent = void 0;
const vscode_1 = __webpack_require__(1);
function filterEvent(event, filter) {
    return (listener, thisArgs = null, disposables) => event((e) => filter(e) && listener.call(thisArgs, e), null, disposables);
}
exports.filterEvent = filterEvent;
function onceEvent(event) {
    return (listener, thisArgs = null, disposables) => {
        const result = event((e) => {
            result.dispose();
            return listener.call(thisArgs, e);
        }, null, disposables);
        return result;
    };
}
exports.onceEvent = onceEvent;
const passthrough = (value, resolve) => resolve(value);
/**
 * Return a promise that resolves with the next emitted event, or with some future
 * event as decided by an adapter.
 *
 * If specified, the adapter is a function that will be called with
 * `(event, resolve, reject)`. It will be called once per event until it resolves or
 * rejects.
 *
 * The default adapter is the passthrough function `(value, resolve) => resolve(value)`.
 *
 * @param event the event
 * @param adapter controls resolution of the returned promise
 * @returns a promise that resolves or rejects as specified by the adapter
 */
function promiseFromEvent(event, adapter = passthrough) {
    let subscription;
    let cancel = new vscode_1.EventEmitter();
    return {
        promise: new Promise((resolve, reject) => {
            cancel.event((_) => reject('Cancelled'));
            subscription = event((value) => {
                try {
                    Promise.resolve(adapter(value, resolve, reject)).catch(reject);
                }
                catch (error) {
                    reject(error);
                }
            });
        }).then((result) => {
            subscription.dispose();
            return result;
        }, (error) => {
            subscription.dispose();
            throw error;
        }),
        cancel,
    };
}
exports.promiseFromEvent = promiseFromEvent;
function arrayEquals(one, other, itemEquals = (a, b) => a === b) {
    if (one === other) {
        return true;
    }
    if (!one || !other) {
        return false;
    }
    if (one.length !== other.length) {
        return false;
    }
    for (let i = 0, len = one.length; i < len; i++) {
        if (!itemEquals(one[i], other[i])) {
            return false;
        }
    }
    return true;
}
exports.arrayEquals = arrayEquals;
class StopWatch {
    constructor() {
        this._startTime = Date.now();
        this._stopTime = -1;
    }
    stop() {
        this._stopTime = Date.now();
    }
    elapsed() {
        if (this._stopTime !== -1) {
            return this._stopTime - this._startTime;
        }
        return Date.now() - this._startTime;
    }
}
exports.StopWatch = StopWatch;


/***/ }),
/* 21 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isSupportedEnvironment = void 0;
const VALID_DESKTOP_CALLBACK_SCHEMES = [
    'vscode',
    'vscode-insiders',
    // On Windows, some browsers don't seem to redirect back to OSS properly.
    // As a result, you get stuck in the auth flow. We exclude this from the
    // list until we can figure out a way to fix this behavior in browsers.
    // 'code-oss',
    'vscode-wsl',
    'vscode-exploration',
];
function isSupportedEnvironment(uri) {
    return (VALID_DESKTOP_CALLBACK_SCHEMES.includes(uri.scheme) ||
        // vscode.dev & insiders.vscode.dev
        /(?:^|\.)vscode\.dev$/.test(uri.authority) ||
        // github.dev & codespaces
        /(?:^|\.)github\.dev$/.test(uri.authority));
}
exports.isSupportedEnvironment = isSupportedEnvironment;


/***/ }),
/* 22 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createServer = exports.startServer = void 0;
function startServer(_) {
    throw new Error('Not implemented');
}
exports.startServer = startServer;
function createServer(_) {
    throw new Error('Not implemented');
}
exports.createServer = createServer;


/***/ }),
/* 23 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/* provided dependency */ var process = __webpack_require__(24);
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.



function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;


/***/ }),
/* 24 */
/***/ ((module) => {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),
/* 25 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AuthProviderType = exports.DisposableStore = void 0;
class DisposableStore {
    constructor() {
        this.disposables = new Set();
    }
    add(disposable) {
        this.disposables.add(disposable);
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.clear();
    }
}
exports.DisposableStore = DisposableStore;
var AuthProviderType;
(function (AuthProviderType) {
    AuthProviderType["github"] = "github";
    AuthProviderType["githubEnterprise"] = "github-enterprise";
})(AuthProviderType = exports.AuthProviderType || (exports.AuthProviderType = {}));


/***/ }),
/* 26 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ExperimentationTelemetry = void 0;
const vscode = __importStar(__webpack_require__(1));
const vscode_tas_client_1 = __webpack_require__(27);
class ExperimentationTelemetry {
    constructor(context, baseReporter) {
        this.context = context;
        this.baseReporter = baseReporter;
        this.sharedProperties = {};
    }
    async createExperimentationService() {
        let targetPopulation;
        switch (vscode.env.uriScheme) {
            case 'vscode':
                targetPopulation = vscode_tas_client_1.TargetPopulation.Public;
            case 'vscode-insiders':
                targetPopulation = vscode_tas_client_1.TargetPopulation.Insiders;
            case 'vscode-exploration':
                targetPopulation = vscode_tas_client_1.TargetPopulation.Internal;
            case 'code-oss':
                targetPopulation = vscode_tas_client_1.TargetPopulation.Team;
            default:
                targetPopulation = vscode_tas_client_1.TargetPopulation.Public;
        }
        const id = this.context.extension.id;
        const version = this.context.extension.packageJSON.version;
        const experimentationService = (0, vscode_tas_client_1.getExperimentationService)(id, version, targetPopulation, this, this.context.globalState);
        await experimentationService.initialFetch;
        return experimentationService;
    }
    /**
     * @returns A promise that you shouldn't need to await because this is just telemetry.
     */
    async sendTelemetryEvent(eventName, properties, measurements) {
        if (!this.experimentationServicePromise) {
            this.experimentationServicePromise = this.createExperimentationService();
        }
        await this.experimentationServicePromise;
        this.baseReporter.sendTelemetryEvent(eventName, {
            ...this.sharedProperties,
            ...properties,
        }, measurements);
    }
    /**
     * @returns A promise that you shouldn't need to await because this is just telemetry.
     */
    async sendTelemetryErrorEvent(eventName, properties, _measurements) {
        if (!this.experimentationServicePromise) {
            this.experimentationServicePromise = this.createExperimentationService();
        }
        await this.experimentationServicePromise;
        this.baseReporter.sendTelemetryErrorEvent(eventName, {
            ...this.sharedProperties,
            ...properties,
        });
    }
    setSharedProperty(name, value) {
        this.sharedProperties[name] = value;
    }
    postEvent(eventName, props) {
        const event = {};
        for (const [key, value] of props) {
            event[key] = value;
        }
        this.sendTelemetryEvent(eventName, event);
    }
    dispose() {
        return this.baseReporter.dispose();
    }
}
exports.ExperimentationTelemetry = ExperimentationTelemetry;


/***/ }),
/* 27 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
var VSCodeTasClient_1 = __webpack_require__(28);
exports.getExperimentationService = VSCodeTasClient_1.getExperimentationService;
exports.getExperimentationServiceAsync = VSCodeTasClient_1.getExperimentationServiceAsync;
var VSCodeFilterProvider_1 = __webpack_require__(29);
exports.TargetPopulation = VSCodeFilterProvider_1.TargetPopulation;
//# sourceMappingURL=index.js.map

/***/ }),
/* 28 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
const VSCodeFilterProvider_1 = __webpack_require__(29);
const tas_client_1 = __webpack_require__(30);
const vscode = __webpack_require__(1);
const MementoKeyValueStorage_1 = __webpack_require__(110);
const TelemetryDisabledExperimentationService_1 = __webpack_require__(111);
const endpoint = 'https://default.exp-tas.com/vscode/ab';
const telemetryEventName = 'query-expfeature';
const assignmentContextTelemetryPropertyName = 'abexp.assignmentcontext';
const storageKey = 'VSCode.ABExp.FeatureData';
const refetchInterval = 1000 * 60 * 30; // By default it's set up to 30 minutes.
/**
 *
 * @param extensionName The name of the extension.
 * @param extensionVersion The version of the extension.
 * @param telemetry Telemetry implementation.
 * @param targetPopulation An enum containing the target population ('team', 'internal', 'insiders', 'public').
 * @param memento The memento state to be used for cache.
 * @param filterProviders The filter providers.
 */
function getExperimentationService(extensionName, extensionVersion, targetPopulation, telemetry, memento, ...filterProviders) {
    if (!memento) {
        throw new Error('Memento storage was not provided.');
    }
    const config = vscode.workspace.getConfiguration('telemetry');
    const telemetryEnabled = vscode.env.isTelemetryEnabled === undefined
        ? config.get('enableTelemetry', true)
        : vscode.env.isTelemetryEnabled;
    if (!telemetryEnabled) {
        return new TelemetryDisabledExperimentationService_1.default();
    }
    const extensionFilterProvider = new VSCodeFilterProvider_1.VSCodeFilterProvider(extensionName, extensionVersion, targetPopulation);
    const providerList = [extensionFilterProvider, ...filterProviders];
    const keyValueStorage = new MementoKeyValueStorage_1.MementoKeyValueStorage(memento);
    return new tas_client_1.ExperimentationService({
        filterProviders: providerList,
        telemetry: telemetry,
        storageKey: storageKey,
        keyValueStorage: keyValueStorage,
        featuresTelemetryPropertyName: '',
        assignmentContextTelemetryPropertyName: assignmentContextTelemetryPropertyName,
        telemetryEventName: telemetryEventName,
        endpoint: endpoint,
        refetchInterval: refetchInterval,
    });
}
exports.getExperimentationService = getExperimentationService;
/**
 * Returns the experimentation service after waiting on initialize.
 *
 * @param extensionName The name of the extension.
 * @param extensionVersion The version of the extension.
 * @param telemetry Telemetry implementation.
 * @param targetPopulation An enum containing the target population ('team', 'internal', 'insiders', 'public').
 * @param memento The memento state to be used for cache.
 * @param filterProviders The filter providers.
 */
async function getExperimentationServiceAsync(extensionName, extensionVersion, targetPopulation, telemetry, memento, ...filterProviders) {
    const experimentationService = getExperimentationService(extensionName, extensionVersion, targetPopulation, telemetry, memento, ...filterProviders);
    await experimentationService.initializePromise;
    return experimentationService;
}
exports.getExperimentationServiceAsync = getExperimentationServiceAsync;
//# sourceMappingURL=VSCodeTasClient.js.map

/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
const vscode = __webpack_require__(1);
/**
 * Here is where we are going to define the filters we will set.
 */
class VSCodeFilterProvider {
    constructor(extensionName, extensionVersion, targetPopulation) {
        this.extensionName = extensionName;
        this.extensionVersion = extensionVersion;
        this.targetPopulation = targetPopulation;
    }
    /**
     * Returns a version string that can be parsed into a .NET Build object
     * by removing the tag suffix (for example -dev).
     *
     * @param version Version string to be trimmed.
     */
    static trimVersionSuffix(version) {
        const regex = /\-[a-zA-Z0-9]+$/;
        const result = version.split(regex);
        return result[0];
    }
    getFilterValue(filter) {
        switch (filter) {
            case Filters.ApplicationVersion:
                return VSCodeFilterProvider.trimVersionSuffix(vscode.version);
            case Filters.Build:
                return vscode.env.appName;
            case Filters.ClientId:
                return vscode.env.machineId;
            case Filters.ExtensionName:
                return this.extensionName;
            case Filters.ExtensionVersion:
                return VSCodeFilterProvider.trimVersionSuffix(this.extensionVersion);
            case Filters.Language:
                return vscode.env.language;
            case Filters.TargetPopulation:
                return this.targetPopulation;
            default:
                return '';
        }
    }
    getFilters() {
        let filters = new Map();
        let filterValues = Object.values(Filters);
        for (let value of filterValues) {
            filters.set(value, this.getFilterValue(value));
        }
        return filters;
    }
}
exports.VSCodeFilterProvider = VSCodeFilterProvider;
/*
Based upon the official VSCode currently existing filters in the
ExP backend for the VSCode cluster.
https://experimentation.visualstudio.com/Analysis%20and%20Experimentation/_git/AnE.ExP.TAS.TachyonHost.Configuration?path=%2FConfigurations%2Fvscode%2Fvscode.json&version=GBmaster
"X-MSEdge-Market": "detection.market",
"X-FD-Corpnet": "detection.corpnet",
"X-VSCode–AppVersion": "appversion",
"X-VSCode-Build": "build",
"X-MSEdge-ClientId": "clientid",
"X-VSCode-ExtensionName": "extensionname",
"X-VSCode-ExtensionVersion": "extensionversion",
"X-VSCode-TargetPopulation": "targetpopulation",
"X-VSCode-Language": "language"
*/
/**
 * All available filters, can be updated.
 */
var Filters;
(function (Filters) {
    /**
     * The market in which the extension is distributed.
     */
    Filters["Market"] = "X-MSEdge-Market";
    /**
     * The corporation network.
     */
    Filters["CorpNet"] = "X-FD-Corpnet";
    /**
     * Version of the application which uses experimentation service.
     */
    Filters["ApplicationVersion"] = "X-VSCode-AppVersion";
    /**
     * Insiders vs Stable.
     */
    Filters["Build"] = "X-VSCode-Build";
    /**
     * Client Id which is used as primary unit for the experimentation.
     */
    Filters["ClientId"] = "X-MSEdge-ClientId";
    /**
     * Extension header.
     */
    Filters["ExtensionName"] = "X-VSCode-ExtensionName";
    /**
     * The version of the extension.
     */
    Filters["ExtensionVersion"] = "X-VSCode-ExtensionVersion";
    /**
     * The language in use by VS Code
     */
    Filters["Language"] = "X-VSCode-Language";
    /**
     * The target population.
     * This is used to separate internal, early preview, GA, etc.
     */
    Filters["TargetPopulation"] = "X-VSCode-TargetPopulation";
})(Filters = exports.Filters || (exports.Filters = {}));
/**
 * Specifies the target population for the experimentation filter.
 */
var TargetPopulation;
(function (TargetPopulation) {
    TargetPopulation["Team"] = "team";
    TargetPopulation["Internal"] = "internal";
    TargetPopulation["Insiders"] = "insider";
    TargetPopulation["Public"] = "public";
})(TargetPopulation = exports.TargetPopulation || (exports.TargetPopulation = {}));
//# sourceMappingURL=VSCodeFilterProvider.js.map

/***/ }),
/* 30 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
var ExperimentationService_1 = __webpack_require__(31);
exports.ExperimentationService = ExperimentationService_1.ExperimentationService;
//# sourceMappingURL=index.js.map

/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
const TasApiFeatureProvider_1 = __webpack_require__(32);
const AxiosHttpClient_1 = __webpack_require__(35);
const ExperimentationServiceAutoPolling_1 = __webpack_require__(106);
/**
 * Experimentation service to provide functionality of A/B experiments:
 * - reading flights;
 * - caching current set of flights;
 * - get answer on if flights are enabled.
 */
class ExperimentationService extends ExperimentationServiceAutoPolling_1.ExperimentationServiceAutoPolling {
    constructor(options) {
        super(options.telemetry, options.filterProviders || [], // Defaulted to empty array.
        options.refetchInterval != null
            ? options.refetchInterval
            : // If no fetch interval is provided, refetch functionality is turned off.
                0, options.assignmentContextTelemetryPropertyName, options.telemetryEventName, options.storageKey, options.keyValueStorage);
        this.options = options;
        this.invokeInit();
    }
    init() {
        // set feature providers to be an empty array.
        this.featureProviders = [];
        // Add WebApi feature provider.
        this.addFeatureProvider(new TasApiFeatureProvider_1.TasApiFeatureProvider(new AxiosHttpClient_1.AxiosHttpClient(this.options.endpoint), this.telemetry, this.filterProviders));
        // This will start polling the TAS.
        super.init();
    }
}
exports.ExperimentationService = ExperimentationService;
ExperimentationService.REFRESH_RATE_IN_MINUTES = 30;
//# sourceMappingURL=ExperimentationService.js.map

/***/ }),
/* 32 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
const FilteredFeatureProvider_1 = __webpack_require__(33);
/**
 * Feature provider implementation that calls the TAS web service to get the most recent active features.
 */
class TasApiFeatureProvider extends FilteredFeatureProvider_1.FilteredFeatureProvider {
    constructor(httpClient, telemetry, filterProviders) {
        super(telemetry, filterProviders);
        this.httpClient = httpClient;
        this.telemetry = telemetry;
        this.filterProviders = filterProviders;
    }
    /**
     * Method that handles fetching of latest data (in this case, flights) from the provider.
     */
    async fetch() {
        // We get the filters that will be sent as headers.
        let filters = this.getFilters();
        let headers = {};
        // Filters are handled using Map<string,any> therefore we need to
        // convert these filters into something axios can take as headers.
        for (let key of filters.keys()) {
            const filterValue = filters.get(key);
            headers[key] = filterValue;
        }
        //axios webservice call.
        let response = await this.httpClient.get({ headers: headers });
        // If we have at least one filter, we post it to telemetry event.
        if (filters.keys.length > 0) {
            this.PostEventToTelemetry(headers);
        }
        // Read the response data from the server.
        let responseData = response.data;
        let configs = responseData.Configs;
        let features = [];
        for (let c of configs) {
            if (!c.Parameters) {
                continue;
            }
            for (let key of Object.keys(c.Parameters)) {
                const featureName = key + (c.Parameters[key] ? '' : 'cf');
                if (!features.includes(featureName)) {
                    features.push(featureName);
                }
            }
        }
        return {
            features,
            assignmentContext: responseData.AssignmentContext,
            configs
        };
    }
}
exports.TasApiFeatureProvider = TasApiFeatureProvider;
//# sourceMappingURL=TasApiFeatureProvider.js.map

/***/ }),
/* 33 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
const BaseFeatureProvider_1 = __webpack_require__(34);
/**
 * Feature provider implementation that handles filters.
 */
class FilteredFeatureProvider extends BaseFeatureProvider_1.BaseFeatureProvider {
    constructor(telemetry, filterProviders) {
        super(telemetry);
        this.telemetry = telemetry;
        this.filterProviders = filterProviders;
        this.cachedTelemetryEvents = [];
    }
    getFilters() {
        // We get the filters that will be sent as headers.
        let filters = new Map();
        for (let filter of this.filterProviders) {
            let filterHeaders = filter.getFilters();
            for (let key of filterHeaders.keys()) {
                // Headers can be overridden by custom filters.
                // That's why a check isn't done to see if the header already exists, the value is just set.
                let filterValue = filterHeaders.get(key);
                filters.set(key, filterValue);
            }
        }
        return filters;
    }
    PostEventToTelemetry(headers) {
        /**
         * If these headers have already been posted, we skip from posting them again..
         */
        if (this.cachedTelemetryEvents.includes(headers)) {
            return;
        }
        const jsonHeaders = JSON.stringify(headers);
        this.telemetry.postEvent('report-headers', new Map([['ABExp.headers', jsonHeaders]]));
        /**
         * We cache the flight so we don't post it again.
         */
        this.cachedTelemetryEvents.push(headers);
    }
}
exports.FilteredFeatureProvider = FilteredFeatureProvider;
//# sourceMappingURL=FilteredFeatureProvider.js.map

/***/ }),
/* 34 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
/**
 * Abstract class for Feature Provider Implementation.
 */
class BaseFeatureProvider {
    /**
     * @param telemetry The telemetry implementation.
     */
    constructor(telemetry) {
        this.telemetry = telemetry;
        this.isFetching = false;
    }
    /**
     * Method that wraps the fetch method in order to re-use the fetch promise if needed.
     * @param headers The headers to be used on the fetch method.
     */
    async getFeatures() {
        if (this.isFetching && this.fetchPromise) {
            return this.fetchPromise;
        }
        this.fetchPromise = this.fetch();
        let features = await this.fetchPromise;
        this.isFetching = false;
        this.fetchPromise = undefined;
        return features;
    }
}
exports.BaseFeatureProvider = BaseFeatureProvider;
//# sourceMappingURL=BaseFeatureProvider.js.map

/***/ }),
/* 35 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
const axios_1 = __webpack_require__(36);
class AxiosHttpClient {
    constructor(endpoint) {
        this.endpoint = endpoint;
    }
    get(config) {
        return axios_1.default.get(this.endpoint, Object.assign(Object.assign({}, config), { proxy: false }));
    }
}
exports.AxiosHttpClient = AxiosHttpClient;
//# sourceMappingURL=AxiosHttpClient.js.map

/***/ }),
/* 36 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = __webpack_require__(37);

/***/ }),
/* 37 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);
var bind = __webpack_require__(39);
var Axios = __webpack_require__(40);
var mergeConfig = __webpack_require__(60);
var defaults = __webpack_require__(45);

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.Cancel = __webpack_require__(58);
axios.CancelToken = __webpack_require__(103);
axios.isCancel = __webpack_require__(59);
axios.VERSION = (__webpack_require__(62).version);

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = __webpack_require__(104);

// Expose isAxiosError
axios.isAxiosError = __webpack_require__(105);

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports["default"] = axios;


/***/ }),
/* 38 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var bind = __webpack_require__(39);

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return Array.isArray(val);
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return toString.call(val) === '[object FormData]';
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (toString.call(val) !== '[object Object]') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return toString.call(val) === '[object URLSearchParams]';
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM
};


/***/ }),
/* 39 */
/***/ ((module) => {

"use strict";


module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};


/***/ }),
/* 40 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);
var buildURL = __webpack_require__(41);
var InterceptorManager = __webpack_require__(42);
var dispatchRequest = __webpack_require__(43);
var mergeConfig = __webpack_require__(60);
var validator = __webpack_require__(61);

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(configOrUrl, config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;


/***/ }),
/* 41 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);

function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};


/***/ }),
/* 42 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;


/***/ }),
/* 43 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);
var transformData = __webpack_require__(44);
var isCancel = __webpack_require__(59);
var defaults = __webpack_require__(45);
var Cancel = __webpack_require__(58);

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new Cancel('canceled');
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};


/***/ }),
/* 44 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);
var defaults = __webpack_require__(45);

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  var context = this || defaults;
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};


/***/ }),
/* 45 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/* provided dependency */ var process = __webpack_require__(24);


var utils = __webpack_require__(38);
var normalizeHeaderName = __webpack_require__(46);
var enhanceError = __webpack_require__(47);
var transitionalDefaults = __webpack_require__(48);

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = __webpack_require__(49);
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = __webpack_require__(49);
  }
  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults = {

  transitional: transitionalDefaults,

  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data) || (headers && headers['Content-Type'] === 'application/json')) {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional || defaults.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw enhanceError(e, this, 'E_JSON_PARSE');
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;


/***/ }),
/* 46 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};


/***/ }),
/* 47 */
/***/ ((module) => {

"use strict";


/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  };
  return error;
};


/***/ }),
/* 48 */
/***/ ((module) => {

"use strict";


module.exports = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};


/***/ }),
/* 49 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);
var settle = __webpack_require__(50);
var cookies = __webpack_require__(52);
var buildURL = __webpack_require__(41);
var buildFullPath = __webpack_require__(53);
var parseHeaders = __webpack_require__(56);
var isURLSameOrigin = __webpack_require__(57);
var createError = __webpack_require__(51);
var transitionalDefaults = __webpack_require__(48);
var Cancel = __webpack_require__(58);

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;
    var onCanceled;
    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);
    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
        request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
      var transitional = config.transitional || transitionalDefaults;
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(createError(
        timeoutErrorMessage,
        config,
        transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function(cancel) {
        if (!request) {
          return;
        }
        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    if (!requestData) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};


/***/ }),
/* 50 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var createError = __webpack_require__(51);

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};


/***/ }),
/* 51 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var enhanceError = __webpack_require__(47);

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};


/***/ }),
/* 52 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);


/***/ }),
/* 53 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var isAbsoluteURL = __webpack_require__(54);
var combineURLs = __webpack_require__(55);

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */
module.exports = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};


/***/ }),
/* 54 */
/***/ ((module) => {

"use strict";


/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
};


/***/ }),
/* 55 */
/***/ ((module) => {

"use strict";


/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};


/***/ }),
/* 56 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};


/***/ }),
/* 57 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);


/***/ }),
/* 58 */
/***/ ((module) => {

"use strict";


/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;


/***/ }),
/* 59 */
/***/ ((module) => {

"use strict";


module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};


/***/ }),
/* 60 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  };

  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(prop);
    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
};


/***/ }),
/* 61 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/* provided dependency */ var console = __webpack_require__(63);


var VERSION = (__webpack_require__(62).version);

var validators = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};

/**
 * Transitional option validator
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 * @returns {function}
 */
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new Error(formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')));
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new TypeError('option ' + opt + ' must be ' + result);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw Error('Unknown option ' + opt);
    }
  }
}

module.exports = {
  assertOptions: assertOptions,
  validators: validators
};


/***/ }),
/* 62 */
/***/ ((module) => {

module.exports = {
  "version": "0.26.1"
};

/***/ }),
/* 63 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/*global window, global*/
var util = __webpack_require__(64)
var assert = __webpack_require__(85)
function now() { return new Date().getTime() }

var slice = Array.prototype.slice
var console
var times = {}

if (typeof global !== "undefined" && global.console) {
    console = global.console
} else if (typeof window !== "undefined" && window.console) {
    console = window.console
} else {
    console = {}
}

var functions = [
    [log, "log"],
    [info, "info"],
    [warn, "warn"],
    [error, "error"],
    [time, "time"],
    [timeEnd, "timeEnd"],
    [trace, "trace"],
    [dir, "dir"],
    [consoleAssert, "assert"]
]

for (var i = 0; i < functions.length; i++) {
    var tuple = functions[i]
    var f = tuple[0]
    var name = tuple[1]

    if (!console[name]) {
        console[name] = f
    }
}

module.exports = console

function log() {}

function info() {
    console.log.apply(console, arguments)
}

function warn() {
    console.log.apply(console, arguments)
}

function error() {
    console.warn.apply(console, arguments)
}

function time(label) {
    times[label] = now()
}

function timeEnd(label) {
    var time = times[label]
    if (!time) {
        throw new Error("No such label: " + label)
    }

    delete times[label]
    var duration = now() - time
    console.log(label + ": " + duration + "ms")
}

function trace() {
    var err = new Error()
    err.name = "Trace"
    err.message = util.format.apply(null, arguments)
    console.error(err.stack)
}

function dir(object) {
    console.log(util.inspect(object) + "\n")
}

function consoleAssert(expression) {
    if (!expression) {
        var arr = slice.call(arguments, 1)
        assert.ok(false, util.format.apply(null, arr))
    }
}


/***/ }),
/* 64 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

/* provided dependency */ var process = __webpack_require__(24);
/* provided dependency */ var console = __webpack_require__(63);
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors ||
  function getOwnPropertyDescriptors(obj) {
    var keys = Object.keys(obj);
    var descriptors = {};
    for (var i = 0; i < keys.length; i++) {
      descriptors[keys[i]] = Object.getOwnPropertyDescriptor(obj, keys[i]);
    }
    return descriptors;
  };

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  if (typeof process !== 'undefined' && process.noDeprecation === true) {
    return fn;
  }

  // Allow for deprecating things in the process of starting up.
  if (typeof process === 'undefined') {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnvRegex = /^$/;

if ({}.NODE_DEBUG) {
  var debugEnv = {}.NODE_DEBUG;
  debugEnv = debugEnv.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/,/g, '$|^')
    .toUpperCase();
  debugEnvRegex = new RegExp('^' + debugEnv + '$', 'i');
}
exports.debuglog = function(set) {
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (debugEnvRegex.test(set)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').slice(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.slice(1, -1);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
exports.types = __webpack_require__(65);

function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;
exports.types.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;
exports.types.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;
exports.types.isNativeError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = __webpack_require__(83);

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = __webpack_require__(84);

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

var kCustomPromisifiedSymbol = typeof Symbol !== 'undefined' ? Symbol('util.promisify.custom') : undefined;

exports.promisify = function promisify(original) {
  if (typeof original !== 'function')
    throw new TypeError('The "original" argument must be of type Function');

  if (kCustomPromisifiedSymbol && original[kCustomPromisifiedSymbol]) {
    var fn = original[kCustomPromisifiedSymbol];
    if (typeof fn !== 'function') {
      throw new TypeError('The "util.promisify.custom" argument must be of type Function');
    }
    Object.defineProperty(fn, kCustomPromisifiedSymbol, {
      value: fn, enumerable: false, writable: false, configurable: true
    });
    return fn;
  }

  function fn() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
      promiseReject = reject;
    });

    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    args.push(function (err, value) {
      if (err) {
        promiseReject(err);
      } else {
        promiseResolve(value);
      }
    });

    try {
      original.apply(this, args);
    } catch (err) {
      promiseReject(err);
    }

    return promise;
  }

  Object.setPrototypeOf(fn, Object.getPrototypeOf(original));

  if (kCustomPromisifiedSymbol) Object.defineProperty(fn, kCustomPromisifiedSymbol, {
    value: fn, enumerable: false, writable: false, configurable: true
  });
  return Object.defineProperties(
    fn,
    getOwnPropertyDescriptors(original)
  );
}

exports.promisify.custom = kCustomPromisifiedSymbol

function callbackifyOnRejected(reason, cb) {
  // `!reason` guard inspired by bluebird (Ref: https://goo.gl/t5IS6M).
  // Because `null` is a special error value in callbacks which means "no error
  // occurred", we error-wrap so the callback consumer can distinguish between
  // "the promise rejected with null" or "the promise fulfilled with undefined".
  if (!reason) {
    var newReason = new Error('Promise was rejected with a falsy value');
    newReason.reason = reason;
    reason = newReason;
  }
  return cb(reason);
}

function callbackify(original) {
  if (typeof original !== 'function') {
    throw new TypeError('The "original" argument must be of type Function');
  }

  // We DO NOT return the promise as it gives the user a false sense that
  // the promise is actually somehow related to the callback's execution
  // and that the callback throwing will reject the promise.
  function callbackified() {
    var args = [];
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    var maybeCb = args.pop();
    if (typeof maybeCb !== 'function') {
      throw new TypeError('The last argument must be of type Function');
    }
    var self = this;
    var cb = function() {
      return maybeCb.apply(self, arguments);
    };
    // In true node style we process the callback on `nextTick` with all the
    // implications (stack, `uncaughtException`, `async_hooks`)
    original.apply(this, args)
      .then(function(ret) { process.nextTick(cb.bind(null, null, ret)) },
            function(rej) { process.nextTick(callbackifyOnRejected.bind(null, rej, cb)) });
  }

  Object.setPrototypeOf(callbackified, Object.getPrototypeOf(original));
  Object.defineProperties(callbackified,
                          getOwnPropertyDescriptors(original));
  return callbackified;
}
exports.callbackify = callbackify;


/***/ }),
/* 65 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";
// Currently in sync with Node.js lib/internal/util/types.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9



var isArgumentsObject = __webpack_require__(66);
var isGeneratorFunction = __webpack_require__(76);
var whichTypedArray = __webpack_require__(77);
var isTypedArray = __webpack_require__(82);

function uncurryThis(f) {
  return f.call.bind(f);
}

var BigIntSupported = typeof BigInt !== 'undefined';
var SymbolSupported = typeof Symbol !== 'undefined';

var ObjectToString = uncurryThis(Object.prototype.toString);

var numberValue = uncurryThis(Number.prototype.valueOf);
var stringValue = uncurryThis(String.prototype.valueOf);
var booleanValue = uncurryThis(Boolean.prototype.valueOf);

if (BigIntSupported) {
  var bigIntValue = uncurryThis(BigInt.prototype.valueOf);
}

if (SymbolSupported) {
  var symbolValue = uncurryThis(Symbol.prototype.valueOf);
}

function checkBoxedPrimitive(value, prototypeValueOf) {
  if (typeof value !== 'object') {
    return false;
  }
  try {
    prototypeValueOf(value);
    return true;
  } catch(e) {
    return false;
  }
}

exports.isArgumentsObject = isArgumentsObject;
exports.isGeneratorFunction = isGeneratorFunction;
exports.isTypedArray = isTypedArray;

// Taken from here and modified for better browser support
// https://github.com/sindresorhus/p-is-promise/blob/cda35a513bda03f977ad5cde3a079d237e82d7ef/index.js
function isPromise(input) {
	return (
		(
			typeof Promise !== 'undefined' &&
			input instanceof Promise
		) ||
		(
			input !== null &&
			typeof input === 'object' &&
			typeof input.then === 'function' &&
			typeof input.catch === 'function'
		)
	);
}
exports.isPromise = isPromise;

function isArrayBufferView(value) {
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView) {
    return ArrayBuffer.isView(value);
  }

  return (
    isTypedArray(value) ||
    isDataView(value)
  );
}
exports.isArrayBufferView = isArrayBufferView;


function isUint8Array(value) {
  return whichTypedArray(value) === 'Uint8Array';
}
exports.isUint8Array = isUint8Array;

function isUint8ClampedArray(value) {
  return whichTypedArray(value) === 'Uint8ClampedArray';
}
exports.isUint8ClampedArray = isUint8ClampedArray;

function isUint16Array(value) {
  return whichTypedArray(value) === 'Uint16Array';
}
exports.isUint16Array = isUint16Array;

function isUint32Array(value) {
  return whichTypedArray(value) === 'Uint32Array';
}
exports.isUint32Array = isUint32Array;

function isInt8Array(value) {
  return whichTypedArray(value) === 'Int8Array';
}
exports.isInt8Array = isInt8Array;

function isInt16Array(value) {
  return whichTypedArray(value) === 'Int16Array';
}
exports.isInt16Array = isInt16Array;

function isInt32Array(value) {
  return whichTypedArray(value) === 'Int32Array';
}
exports.isInt32Array = isInt32Array;

function isFloat32Array(value) {
  return whichTypedArray(value) === 'Float32Array';
}
exports.isFloat32Array = isFloat32Array;

function isFloat64Array(value) {
  return whichTypedArray(value) === 'Float64Array';
}
exports.isFloat64Array = isFloat64Array;

function isBigInt64Array(value) {
  return whichTypedArray(value) === 'BigInt64Array';
}
exports.isBigInt64Array = isBigInt64Array;

function isBigUint64Array(value) {
  return whichTypedArray(value) === 'BigUint64Array';
}
exports.isBigUint64Array = isBigUint64Array;

function isMapToString(value) {
  return ObjectToString(value) === '[object Map]';
}
isMapToString.working = (
  typeof Map !== 'undefined' &&
  isMapToString(new Map())
);

function isMap(value) {
  if (typeof Map === 'undefined') {
    return false;
  }

  return isMapToString.working
    ? isMapToString(value)
    : value instanceof Map;
}
exports.isMap = isMap;

function isSetToString(value) {
  return ObjectToString(value) === '[object Set]';
}
isSetToString.working = (
  typeof Set !== 'undefined' &&
  isSetToString(new Set())
);
function isSet(value) {
  if (typeof Set === 'undefined') {
    return false;
  }

  return isSetToString.working
    ? isSetToString(value)
    : value instanceof Set;
}
exports.isSet = isSet;

function isWeakMapToString(value) {
  return ObjectToString(value) === '[object WeakMap]';
}
isWeakMapToString.working = (
  typeof WeakMap !== 'undefined' &&
  isWeakMapToString(new WeakMap())
);
function isWeakMap(value) {
  if (typeof WeakMap === 'undefined') {
    return false;
  }

  return isWeakMapToString.working
    ? isWeakMapToString(value)
    : value instanceof WeakMap;
}
exports.isWeakMap = isWeakMap;

function isWeakSetToString(value) {
  return ObjectToString(value) === '[object WeakSet]';
}
isWeakSetToString.working = (
  typeof WeakSet !== 'undefined' &&
  isWeakSetToString(new WeakSet())
);
function isWeakSet(value) {
  return isWeakSetToString(value);
}
exports.isWeakSet = isWeakSet;

function isArrayBufferToString(value) {
  return ObjectToString(value) === '[object ArrayBuffer]';
}
isArrayBufferToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  isArrayBufferToString(new ArrayBuffer())
);
function isArrayBuffer(value) {
  if (typeof ArrayBuffer === 'undefined') {
    return false;
  }

  return isArrayBufferToString.working
    ? isArrayBufferToString(value)
    : value instanceof ArrayBuffer;
}
exports.isArrayBuffer = isArrayBuffer;

function isDataViewToString(value) {
  return ObjectToString(value) === '[object DataView]';
}
isDataViewToString.working = (
  typeof ArrayBuffer !== 'undefined' &&
  typeof DataView !== 'undefined' &&
  isDataViewToString(new DataView(new ArrayBuffer(1), 0, 1))
);
function isDataView(value) {
  if (typeof DataView === 'undefined') {
    return false;
  }

  return isDataViewToString.working
    ? isDataViewToString(value)
    : value instanceof DataView;
}
exports.isDataView = isDataView;

// Store a copy of SharedArrayBuffer in case it's deleted elsewhere
var SharedArrayBufferCopy = typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : undefined;
function isSharedArrayBufferToString(value) {
  return ObjectToString(value) === '[object SharedArrayBuffer]';
}
function isSharedArrayBuffer(value) {
  if (typeof SharedArrayBufferCopy === 'undefined') {
    return false;
  }

  if (typeof isSharedArrayBufferToString.working === 'undefined') {
    isSharedArrayBufferToString.working = isSharedArrayBufferToString(new SharedArrayBufferCopy());
  }

  return isSharedArrayBufferToString.working
    ? isSharedArrayBufferToString(value)
    : value instanceof SharedArrayBufferCopy;
}
exports.isSharedArrayBuffer = isSharedArrayBuffer;

function isAsyncFunction(value) {
  return ObjectToString(value) === '[object AsyncFunction]';
}
exports.isAsyncFunction = isAsyncFunction;

function isMapIterator(value) {
  return ObjectToString(value) === '[object Map Iterator]';
}
exports.isMapIterator = isMapIterator;

function isSetIterator(value) {
  return ObjectToString(value) === '[object Set Iterator]';
}
exports.isSetIterator = isSetIterator;

function isGeneratorObject(value) {
  return ObjectToString(value) === '[object Generator]';
}
exports.isGeneratorObject = isGeneratorObject;

function isWebAssemblyCompiledModule(value) {
  return ObjectToString(value) === '[object WebAssembly.Module]';
}
exports.isWebAssemblyCompiledModule = isWebAssemblyCompiledModule;

function isNumberObject(value) {
  return checkBoxedPrimitive(value, numberValue);
}
exports.isNumberObject = isNumberObject;

function isStringObject(value) {
  return checkBoxedPrimitive(value, stringValue);
}
exports.isStringObject = isStringObject;

function isBooleanObject(value) {
  return checkBoxedPrimitive(value, booleanValue);
}
exports.isBooleanObject = isBooleanObject;

function isBigIntObject(value) {
  return BigIntSupported && checkBoxedPrimitive(value, bigIntValue);
}
exports.isBigIntObject = isBigIntObject;

function isSymbolObject(value) {
  return SymbolSupported && checkBoxedPrimitive(value, symbolValue);
}
exports.isSymbolObject = isSymbolObject;

function isBoxedPrimitive(value) {
  return (
    isNumberObject(value) ||
    isStringObject(value) ||
    isBooleanObject(value) ||
    isBigIntObject(value) ||
    isSymbolObject(value)
  );
}
exports.isBoxedPrimitive = isBoxedPrimitive;

function isAnyArrayBuffer(value) {
  return typeof Uint8Array !== 'undefined' && (
    isArrayBuffer(value) ||
    isSharedArrayBuffer(value)
  );
}
exports.isAnyArrayBuffer = isAnyArrayBuffer;

['isProxy', 'isExternal', 'isModuleNamespaceObject'].forEach(function(method) {
  Object.defineProperty(exports, method, {
    enumerable: false,
    value: function() {
      throw new Error(method + ' is not supported in userland');
    }
  });
});


/***/ }),
/* 66 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var hasToStringTag = __webpack_require__(67)();
var callBound = __webpack_require__(69);

var $toString = callBound('Object.prototype.toString');

var isStandardArguments = function isArguments(value) {
	if (hasToStringTag && value && typeof value === 'object' && Symbol.toStringTag in value) {
		return false;
	}
	return $toString(value) === '[object Arguments]';
};

var isLegacyArguments = function isArguments(value) {
	if (isStandardArguments(value)) {
		return true;
	}
	return value !== null &&
		typeof value === 'object' &&
		typeof value.length === 'number' &&
		value.length >= 0 &&
		$toString(value) !== '[object Array]' &&
		$toString(value.callee) === '[object Function]';
};

var supportsStandardArguments = (function () {
	return isStandardArguments(arguments);
}());

isStandardArguments.isLegacyArguments = isLegacyArguments; // for tests

module.exports = supportsStandardArguments ? isStandardArguments : isLegacyArguments;


/***/ }),
/* 67 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var hasSymbols = __webpack_require__(68);

module.exports = function hasToStringTagShams() {
	return hasSymbols() && !!Symbol.toStringTag;
};


/***/ }),
/* 68 */
/***/ ((module) => {

"use strict";


/* eslint complexity: [2, 18], max-statements: [2, 33] */
module.exports = function hasSymbols() {
	if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
	if (typeof Symbol.iterator === 'symbol') { return true; }

	var obj = {};
	var sym = Symbol('test');
	var symObj = Object(sym);
	if (typeof sym === 'string') { return false; }

	if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
	if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

	// temp disabled per https://github.com/ljharb/object.assign/issues/17
	// if (sym instanceof Symbol) { return false; }
	// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
	// if (!(symObj instanceof Symbol)) { return false; }

	// if (typeof Symbol.prototype.toString !== 'function') { return false; }
	// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

	var symVal = 42;
	obj[sym] = symVal;
	for (sym in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
	if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

	if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

	var syms = Object.getOwnPropertySymbols(obj);
	if (syms.length !== 1 || syms[0] !== sym) { return false; }

	if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

	if (typeof Object.getOwnPropertyDescriptor === 'function') {
		var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
		if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
	}

	return true;
};


/***/ }),
/* 69 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(70);

var callBind = __webpack_require__(75);

var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

module.exports = function callBoundIntrinsic(name, allowMissing) {
	var intrinsic = GetIntrinsic(name, !!allowMissing);
	if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
		return callBind(intrinsic);
	}
	return intrinsic;
};


/***/ }),
/* 70 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var undefined;

var $SyntaxError = SyntaxError;
var $Function = Function;
var $TypeError = TypeError;

// eslint-disable-next-line consistent-return
var getEvalledConstructor = function (expressionSyntax) {
	try {
		return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
	} catch (e) {}
};

var $gOPD = Object.getOwnPropertyDescriptor;
if ($gOPD) {
	try {
		$gOPD({}, '');
	} catch (e) {
		$gOPD = null; // this is IE 8, which has a broken gOPD
	}
}

var throwTypeError = function () {
	throw new $TypeError();
};
var ThrowTypeError = $gOPD
	? (function () {
		try {
			// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
			arguments.callee; // IE 8 does not throw here
			return throwTypeError;
		} catch (calleeThrows) {
			try {
				// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
				return $gOPD(arguments, 'callee').get;
			} catch (gOPDthrows) {
				return throwTypeError;
			}
		}
	}())
	: throwTypeError;

var hasSymbols = __webpack_require__(71)();

var getProto = Object.getPrototypeOf || function (x) { return x.__proto__; }; // eslint-disable-line no-proto

var needsEval = {};

var TypedArray = typeof Uint8Array === 'undefined' ? undefined : getProto(Uint8Array);

var INTRINSICS = {
	'%AggregateError%': typeof AggregateError === 'undefined' ? undefined : AggregateError,
	'%Array%': Array,
	'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined : ArrayBuffer,
	'%ArrayIteratorPrototype%': hasSymbols ? getProto([][Symbol.iterator]()) : undefined,
	'%AsyncFromSyncIteratorPrototype%': undefined,
	'%AsyncFunction%': needsEval,
	'%AsyncGenerator%': needsEval,
	'%AsyncGeneratorFunction%': needsEval,
	'%AsyncIteratorPrototype%': needsEval,
	'%Atomics%': typeof Atomics === 'undefined' ? undefined : Atomics,
	'%BigInt%': typeof BigInt === 'undefined' ? undefined : BigInt,
	'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined : BigInt64Array,
	'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined : BigUint64Array,
	'%Boolean%': Boolean,
	'%DataView%': typeof DataView === 'undefined' ? undefined : DataView,
	'%Date%': Date,
	'%decodeURI%': decodeURI,
	'%decodeURIComponent%': decodeURIComponent,
	'%encodeURI%': encodeURI,
	'%encodeURIComponent%': encodeURIComponent,
	'%Error%': Error,
	'%eval%': eval, // eslint-disable-line no-eval
	'%EvalError%': EvalError,
	'%Float32Array%': typeof Float32Array === 'undefined' ? undefined : Float32Array,
	'%Float64Array%': typeof Float64Array === 'undefined' ? undefined : Float64Array,
	'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined : FinalizationRegistry,
	'%Function%': $Function,
	'%GeneratorFunction%': needsEval,
	'%Int8Array%': typeof Int8Array === 'undefined' ? undefined : Int8Array,
	'%Int16Array%': typeof Int16Array === 'undefined' ? undefined : Int16Array,
	'%Int32Array%': typeof Int32Array === 'undefined' ? undefined : Int32Array,
	'%isFinite%': isFinite,
	'%isNaN%': isNaN,
	'%IteratorPrototype%': hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined,
	'%JSON%': typeof JSON === 'object' ? JSON : undefined,
	'%Map%': typeof Map === 'undefined' ? undefined : Map,
	'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols ? undefined : getProto(new Map()[Symbol.iterator]()),
	'%Math%': Math,
	'%Number%': Number,
	'%Object%': Object,
	'%parseFloat%': parseFloat,
	'%parseInt%': parseInt,
	'%Promise%': typeof Promise === 'undefined' ? undefined : Promise,
	'%Proxy%': typeof Proxy === 'undefined' ? undefined : Proxy,
	'%RangeError%': RangeError,
	'%ReferenceError%': ReferenceError,
	'%Reflect%': typeof Reflect === 'undefined' ? undefined : Reflect,
	'%RegExp%': RegExp,
	'%Set%': typeof Set === 'undefined' ? undefined : Set,
	'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols ? undefined : getProto(new Set()[Symbol.iterator]()),
	'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined : SharedArrayBuffer,
	'%String%': String,
	'%StringIteratorPrototype%': hasSymbols ? getProto(''[Symbol.iterator]()) : undefined,
	'%Symbol%': hasSymbols ? Symbol : undefined,
	'%SyntaxError%': $SyntaxError,
	'%ThrowTypeError%': ThrowTypeError,
	'%TypedArray%': TypedArray,
	'%TypeError%': $TypeError,
	'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined : Uint8Array,
	'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined : Uint8ClampedArray,
	'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined : Uint16Array,
	'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined : Uint32Array,
	'%URIError%': URIError,
	'%WeakMap%': typeof WeakMap === 'undefined' ? undefined : WeakMap,
	'%WeakRef%': typeof WeakRef === 'undefined' ? undefined : WeakRef,
	'%WeakSet%': typeof WeakSet === 'undefined' ? undefined : WeakSet
};

try {
	null.error; // eslint-disable-line no-unused-expressions
} catch (e) {
	// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
	var errorProto = getProto(getProto(e));
	INTRINSICS['%Error.prototype%'] = errorProto;
}

var doEval = function doEval(name) {
	var value;
	if (name === '%AsyncFunction%') {
		value = getEvalledConstructor('async function () {}');
	} else if (name === '%GeneratorFunction%') {
		value = getEvalledConstructor('function* () {}');
	} else if (name === '%AsyncGeneratorFunction%') {
		value = getEvalledConstructor('async function* () {}');
	} else if (name === '%AsyncGenerator%') {
		var fn = doEval('%AsyncGeneratorFunction%');
		if (fn) {
			value = fn.prototype;
		}
	} else if (name === '%AsyncIteratorPrototype%') {
		var gen = doEval('%AsyncGenerator%');
		if (gen) {
			value = getProto(gen.prototype);
		}
	}

	INTRINSICS[name] = value;

	return value;
};

var LEGACY_ALIASES = {
	'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
	'%ArrayPrototype%': ['Array', 'prototype'],
	'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
	'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
	'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
	'%ArrayProto_values%': ['Array', 'prototype', 'values'],
	'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
	'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
	'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
	'%BooleanPrototype%': ['Boolean', 'prototype'],
	'%DataViewPrototype%': ['DataView', 'prototype'],
	'%DatePrototype%': ['Date', 'prototype'],
	'%ErrorPrototype%': ['Error', 'prototype'],
	'%EvalErrorPrototype%': ['EvalError', 'prototype'],
	'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
	'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
	'%FunctionPrototype%': ['Function', 'prototype'],
	'%Generator%': ['GeneratorFunction', 'prototype'],
	'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
	'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
	'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
	'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
	'%JSONParse%': ['JSON', 'parse'],
	'%JSONStringify%': ['JSON', 'stringify'],
	'%MapPrototype%': ['Map', 'prototype'],
	'%NumberPrototype%': ['Number', 'prototype'],
	'%ObjectPrototype%': ['Object', 'prototype'],
	'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
	'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
	'%PromisePrototype%': ['Promise', 'prototype'],
	'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
	'%Promise_all%': ['Promise', 'all'],
	'%Promise_reject%': ['Promise', 'reject'],
	'%Promise_resolve%': ['Promise', 'resolve'],
	'%RangeErrorPrototype%': ['RangeError', 'prototype'],
	'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
	'%RegExpPrototype%': ['RegExp', 'prototype'],
	'%SetPrototype%': ['Set', 'prototype'],
	'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
	'%StringPrototype%': ['String', 'prototype'],
	'%SymbolPrototype%': ['Symbol', 'prototype'],
	'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
	'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
	'%TypeErrorPrototype%': ['TypeError', 'prototype'],
	'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
	'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
	'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
	'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
	'%URIErrorPrototype%': ['URIError', 'prototype'],
	'%WeakMapPrototype%': ['WeakMap', 'prototype'],
	'%WeakSetPrototype%': ['WeakSet', 'prototype']
};

var bind = __webpack_require__(72);
var hasOwn = __webpack_require__(74);
var $concat = bind.call(Function.call, Array.prototype.concat);
var $spliceApply = bind.call(Function.apply, Array.prototype.splice);
var $replace = bind.call(Function.call, String.prototype.replace);
var $strSlice = bind.call(Function.call, String.prototype.slice);
var $exec = bind.call(Function.call, RegExp.prototype.exec);

/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
var stringToPath = function stringToPath(string) {
	var first = $strSlice(string, 0, 1);
	var last = $strSlice(string, -1);
	if (first === '%' && last !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
	} else if (last === '%' && first !== '%') {
		throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
	}
	var result = [];
	$replace(string, rePropName, function (match, number, quote, subString) {
		result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
	});
	return result;
};
/* end adaptation */

var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
	var intrinsicName = name;
	var alias;
	if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
		alias = LEGACY_ALIASES[intrinsicName];
		intrinsicName = '%' + alias[0] + '%';
	}

	if (hasOwn(INTRINSICS, intrinsicName)) {
		var value = INTRINSICS[intrinsicName];
		if (value === needsEval) {
			value = doEval(intrinsicName);
		}
		if (typeof value === 'undefined' && !allowMissing) {
			throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
		}

		return {
			alias: alias,
			name: intrinsicName,
			value: value
		};
	}

	throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
};

module.exports = function GetIntrinsic(name, allowMissing) {
	if (typeof name !== 'string' || name.length === 0) {
		throw new $TypeError('intrinsic name must be a non-empty string');
	}
	if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
		throw new $TypeError('"allowMissing" argument must be a boolean');
	}

	if ($exec(/^%?[^%]*%?$/, name) === null) {
		throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
	}
	var parts = stringToPath(name);
	var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

	var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
	var intrinsicRealName = intrinsic.name;
	var value = intrinsic.value;
	var skipFurtherCaching = false;

	var alias = intrinsic.alias;
	if (alias) {
		intrinsicBaseName = alias[0];
		$spliceApply(parts, $concat([0, 1], alias));
	}

	for (var i = 1, isOwn = true; i < parts.length; i += 1) {
		var part = parts[i];
		var first = $strSlice(part, 0, 1);
		var last = $strSlice(part, -1);
		if (
			(
				(first === '"' || first === "'" || first === '`')
				|| (last === '"' || last === "'" || last === '`')
			)
			&& first !== last
		) {
			throw new $SyntaxError('property names with quotes must have matching quotes');
		}
		if (part === 'constructor' || !isOwn) {
			skipFurtherCaching = true;
		}

		intrinsicBaseName += '.' + part;
		intrinsicRealName = '%' + intrinsicBaseName + '%';

		if (hasOwn(INTRINSICS, intrinsicRealName)) {
			value = INTRINSICS[intrinsicRealName];
		} else if (value != null) {
			if (!(part in value)) {
				if (!allowMissing) {
					throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
				}
				return void undefined;
			}
			if ($gOPD && (i + 1) >= parts.length) {
				var desc = $gOPD(value, part);
				isOwn = !!desc;

				// By convention, when a data property is converted to an accessor
				// property to emulate a data property that does not suffer from
				// the override mistake, that accessor's getter is marked with
				// an `originalValue` property. Here, when we detect this, we
				// uphold the illusion by pretending to see that original data
				// property, i.e., returning the value rather than the getter
				// itself.
				if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
					value = desc.get;
				} else {
					value = value[part];
				}
			} else {
				isOwn = hasOwn(value, part);
				value = value[part];
			}

			if (isOwn && !skipFurtherCaching) {
				INTRINSICS[intrinsicRealName] = value;
			}
		}
	}
	return value;
};


/***/ }),
/* 71 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var origSymbol = typeof Symbol !== 'undefined' && Symbol;
var hasSymbolSham = __webpack_require__(68);

module.exports = function hasNativeSymbols() {
	if (typeof origSymbol !== 'function') { return false; }
	if (typeof Symbol !== 'function') { return false; }
	if (typeof origSymbol('foo') !== 'symbol') { return false; }
	if (typeof Symbol('bar') !== 'symbol') { return false; }

	return hasSymbolSham();
};


/***/ }),
/* 72 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var implementation = __webpack_require__(73);

module.exports = Function.prototype.bind || implementation;


/***/ }),
/* 73 */
/***/ ((module) => {

"use strict";


/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var bound;
    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};


/***/ }),
/* 74 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var bind = __webpack_require__(72);

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);


/***/ }),
/* 75 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var bind = __webpack_require__(72);
var GetIntrinsic = __webpack_require__(70);

var $apply = GetIntrinsic('%Function.prototype.apply%');
var $call = GetIntrinsic('%Function.prototype.call%');
var $reflectApply = GetIntrinsic('%Reflect.apply%', true) || bind.call($call, $apply);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);
var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);
var $max = GetIntrinsic('%Math.max%');

if ($defineProperty) {
	try {
		$defineProperty({}, 'a', { value: 1 });
	} catch (e) {
		// IE 8 has a broken defineProperty
		$defineProperty = null;
	}
}

module.exports = function callBind(originalFunction) {
	var func = $reflectApply(bind, $call, arguments);
	if ($gOPD && $defineProperty) {
		var desc = $gOPD(func, 'length');
		if (desc.configurable) {
			// original length, plus the receiver, minus any additional arguments (after the receiver)
			$defineProperty(
				func,
				'length',
				{ value: 1 + $max(0, originalFunction.length - (arguments.length - 1)) }
			);
		}
	}
	return func;
};

var applyBind = function applyBind() {
	return $reflectApply(bind, $apply, arguments);
};

if ($defineProperty) {
	$defineProperty(module.exports, 'apply', { value: applyBind });
} else {
	module.exports.apply = applyBind;
}


/***/ }),
/* 76 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var toStr = Object.prototype.toString;
var fnToStr = Function.prototype.toString;
var isFnRegex = /^\s*(?:function)?\*/;
var hasToStringTag = __webpack_require__(67)();
var getProto = Object.getPrototypeOf;
var getGeneratorFunc = function () { // eslint-disable-line consistent-return
	if (!hasToStringTag) {
		return false;
	}
	try {
		return Function('return function*() {}')();
	} catch (e) {
	}
};
var GeneratorFunction;

module.exports = function isGeneratorFunction(fn) {
	if (typeof fn !== 'function') {
		return false;
	}
	if (isFnRegex.test(fnToStr.call(fn))) {
		return true;
	}
	if (!hasToStringTag) {
		var str = toStr.call(fn);
		return str === '[object GeneratorFunction]';
	}
	if (!getProto) {
		return false;
	}
	if (typeof GeneratorFunction === 'undefined') {
		var generatorFunc = getGeneratorFunc();
		GeneratorFunction = generatorFunc ? getProto(generatorFunc) : false;
	}
	return getProto(fn) === GeneratorFunction;
};


/***/ }),
/* 77 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var forEach = __webpack_require__(78);
var availableTypedArrays = __webpack_require__(80);
var callBound = __webpack_require__(69);
var gOPD = __webpack_require__(81);

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = __webpack_require__(67)();

var g = typeof globalThis === 'undefined' ? global : globalThis;
var typedArrays = availableTypedArrays();

var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		if (typeof g[typedArray] === 'function') {
			var arr = new g[typedArray]();
			if (Symbol.toStringTag in arr) {
				var proto = getPrototypeOf(arr);
				var descriptor = gOPD(proto, Symbol.toStringTag);
				if (!descriptor) {
					var superProto = getPrototypeOf(proto);
					descriptor = gOPD(superProto, Symbol.toStringTag);
				}
				toStrTags[typedArray] = descriptor.get;
			}
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var foundName = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!foundName) {
			try {
				var name = getter.call(value);
				if (name === typedArray) {
					foundName = name;
				}
			} catch (e) {}
		}
	});
	return foundName;
};

var isTypedArray = __webpack_require__(82);

module.exports = function whichTypedArray(value) {
	if (!isTypedArray(value)) { return false; }
	if (!hasToStringTag || !(Symbol.toStringTag in value)) { return $slice($toString(value), 8, -1); }
	return tryTypedArrays(value);
};


/***/ }),
/* 78 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var isCallable = __webpack_require__(79);

var toStr = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

var forEachArray = function forEachArray(array, iterator, receiver) {
    for (var i = 0, len = array.length; i < len; i++) {
        if (hasOwnProperty.call(array, i)) {
            if (receiver == null) {
                iterator(array[i], i, array);
            } else {
                iterator.call(receiver, array[i], i, array);
            }
        }
    }
};

var forEachString = function forEachString(string, iterator, receiver) {
    for (var i = 0, len = string.length; i < len; i++) {
        // no such thing as a sparse string.
        if (receiver == null) {
            iterator(string.charAt(i), i, string);
        } else {
            iterator.call(receiver, string.charAt(i), i, string);
        }
    }
};

var forEachObject = function forEachObject(object, iterator, receiver) {
    for (var k in object) {
        if (hasOwnProperty.call(object, k)) {
            if (receiver == null) {
                iterator(object[k], k, object);
            } else {
                iterator.call(receiver, object[k], k, object);
            }
        }
    }
};

var forEach = function forEach(list, iterator, thisArg) {
    if (!isCallable(iterator)) {
        throw new TypeError('iterator must be a function');
    }

    var receiver;
    if (arguments.length >= 3) {
        receiver = thisArg;
    }

    if (toStr.call(list) === '[object Array]') {
        forEachArray(list, iterator, receiver);
    } else if (typeof list === 'string') {
        forEachString(list, iterator, receiver);
    } else {
        forEachObject(list, iterator, receiver);
    }
};

module.exports = forEach;


/***/ }),
/* 79 */
/***/ ((module) => {

"use strict";


var fnToStr = Function.prototype.toString;
var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
var badArrayLike;
var isCallableMarker;
if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
	try {
		badArrayLike = Object.defineProperty({}, 'length', {
			get: function () {
				throw isCallableMarker;
			}
		});
		isCallableMarker = {};
		// eslint-disable-next-line no-throw-literal
		reflectApply(function () { throw 42; }, null, badArrayLike);
	} catch (_) {
		if (_ !== isCallableMarker) {
			reflectApply = null;
		}
	}
} else {
	reflectApply = null;
}

var constructorRegex = /^\s*class\b/;
var isES6ClassFn = function isES6ClassFunction(value) {
	try {
		var fnStr = fnToStr.call(value);
		return constructorRegex.test(fnStr);
	} catch (e) {
		return false; // not a function
	}
};

var tryFunctionObject = function tryFunctionToStr(value) {
	try {
		if (isES6ClassFn(value)) { return false; }
		fnToStr.call(value);
		return true;
	} catch (e) {
		return false;
	}
};
var toStr = Object.prototype.toString;
var objectClass = '[object Object]';
var fnClass = '[object Function]';
var genClass = '[object GeneratorFunction]';
var ddaClass = '[object HTMLAllCollection]'; // IE 11
var ddaClass2 = '[object HTML document.all class]';
var ddaClass3 = '[object HTMLCollection]'; // IE 9-10
var hasToStringTag = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`

var isIE68 = !(0 in [,]); // eslint-disable-line no-sparse-arrays, comma-spacing

var isDDA = function isDocumentDotAll() { return false; };
if (typeof document === 'object') {
	// Firefox 3 canonicalizes DDA to undefined when it's not accessed directly
	var all = document.all;
	if (toStr.call(all) === toStr.call(document.all)) {
		isDDA = function isDocumentDotAll(value) {
			/* globals document: false */
			// in IE 6-8, typeof document.all is "object" and it's truthy
			if ((isIE68 || !value) && (typeof value === 'undefined' || typeof value === 'object')) {
				try {
					var str = toStr.call(value);
					return (
						str === ddaClass
						|| str === ddaClass2
						|| str === ddaClass3 // opera 12.16
						|| str === objectClass // IE 6-8
					) && value('') == null; // eslint-disable-line eqeqeq
				} catch (e) { /**/ }
			}
			return false;
		};
	}
}

module.exports = reflectApply
	? function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		try {
			reflectApply(value, null, badArrayLike);
		} catch (e) {
			if (e !== isCallableMarker) { return false; }
		}
		return !isES6ClassFn(value) && tryFunctionObject(value);
	}
	: function isCallable(value) {
		if (isDDA(value)) { return true; }
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (hasToStringTag) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr.call(value);
		if (strClass !== fnClass && strClass !== genClass && !(/^\[object HTML/).test(strClass)) { return false; }
		return tryFunctionObject(value);
	};


/***/ }),
/* 80 */
/***/ ((module) => {

"use strict";


var possibleNames = [
	'BigInt64Array',
	'BigUint64Array',
	'Float32Array',
	'Float64Array',
	'Int16Array',
	'Int32Array',
	'Int8Array',
	'Uint16Array',
	'Uint32Array',
	'Uint8Array',
	'Uint8ClampedArray'
];

var g = typeof globalThis === 'undefined' ? global : globalThis;

module.exports = function availableTypedArrays() {
	var out = [];
	for (var i = 0; i < possibleNames.length; i++) {
		if (typeof g[possibleNames[i]] === 'function') {
			out[out.length] = possibleNames[i];
		}
	}
	return out;
};


/***/ }),
/* 81 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(70);

var $gOPD = GetIntrinsic('%Object.getOwnPropertyDescriptor%', true);

if ($gOPD) {
	try {
		$gOPD([], 'length');
	} catch (e) {
		// IE 8 has a broken gOPD
		$gOPD = null;
	}
}

module.exports = $gOPD;


/***/ }),
/* 82 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var forEach = __webpack_require__(78);
var availableTypedArrays = __webpack_require__(80);
var callBound = __webpack_require__(69);

var $toString = callBound('Object.prototype.toString');
var hasToStringTag = __webpack_require__(67)();
var gOPD = __webpack_require__(81);

var g = typeof globalThis === 'undefined' ? global : globalThis;
var typedArrays = availableTypedArrays();

var $indexOf = callBound('Array.prototype.indexOf', true) || function indexOf(array, value) {
	for (var i = 0; i < array.length; i += 1) {
		if (array[i] === value) {
			return i;
		}
	}
	return -1;
};
var $slice = callBound('String.prototype.slice');
var toStrTags = {};
var getPrototypeOf = Object.getPrototypeOf; // require('getprototypeof');
if (hasToStringTag && gOPD && getPrototypeOf) {
	forEach(typedArrays, function (typedArray) {
		var arr = new g[typedArray]();
		if (Symbol.toStringTag in arr) {
			var proto = getPrototypeOf(arr);
			var descriptor = gOPD(proto, Symbol.toStringTag);
			if (!descriptor) {
				var superProto = getPrototypeOf(proto);
				descriptor = gOPD(superProto, Symbol.toStringTag);
			}
			toStrTags[typedArray] = descriptor.get;
		}
	});
}

var tryTypedArrays = function tryAllTypedArrays(value) {
	var anyTrue = false;
	forEach(toStrTags, function (getter, typedArray) {
		if (!anyTrue) {
			try {
				anyTrue = getter.call(value) === typedArray;
			} catch (e) { /**/ }
		}
	});
	return anyTrue;
};

module.exports = function isTypedArray(value) {
	if (!value || typeof value !== 'object') { return false; }
	if (!hasToStringTag || !(Symbol.toStringTag in value)) {
		var tag = $slice($toString(value), 8, -1);
		return $indexOf(typedArrays, tag) > -1;
	}
	if (!gOPD) { return false; }
	return tryTypedArrays(value);
};


/***/ }),
/* 83 */
/***/ ((module) => {

module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}

/***/ }),
/* 84 */
/***/ ((module) => {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}


/***/ }),
/* 85 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/* provided dependency */ var process = __webpack_require__(24);
/* provided dependency */ var console = __webpack_require__(63);
// Currently in sync with Node.js lib/assert.js
// https://github.com/nodejs/node/commit/2a51ae424a513ec9a6aa3466baa0cc1d55dd4f3b
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _require = __webpack_require__(86),
    _require$codes = _require.codes,
    ERR_AMBIGUOUS_ARGUMENT = _require$codes.ERR_AMBIGUOUS_ARGUMENT,
    ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
    ERR_INVALID_ARG_VALUE = _require$codes.ERR_INVALID_ARG_VALUE,
    ERR_INVALID_RETURN_VALUE = _require$codes.ERR_INVALID_RETURN_VALUE,
    ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS;

var AssertionError = __webpack_require__(87);

var _require2 = __webpack_require__(64),
    inspect = _require2.inspect;

var _require$types = (__webpack_require__(64).types),
    isPromise = _require$types.isPromise,
    isRegExp = _require$types.isRegExp;

var objectAssign = Object.assign ? Object.assign : (__webpack_require__(88).assign);
var objectIs = Object.is ? Object.is : __webpack_require__(89);
var errorCache = new Map();
var isDeepEqual;
var isDeepStrictEqual;
var parseExpressionAt;
var findNodeAround;
var decoder;

function lazyLoadComparison() {
  var comparison = __webpack_require__(98);

  isDeepEqual = comparison.isDeepEqual;
  isDeepStrictEqual = comparison.isDeepStrictEqual;
} // Escape control characters but not \n and \t to keep the line breaks and
// indentation intact.
// eslint-disable-next-line no-control-regex


var escapeSequencesRegExp = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
var meta = ["\\u0000", "\\u0001", "\\u0002", "\\u0003", "\\u0004", "\\u0005", "\\u0006", "\\u0007", '\\b', '', '', "\\u000b", '\\f', '', "\\u000e", "\\u000f", "\\u0010", "\\u0011", "\\u0012", "\\u0013", "\\u0014", "\\u0015", "\\u0016", "\\u0017", "\\u0018", "\\u0019", "\\u001a", "\\u001b", "\\u001c", "\\u001d", "\\u001e", "\\u001f"];

var escapeFn = function escapeFn(str) {
  return meta[str.charCodeAt(0)];
};

var warned = false; // The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;
var NO_EXCEPTION_SENTINEL = {}; // All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided. All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function innerFail(obj) {
  if (obj.message instanceof Error) throw obj.message;
  throw new AssertionError(obj);
}

function fail(actual, expected, message, operator, stackStartFn) {
  var argsLen = arguments.length;
  var internalMessage;

  if (argsLen === 0) {
    internalMessage = 'Failed';
  } else if (argsLen === 1) {
    message = actual;
    actual = undefined;
  } else {
    if (warned === false) {
      warned = true;
      var warn = process.emitWarning ? process.emitWarning : console.warn.bind(console);
      warn('assert.fail() with more than one argument is deprecated. ' + 'Please use assert.strictEqual() instead or only pass a message.', 'DeprecationWarning', 'DEP0094');
    }

    if (argsLen === 2) operator = '!=';
  }

  if (message instanceof Error) throw message;
  var errArgs = {
    actual: actual,
    expected: expected,
    operator: operator === undefined ? 'fail' : operator,
    stackStartFn: stackStartFn || fail
  };

  if (message !== undefined) {
    errArgs.message = message;
  }

  var err = new AssertionError(errArgs);

  if (internalMessage) {
    err.message = internalMessage;
    err.generatedMessage = true;
  }

  throw err;
}

assert.fail = fail; // The AssertionError is defined in internal/error.

assert.AssertionError = AssertionError;

function innerOk(fn, argLen, value, message) {
  if (!value) {
    var generatedMessage = false;

    if (argLen === 0) {
      generatedMessage = true;
      message = 'No value argument passed to `assert.ok()`';
    } else if (message instanceof Error) {
      throw message;
    }

    var err = new AssertionError({
      actual: value,
      expected: true,
      message: message,
      operator: '==',
      stackStartFn: fn
    });
    err.generatedMessage = generatedMessage;
    throw err;
  }
} // Pure assertion tests whether a value is truthy, as determined
// by !!value.


function ok() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  innerOk.apply(void 0, [ok, args.length].concat(args));
}

assert.ok = ok; // The equality assertion tests shallow, coercive equality with ==.

/* eslint-disable no-restricted-properties */

assert.equal = function equal(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected');
  } // eslint-disable-next-line eqeqeq


  if (actual != expected) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: '==',
      stackStartFn: equal
    });
  }
}; // The non-equality assertion tests for whether two objects are not
// equal with !=.


assert.notEqual = function notEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected');
  } // eslint-disable-next-line eqeqeq


  if (actual == expected) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: '!=',
      stackStartFn: notEqual
    });
  }
}; // The equivalence assertion tests a deep equality relation.


assert.deepEqual = function deepEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected');
  }

  if (isDeepEqual === undefined) lazyLoadComparison();

  if (!isDeepEqual(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'deepEqual',
      stackStartFn: deepEqual
    });
  }
}; // The non-equivalence assertion tests for any deep inequality.


assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected');
  }

  if (isDeepEqual === undefined) lazyLoadComparison();

  if (isDeepEqual(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'notDeepEqual',
      stackStartFn: notDeepEqual
    });
  }
};
/* eslint-enable */


assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected');
  }

  if (isDeepEqual === undefined) lazyLoadComparison();

  if (!isDeepStrictEqual(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'deepStrictEqual',
      stackStartFn: deepStrictEqual
    });
  }
};

assert.notDeepStrictEqual = notDeepStrictEqual;

function notDeepStrictEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected');
  }

  if (isDeepEqual === undefined) lazyLoadComparison();

  if (isDeepStrictEqual(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'notDeepStrictEqual',
      stackStartFn: notDeepStrictEqual
    });
  }
}

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected');
  }

  if (!objectIs(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'strictEqual',
      stackStartFn: strictEqual
    });
  }
};

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (arguments.length < 2) {
    throw new ERR_MISSING_ARGS('actual', 'expected');
  }

  if (objectIs(actual, expected)) {
    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: 'notStrictEqual',
      stackStartFn: notStrictEqual
    });
  }
};

var Comparison = function Comparison(obj, keys, actual) {
  var _this = this;

  _classCallCheck(this, Comparison);

  keys.forEach(function (key) {
    if (key in obj) {
      if (actual !== undefined && typeof actual[key] === 'string' && isRegExp(obj[key]) && obj[key].test(actual[key])) {
        _this[key] = actual[key];
      } else {
        _this[key] = obj[key];
      }
    }
  });
};

function compareExceptionKey(actual, expected, key, message, keys, fn) {
  if (!(key in actual) || !isDeepStrictEqual(actual[key], expected[key])) {
    if (!message) {
      // Create placeholder objects to create a nice output.
      var a = new Comparison(actual, keys);
      var b = new Comparison(expected, keys, actual);
      var err = new AssertionError({
        actual: a,
        expected: b,
        operator: 'deepStrictEqual',
        stackStartFn: fn
      });
      err.actual = actual;
      err.expected = expected;
      err.operator = fn.name;
      throw err;
    }

    innerFail({
      actual: actual,
      expected: expected,
      message: message,
      operator: fn.name,
      stackStartFn: fn
    });
  }
}

function expectedException(actual, expected, msg, fn) {
  if (typeof expected !== 'function') {
    if (isRegExp(expected)) return expected.test(actual); // assert.doesNotThrow does not accept objects.

    if (arguments.length === 2) {
      throw new ERR_INVALID_ARG_TYPE('expected', ['Function', 'RegExp'], expected);
    } // Handle primitives properly.


    if (_typeof(actual) !== 'object' || actual === null) {
      var err = new AssertionError({
        actual: actual,
        expected: expected,
        message: msg,
        operator: 'deepStrictEqual',
        stackStartFn: fn
      });
      err.operator = fn.name;
      throw err;
    }

    var keys = Object.keys(expected); // Special handle errors to make sure the name and the message are compared
    // as well.

    if (expected instanceof Error) {
      keys.push('name', 'message');
    } else if (keys.length === 0) {
      throw new ERR_INVALID_ARG_VALUE('error', expected, 'may not be an empty object');
    }

    if (isDeepEqual === undefined) lazyLoadComparison();
    keys.forEach(function (key) {
      if (typeof actual[key] === 'string' && isRegExp(expected[key]) && expected[key].test(actual[key])) {
        return;
      }

      compareExceptionKey(actual, expected, key, msg, keys, fn);
    });
    return true;
  } // Guard instanceof against arrow functions as they don't have a prototype.


  if (expected.prototype !== undefined && actual instanceof expected) {
    return true;
  }

  if (Error.isPrototypeOf(expected)) {
    return false;
  }

  return expected.call({}, actual) === true;
}

function getActual(fn) {
  if (typeof fn !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('fn', 'Function', fn);
  }

  try {
    fn();
  } catch (e) {
    return e;
  }

  return NO_EXCEPTION_SENTINEL;
}

function checkIsPromise(obj) {
  // Accept native ES6 promises and promises that are implemented in a similar
  // way. Do not accept thenables that use a function as `obj` and that have no
  // `catch` handler.
  // TODO: thenables are checked up until they have the correct methods,
  // but according to documentation, the `then` method should receive
  // the `fulfill` and `reject` arguments as well or it may be never resolved.
  return isPromise(obj) || obj !== null && _typeof(obj) === 'object' && typeof obj.then === 'function' && typeof obj.catch === 'function';
}

function waitForActual(promiseFn) {
  return Promise.resolve().then(function () {
    var resultPromise;

    if (typeof promiseFn === 'function') {
      // Return a rejected promise if `promiseFn` throws synchronously.
      resultPromise = promiseFn(); // Fail in case no promise is returned.

      if (!checkIsPromise(resultPromise)) {
        throw new ERR_INVALID_RETURN_VALUE('instance of Promise', 'promiseFn', resultPromise);
      }
    } else if (checkIsPromise(promiseFn)) {
      resultPromise = promiseFn;
    } else {
      throw new ERR_INVALID_ARG_TYPE('promiseFn', ['Function', 'Promise'], promiseFn);
    }

    return Promise.resolve().then(function () {
      return resultPromise;
    }).then(function () {
      return NO_EXCEPTION_SENTINEL;
    }).catch(function (e) {
      return e;
    });
  });
}

function expectsError(stackStartFn, actual, error, message) {
  if (typeof error === 'string') {
    if (arguments.length === 4) {
      throw new ERR_INVALID_ARG_TYPE('error', ['Object', 'Error', 'Function', 'RegExp'], error);
    }

    if (_typeof(actual) === 'object' && actual !== null) {
      if (actual.message === error) {
        throw new ERR_AMBIGUOUS_ARGUMENT('error/message', "The error message \"".concat(actual.message, "\" is identical to the message."));
      }
    } else if (actual === error) {
      throw new ERR_AMBIGUOUS_ARGUMENT('error/message', "The error \"".concat(actual, "\" is identical to the message."));
    }

    message = error;
    error = undefined;
  } else if (error != null && _typeof(error) !== 'object' && typeof error !== 'function') {
    throw new ERR_INVALID_ARG_TYPE('error', ['Object', 'Error', 'Function', 'RegExp'], error);
  }

  if (actual === NO_EXCEPTION_SENTINEL) {
    var details = '';

    if (error && error.name) {
      details += " (".concat(error.name, ")");
    }

    details += message ? ": ".concat(message) : '.';
    var fnType = stackStartFn.name === 'rejects' ? 'rejection' : 'exception';
    innerFail({
      actual: undefined,
      expected: error,
      operator: stackStartFn.name,
      message: "Missing expected ".concat(fnType).concat(details),
      stackStartFn: stackStartFn
    });
  }

  if (error && !expectedException(actual, error, message, stackStartFn)) {
    throw actual;
  }
}

function expectsNoError(stackStartFn, actual, error, message) {
  if (actual === NO_EXCEPTION_SENTINEL) return;

  if (typeof error === 'string') {
    message = error;
    error = undefined;
  }

  if (!error || expectedException(actual, error)) {
    var details = message ? ": ".concat(message) : '.';
    var fnType = stackStartFn.name === 'doesNotReject' ? 'rejection' : 'exception';
    innerFail({
      actual: actual,
      expected: error,
      operator: stackStartFn.name,
      message: "Got unwanted ".concat(fnType).concat(details, "\n") + "Actual message: \"".concat(actual && actual.message, "\""),
      stackStartFn: stackStartFn
    });
  }

  throw actual;
}

assert.throws = function throws(promiseFn) {
  for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    args[_key2 - 1] = arguments[_key2];
  }

  expectsError.apply(void 0, [throws, getActual(promiseFn)].concat(args));
};

assert.rejects = function rejects(promiseFn) {
  for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    args[_key3 - 1] = arguments[_key3];
  }

  return waitForActual(promiseFn).then(function (result) {
    return expectsError.apply(void 0, [rejects, result].concat(args));
  });
};

assert.doesNotThrow = function doesNotThrow(fn) {
  for (var _len4 = arguments.length, args = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
    args[_key4 - 1] = arguments[_key4];
  }

  expectsNoError.apply(void 0, [doesNotThrow, getActual(fn)].concat(args));
};

assert.doesNotReject = function doesNotReject(fn) {
  for (var _len5 = arguments.length, args = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
    args[_key5 - 1] = arguments[_key5];
  }

  return waitForActual(fn).then(function (result) {
    return expectsNoError.apply(void 0, [doesNotReject, result].concat(args));
  });
};

assert.ifError = function ifError(err) {
  if (err !== null && err !== undefined) {
    var message = 'ifError got unwanted exception: ';

    if (_typeof(err) === 'object' && typeof err.message === 'string') {
      if (err.message.length === 0 && err.constructor) {
        message += err.constructor.name;
      } else {
        message += err.message;
      }
    } else {
      message += inspect(err);
    }

    var newErr = new AssertionError({
      actual: err,
      expected: null,
      operator: 'ifError',
      message: message,
      stackStartFn: ifError
    }); // Make sure we actually have a stack trace!

    var origStack = err.stack;

    if (typeof origStack === 'string') {
      // This will remove any duplicated frames from the error frames taken
      // from within `ifError` and add the original error frames to the newly
      // created ones.
      var tmp2 = origStack.split('\n');
      tmp2.shift(); // Filter all frames existing in err.stack.

      var tmp1 = newErr.stack.split('\n');

      for (var i = 0; i < tmp2.length; i++) {
        // Find the first occurrence of the frame.
        var pos = tmp1.indexOf(tmp2[i]);

        if (pos !== -1) {
          // Only keep new frames.
          tmp1 = tmp1.slice(0, pos);
          break;
        }
      }

      newErr.stack = "".concat(tmp1.join('\n'), "\n").concat(tmp2.join('\n'));
    }

    throw newErr;
  }
}; // Expose a strict only variant of assert


function strict() {
  for (var _len6 = arguments.length, args = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
    args[_key6] = arguments[_key6];
  }

  innerOk.apply(void 0, [strict, args.length].concat(args));
}

assert.strict = objectAssign(strict, assert, {
  equal: assert.strictEqual,
  deepEqual: assert.deepStrictEqual,
  notEqual: assert.notStrictEqual,
  notDeepEqual: assert.notDeepStrictEqual
});
assert.strict.strict = assert.strict;

/***/ }),
/* 86 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
// Currently in sync with Node.js lib/internal/errors.js
// https://github.com/nodejs/node/commit/3b044962c48fe313905877a96b5d0894a5404f6f

/* eslint node-core/documented-errors: "error" */

/* eslint node-core/alphabetize-errors: "error" */

/* eslint node-core/prefer-util-format-errors: "error" */
 // The whole point behind this internal module is to allow Node.js to no
// longer be forced to treat every error message change as a semver-major
// change. The NodeError classes here all expose a `code` property whose
// value statically and permanently identifies the error. While the error
// message may change, the code should not.

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var codes = {}; // Lazy loaded

var assert;
var util;

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inherits(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      var _this;

      _classCallCheck(this, NodeError);

      _this = _possibleConstructorReturn(this, _getPrototypeOf(NodeError).call(this, getMessage(arg1, arg2, arg3)));
      _this.code = code;
      return _this;
    }

    return NodeError;
  }(Base);

  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_AMBIGUOUS_ARGUMENT', 'The "%s" argument is ambiguous. %s', TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  if (assert === undefined) assert = __webpack_require__(85);
  assert(typeof name === 'string', "'name' must be a string"); // determiner: 'must be' or 'must not be'

  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } // TODO(BridgeAR): Improve the output by showing `null` and similar.


  msg += ". Received type ".concat(_typeof(actual));
  return msg;
}, TypeError);
createErrorType('ERR_INVALID_ARG_VALUE', function (name, value) {
  var reason = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'is invalid';
  if (util === undefined) util = __webpack_require__(64);
  var inspected = util.inspect(value);

  if (inspected.length > 128) {
    inspected = "".concat(inspected.slice(0, 128), "...");
  }

  return "The argument '".concat(name, "' ").concat(reason, ". Received ").concat(inspected);
}, TypeError, RangeError);
createErrorType('ERR_INVALID_RETURN_VALUE', function (input, name, value) {
  var type;

  if (value && value.constructor && value.constructor.name) {
    type = "instance of ".concat(value.constructor.name);
  } else {
    type = "type ".concat(_typeof(value));
  }

  return "Expected ".concat(input, " to be returned from the \"").concat(name, "\"") + " function but got ".concat(type, ".");
}, TypeError);
createErrorType('ERR_MISSING_ARGS', function () {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  if (assert === undefined) assert = __webpack_require__(85);
  assert(args.length > 0, 'At least one arg needs to be specified');
  var msg = 'The ';
  var len = args.length;
  args = args.map(function (a) {
    return "\"".concat(a, "\"");
  });

  switch (len) {
    case 1:
      msg += "".concat(args[0], " argument");
      break;

    case 2:
      msg += "".concat(args[0], " and ").concat(args[1], " arguments");
      break;

    default:
      msg += args.slice(0, len - 1).join(', ');
      msg += ", and ".concat(args[len - 1], " arguments");
      break;
  }

  return "".concat(msg, " must be specified");
}, TypeError);
module.exports.codes = codes;

/***/ }),
/* 87 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
/* provided dependency */ var process = __webpack_require__(24);
// Currently in sync with Node.js lib/internal/assert/assertion_error.js
// https://github.com/nodejs/node/commit/0817840f775032169ddd70c85ac059f18ffcc81c


function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _construct(Parent, args, Class) { if (isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var _require = __webpack_require__(64),
    inspect = _require.inspect;

var _require2 = __webpack_require__(86),
    ERR_INVALID_ARG_TYPE = _require2.codes.ERR_INVALID_ARG_TYPE; // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/repeat


function repeat(str, count) {
  count = Math.floor(count);
  if (str.length == 0 || count == 0) return '';
  var maxCount = str.length * count;
  count = Math.floor(Math.log(count) / Math.log(2));

  while (count) {
    str += str;
    count--;
  }

  str += str.substring(0, maxCount - str.length);
  return str;
}

var blue = '';
var green = '';
var red = '';
var white = '';
var kReadableOperator = {
  deepStrictEqual: 'Expected values to be strictly deep-equal:',
  strictEqual: 'Expected values to be strictly equal:',
  strictEqualObject: 'Expected "actual" to be reference-equal to "expected":',
  deepEqual: 'Expected values to be loosely deep-equal:',
  equal: 'Expected values to be loosely equal:',
  notDeepStrictEqual: 'Expected "actual" not to be strictly deep-equal to:',
  notStrictEqual: 'Expected "actual" to be strictly unequal to:',
  notStrictEqualObject: 'Expected "actual" not to be reference-equal to "expected":',
  notDeepEqual: 'Expected "actual" not to be loosely deep-equal to:',
  notEqual: 'Expected "actual" to be loosely unequal to:',
  notIdentical: 'Values identical but not reference-equal:'
}; // Comparing short primitives should just show === / !== instead of using the
// diff.

var kMaxShortLength = 10;

function copyError(source) {
  var keys = Object.keys(source);
  var target = Object.create(Object.getPrototypeOf(source));
  keys.forEach(function (key) {
    target[key] = source[key];
  });
  Object.defineProperty(target, 'message', {
    value: source.message
  });
  return target;
}

function inspectValue(val) {
  // The util.inspect default values could be changed. This makes sure the
  // error messages contain the necessary information nevertheless.
  return inspect(val, {
    compact: false,
    customInspect: false,
    depth: 1000,
    maxArrayLength: Infinity,
    // Assert compares only enumerable properties (with a few exceptions).
    showHidden: false,
    // Having a long line as error is better than wrapping the line for
    // comparison for now.
    // TODO(BridgeAR): `breakLength` should be limited as soon as soon as we
    // have meta information about the inspected properties (i.e., know where
    // in what line the property starts and ends).
    breakLength: Infinity,
    // Assert does not detect proxies currently.
    showProxy: false,
    sorted: true,
    // Inspect getters as we also check them when comparing entries.
    getters: true
  });
}

function createErrDiff(actual, expected, operator) {
  var other = '';
  var res = '';
  var lastPos = 0;
  var end = '';
  var skipped = false;
  var actualInspected = inspectValue(actual);
  var actualLines = actualInspected.split('\n');
  var expectedLines = inspectValue(expected).split('\n');
  var i = 0;
  var indicator = ''; // In case both values are objects explicitly mark them as not reference equal
  // for the `strictEqual` operator.

  if (operator === 'strictEqual' && _typeof(actual) === 'object' && _typeof(expected) === 'object' && actual !== null && expected !== null) {
    operator = 'strictEqualObject';
  } // If "actual" and "expected" fit on a single line and they are not strictly
  // equal, check further special handling.


  if (actualLines.length === 1 && expectedLines.length === 1 && actualLines[0] !== expectedLines[0]) {
    var inputLength = actualLines[0].length + expectedLines[0].length; // If the character length of "actual" and "expected" together is less than
    // kMaxShortLength and if neither is an object and at least one of them is
    // not `zero`, use the strict equal comparison to visualize the output.

    if (inputLength <= kMaxShortLength) {
      if ((_typeof(actual) !== 'object' || actual === null) && (_typeof(expected) !== 'object' || expected === null) && (actual !== 0 || expected !== 0)) {
        // -0 === +0
        return "".concat(kReadableOperator[operator], "\n\n") + "".concat(actualLines[0], " !== ").concat(expectedLines[0], "\n");
      }
    } else if (operator !== 'strictEqualObject') {
      // If the stderr is a tty and the input length is lower than the current
      // columns per line, add a mismatch indicator below the output. If it is
      // not a tty, use a default value of 80 characters.
      var maxLength = process.stderr && process.stderr.isTTY ? process.stderr.columns : 80;

      if (inputLength < maxLength) {
        while (actualLines[0][i] === expectedLines[0][i]) {
          i++;
        } // Ignore the first characters.


        if (i > 2) {
          // Add position indicator for the first mismatch in case it is a
          // single line and the input length is less than the column length.
          indicator = "\n  ".concat(repeat(' ', i), "^");
          i = 0;
        }
      }
    }
  } // Remove all ending lines that match (this optimizes the output for
  // readability by reducing the number of total changed lines).


  var a = actualLines[actualLines.length - 1];
  var b = expectedLines[expectedLines.length - 1];

  while (a === b) {
    if (i++ < 2) {
      end = "\n  ".concat(a).concat(end);
    } else {
      other = a;
    }

    actualLines.pop();
    expectedLines.pop();
    if (actualLines.length === 0 || expectedLines.length === 0) break;
    a = actualLines[actualLines.length - 1];
    b = expectedLines[expectedLines.length - 1];
  }

  var maxLines = Math.max(actualLines.length, expectedLines.length); // Strict equal with identical objects that are not identical by reference.
  // E.g., assert.deepStrictEqual({ a: Symbol() }, { a: Symbol() })

  if (maxLines === 0) {
    // We have to get the result again. The lines were all removed before.
    var _actualLines = actualInspected.split('\n'); // Only remove lines in case it makes sense to collapse those.
    // TODO: Accept env to always show the full error.


    if (_actualLines.length > 30) {
      _actualLines[26] = "".concat(blue, "...").concat(white);

      while (_actualLines.length > 27) {
        _actualLines.pop();
      }
    }

    return "".concat(kReadableOperator.notIdentical, "\n\n").concat(_actualLines.join('\n'), "\n");
  }

  if (i > 3) {
    end = "\n".concat(blue, "...").concat(white).concat(end);
    skipped = true;
  }

  if (other !== '') {
    end = "\n  ".concat(other).concat(end);
    other = '';
  }

  var printedLines = 0;
  var msg = kReadableOperator[operator] + "\n".concat(green, "+ actual").concat(white, " ").concat(red, "- expected").concat(white);
  var skippedMsg = " ".concat(blue, "...").concat(white, " Lines skipped");

  for (i = 0; i < maxLines; i++) {
    // Only extra expected lines exist
    var cur = i - lastPos;

    if (actualLines.length < i + 1) {
      // If the last diverging line is more than one line above and the
      // current line is at least line three, add some of the former lines and
      // also add dots to indicate skipped entries.
      if (cur > 1 && i > 2) {
        if (cur > 4) {
          res += "\n".concat(blue, "...").concat(white);
          skipped = true;
        } else if (cur > 3) {
          res += "\n  ".concat(expectedLines[i - 2]);
          printedLines++;
        }

        res += "\n  ".concat(expectedLines[i - 1]);
        printedLines++;
      } // Mark the current line as the last diverging one.


      lastPos = i; // Add the expected line to the cache.

      other += "\n".concat(red, "-").concat(white, " ").concat(expectedLines[i]);
      printedLines++; // Only extra actual lines exist
    } else if (expectedLines.length < i + 1) {
      // If the last diverging line is more than one line above and the
      // current line is at least line three, add some of the former lines and
      // also add dots to indicate skipped entries.
      if (cur > 1 && i > 2) {
        if (cur > 4) {
          res += "\n".concat(blue, "...").concat(white);
          skipped = true;
        } else if (cur > 3) {
          res += "\n  ".concat(actualLines[i - 2]);
          printedLines++;
        }

        res += "\n  ".concat(actualLines[i - 1]);
        printedLines++;
      } // Mark the current line as the last diverging one.


      lastPos = i; // Add the actual line to the result.

      res += "\n".concat(green, "+").concat(white, " ").concat(actualLines[i]);
      printedLines++; // Lines diverge
    } else {
      var expectedLine = expectedLines[i];
      var actualLine = actualLines[i]; // If the lines diverge, specifically check for lines that only diverge by
      // a trailing comma. In that case it is actually identical and we should
      // mark it as such.

      var divergingLines = actualLine !== expectedLine && (!endsWith(actualLine, ',') || actualLine.slice(0, -1) !== expectedLine); // If the expected line has a trailing comma but is otherwise identical,
      // add a comma at the end of the actual line. Otherwise the output could
      // look weird as in:
      //
      //   [
      //     1         // No comma at the end!
      // +   2
      //   ]
      //

      if (divergingLines && endsWith(expectedLine, ',') && expectedLine.slice(0, -1) === actualLine) {
        divergingLines = false;
        actualLine += ',';
      }

      if (divergingLines) {
        // If the last diverging line is more than one line above and the
        // current line is at least line three, add some of the former lines and
        // also add dots to indicate skipped entries.
        if (cur > 1 && i > 2) {
          if (cur > 4) {
            res += "\n".concat(blue, "...").concat(white);
            skipped = true;
          } else if (cur > 3) {
            res += "\n  ".concat(actualLines[i - 2]);
            printedLines++;
          }

          res += "\n  ".concat(actualLines[i - 1]);
          printedLines++;
        } // Mark the current line as the last diverging one.


        lastPos = i; // Add the actual line to the result and cache the expected diverging
        // line so consecutive diverging lines show up as +++--- and not +-+-+-.

        res += "\n".concat(green, "+").concat(white, " ").concat(actualLine);
        other += "\n".concat(red, "-").concat(white, " ").concat(expectedLine);
        printedLines += 2; // Lines are identical
      } else {
        // Add all cached information to the result before adding other things
        // and reset the cache.
        res += other;
        other = ''; // If the last diverging line is exactly one line above or if it is the
        // very first line, add the line to the result.

        if (cur === 1 || i === 0) {
          res += "\n  ".concat(actualLine);
          printedLines++;
        }
      }
    } // Inspected object to big (Show ~20 rows max)


    if (printedLines > 20 && i < maxLines - 2) {
      return "".concat(msg).concat(skippedMsg, "\n").concat(res, "\n").concat(blue, "...").concat(white).concat(other, "\n") + "".concat(blue, "...").concat(white);
    }
  }

  return "".concat(msg).concat(skipped ? skippedMsg : '', "\n").concat(res).concat(other).concat(end).concat(indicator);
}

var AssertionError =
/*#__PURE__*/
function (_Error) {
  _inherits(AssertionError, _Error);

  function AssertionError(options) {
    var _this;

    _classCallCheck(this, AssertionError);

    if (_typeof(options) !== 'object' || options === null) {
      throw new ERR_INVALID_ARG_TYPE('options', 'Object', options);
    }

    var message = options.message,
        operator = options.operator,
        stackStartFn = options.stackStartFn;
    var actual = options.actual,
        expected = options.expected;
    var limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 0;

    if (message != null) {
      _this = _possibleConstructorReturn(this, _getPrototypeOf(AssertionError).call(this, String(message)));
    } else {
      if (process.stderr && process.stderr.isTTY) {
        // Reset on each call to make sure we handle dynamically set environment
        // variables correct.
        if (process.stderr && process.stderr.getColorDepth && process.stderr.getColorDepth() !== 1) {
          blue = "\x1B[34m";
          green = "\x1B[32m";
          white = "\x1B[39m";
          red = "\x1B[31m";
        } else {
          blue = '';
          green = '';
          white = '';
          red = '';
        }
      } // Prevent the error stack from being visible by duplicating the error
      // in a very close way to the original in case both sides are actually
      // instances of Error.


      if (_typeof(actual) === 'object' && actual !== null && _typeof(expected) === 'object' && expected !== null && 'stack' in actual && actual instanceof Error && 'stack' in expected && expected instanceof Error) {
        actual = copyError(actual);
        expected = copyError(expected);
      }

      if (operator === 'deepStrictEqual' || operator === 'strictEqual') {
        _this = _possibleConstructorReturn(this, _getPrototypeOf(AssertionError).call(this, createErrDiff(actual, expected, operator)));
      } else if (operator === 'notDeepStrictEqual' || operator === 'notStrictEqual') {
        // In case the objects are equal but the operator requires unequal, show
        // the first object and say A equals B
        var base = kReadableOperator[operator];
        var res = inspectValue(actual).split('\n'); // In case "actual" is an object, it should not be reference equal.

        if (operator === 'notStrictEqual' && _typeof(actual) === 'object' && actual !== null) {
          base = kReadableOperator.notStrictEqualObject;
        } // Only remove lines in case it makes sense to collapse those.
        // TODO: Accept env to always show the full error.


        if (res.length > 30) {
          res[26] = "".concat(blue, "...").concat(white);

          while (res.length > 27) {
            res.pop();
          }
        } // Only print a single input.


        if (res.length === 1) {
          _this = _possibleConstructorReturn(this, _getPrototypeOf(AssertionError).call(this, "".concat(base, " ").concat(res[0])));
        } else {
          _this = _possibleConstructorReturn(this, _getPrototypeOf(AssertionError).call(this, "".concat(base, "\n\n").concat(res.join('\n'), "\n")));
        }
      } else {
        var _res = inspectValue(actual);

        var other = '';
        var knownOperators = kReadableOperator[operator];

        if (operator === 'notDeepEqual' || operator === 'notEqual') {
          _res = "".concat(kReadableOperator[operator], "\n\n").concat(_res);

          if (_res.length > 1024) {
            _res = "".concat(_res.slice(0, 1021), "...");
          }
        } else {
          other = "".concat(inspectValue(expected));

          if (_res.length > 512) {
            _res = "".concat(_res.slice(0, 509), "...");
          }

          if (other.length > 512) {
            other = "".concat(other.slice(0, 509), "...");
          }

          if (operator === 'deepEqual' || operator === 'equal') {
            _res = "".concat(knownOperators, "\n\n").concat(_res, "\n\nshould equal\n\n");
          } else {
            other = " ".concat(operator, " ").concat(other);
          }
        }

        _this = _possibleConstructorReturn(this, _getPrototypeOf(AssertionError).call(this, "".concat(_res).concat(other)));
      }
    }

    Error.stackTraceLimit = limit;
    _this.generatedMessage = !message;
    Object.defineProperty(_assertThisInitialized(_this), 'name', {
      value: 'AssertionError [ERR_ASSERTION]',
      enumerable: false,
      writable: true,
      configurable: true
    });
    _this.code = 'ERR_ASSERTION';
    _this.actual = actual;
    _this.expected = expected;
    _this.operator = operator;

    if (Error.captureStackTrace) {
      // eslint-disable-next-line no-restricted-syntax
      Error.captureStackTrace(_assertThisInitialized(_this), stackStartFn);
    } // Create error message including the error code in the name.


    _this.stack; // Reset the name.

    _this.name = 'AssertionError';
    return _possibleConstructorReturn(_this);
  }

  _createClass(AssertionError, [{
    key: "toString",
    value: function toString() {
      return "".concat(this.name, " [").concat(this.code, "]: ").concat(this.message);
    }
  }, {
    key: inspect.custom,
    value: function value(recurseTimes, ctx) {
      // This limits the `actual` and `expected` property default inspection to
      // the minimum depth. Otherwise those values would be too verbose compared
      // to the actual error message which contains a combined view of these two
      // input values.
      return inspect(this, _objectSpread({}, ctx, {
        customInspect: false,
        depth: 0
      }));
    }
  }]);

  return AssertionError;
}(_wrapNativeSuper(Error));

module.exports = AssertionError;

/***/ }),
/* 88 */
/***/ ((module) => {

"use strict";
/**
 * Code refactored from Mozilla Developer Network:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 */



function assign(target, firstSource) {
  if (target === undefined || target === null) {
    throw new TypeError('Cannot convert first argument to object');
  }

  var to = Object(target);
  for (var i = 1; i < arguments.length; i++) {
    var nextSource = arguments[i];
    if (nextSource === undefined || nextSource === null) {
      continue;
    }

    var keysArray = Object.keys(Object(nextSource));
    for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
      var nextKey = keysArray[nextIndex];
      var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
      if (desc !== undefined && desc.enumerable) {
        to[nextKey] = nextSource[nextKey];
      }
    }
  }
  return to;
}

function polyfill() {
  if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
      enumerable: false,
      configurable: true,
      writable: true,
      value: assign
    });
  }
}

module.exports = {
  assign: assign,
  polyfill: polyfill
};


/***/ }),
/* 89 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var define = __webpack_require__(90);
var callBind = __webpack_require__(75);

var implementation = __webpack_require__(95);
var getPolyfill = __webpack_require__(96);
var shim = __webpack_require__(97);

var polyfill = callBind(getPolyfill(), Object);

define(polyfill, {
	getPolyfill: getPolyfill,
	implementation: implementation,
	shim: shim
});

module.exports = polyfill;


/***/ }),
/* 90 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var keys = __webpack_require__(91);
var hasSymbols = typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol';

var toStr = Object.prototype.toString;
var concat = Array.prototype.concat;
var origDefineProperty = Object.defineProperty;

var isFunction = function (fn) {
	return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
};

var hasPropertyDescriptors = __webpack_require__(94)();

var supportsDescriptors = origDefineProperty && hasPropertyDescriptors;

var defineProperty = function (object, name, value, predicate) {
	if (name in object && (!isFunction(predicate) || !predicate())) {
		return;
	}
	if (supportsDescriptors) {
		origDefineProperty(object, name, {
			configurable: true,
			enumerable: false,
			value: value,
			writable: true
		});
	} else {
		object[name] = value; // eslint-disable-line no-param-reassign
	}
};

var defineProperties = function (object, map) {
	var predicates = arguments.length > 2 ? arguments[2] : {};
	var props = keys(map);
	if (hasSymbols) {
		props = concat.call(props, Object.getOwnPropertySymbols(map));
	}
	for (var i = 0; i < props.length; i += 1) {
		defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
	}
};

defineProperties.supportsDescriptors = !!supportsDescriptors;

module.exports = defineProperties;


/***/ }),
/* 91 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var slice = Array.prototype.slice;
var isArgs = __webpack_require__(92);

var origKeys = Object.keys;
var keysShim = origKeys ? function keys(o) { return origKeys(o); } : __webpack_require__(93);

var originalKeys = Object.keys;

keysShim.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			var args = Object.keys(arguments);
			return args && args.length === arguments.length;
		}(1, 2));
		if (!keysWorksWithArguments) {
			Object.keys = function keys(object) { // eslint-disable-line func-name-matching
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				}
				return originalKeys(object);
			};
		}
	} else {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;


/***/ }),
/* 92 */
/***/ ((module) => {

"use strict";


var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};


/***/ }),
/* 93 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var keysShim;
if (!Object.keys) {
	// modified from https://github.com/es-shims/es5-shim
	var has = Object.prototype.hasOwnProperty;
	var toStr = Object.prototype.toString;
	var isArgs = __webpack_require__(92); // eslint-disable-line global-require
	var isEnumerable = Object.prototype.propertyIsEnumerable;
	var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
	var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
	var dontEnums = [
		'toString',
		'toLocaleString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'constructor'
	];
	var equalsConstructorPrototype = function (o) {
		var ctor = o.constructor;
		return ctor && ctor.prototype === o;
	};
	var excludedKeys = {
		$applicationCache: true,
		$console: true,
		$external: true,
		$frame: true,
		$frameElement: true,
		$frames: true,
		$innerHeight: true,
		$innerWidth: true,
		$onmozfullscreenchange: true,
		$onmozfullscreenerror: true,
		$outerHeight: true,
		$outerWidth: true,
		$pageXOffset: true,
		$pageYOffset: true,
		$parent: true,
		$scrollLeft: true,
		$scrollTop: true,
		$scrollX: true,
		$scrollY: true,
		$self: true,
		$webkitIndexedDB: true,
		$webkitStorageInfo: true,
		$window: true
	};
	var hasAutomationEqualityBug = (function () {
		/* global window */
		if (typeof window === 'undefined') { return false; }
		for (var k in window) {
			try {
				if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
					try {
						equalsConstructorPrototype(window[k]);
					} catch (e) {
						return true;
					}
				}
			} catch (e) {
				return true;
			}
		}
		return false;
	}());
	var equalsConstructorPrototypeIfNotBuggy = function (o) {
		/* global window */
		if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
			return equalsConstructorPrototype(o);
		}
		try {
			return equalsConstructorPrototype(o);
		} catch (e) {
			return false;
		}
	};

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object';
		var isFunction = toStr.call(object) === '[object Function]';
		var isArguments = isArgs(object);
		var isString = isObject && toStr.call(object) === '[object String]';
		var theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError('Object.keys called on a non-object');
		}

		var skipProto = hasProtoEnumBug && isFunction;
		if (isString && object.length > 0 && !has.call(object, 0)) {
			for (var i = 0; i < object.length; ++i) {
				theKeys.push(String(i));
			}
		}

		if (isArguments && object.length > 0) {
			for (var j = 0; j < object.length; ++j) {
				theKeys.push(String(j));
			}
		} else {
			for (var name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(String(name));
				}
			}
		}

		if (hasDontEnumBug) {
			var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

			for (var k = 0; k < dontEnums.length; ++k) {
				if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
					theKeys.push(dontEnums[k]);
				}
			}
		}
		return theKeys;
	};
}
module.exports = keysShim;


/***/ }),
/* 94 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var GetIntrinsic = __webpack_require__(70);

var $defineProperty = GetIntrinsic('%Object.defineProperty%', true);

var hasPropertyDescriptors = function hasPropertyDescriptors() {
	if ($defineProperty) {
		try {
			$defineProperty({}, 'a', { value: 1 });
			return true;
		} catch (e) {
			// IE 8 has a broken defineProperty
			return false;
		}
	}
	return false;
};

hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
	// node v0.6 has a bug where array lengths can be Set but not Defined
	if (!hasPropertyDescriptors()) {
		return null;
	}
	try {
		return $defineProperty([], 'length', { value: 1 }).length !== 1;
	} catch (e) {
		// In Firefox 4-22, defining length on an array throws an exception.
		return true;
	}
};

module.exports = hasPropertyDescriptors;


/***/ }),
/* 95 */
/***/ ((module) => {

"use strict";


var numberIsNaN = function (value) {
	return value !== value;
};

module.exports = function is(a, b) {
	if (a === 0 && b === 0) {
		return 1 / a === 1 / b;
	}
	if (a === b) {
		return true;
	}
	if (numberIsNaN(a) && numberIsNaN(b)) {
		return true;
	}
	return false;
};



/***/ }),
/* 96 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var implementation = __webpack_require__(95);

module.exports = function getPolyfill() {
	return typeof Object.is === 'function' ? Object.is : implementation;
};


/***/ }),
/* 97 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var getPolyfill = __webpack_require__(96);
var define = __webpack_require__(90);

module.exports = function shimObjectIs() {
	var polyfill = getPolyfill();
	define(Object, { is: polyfill }, {
		is: function testObjectIs() {
			return Object.is !== polyfill;
		}
	});
	return polyfill;
};


/***/ }),
/* 98 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";
// Currently in sync with Node.js lib/internal/util/comparisons.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9


function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var regexFlagsSupported = /a/g.flags !== undefined;

var arrayFromSet = function arrayFromSet(set) {
  var array = [];
  set.forEach(function (value) {
    return array.push(value);
  });
  return array;
};

var arrayFromMap = function arrayFromMap(map) {
  var array = [];
  map.forEach(function (value, key) {
    return array.push([key, value]);
  });
  return array;
};

var objectIs = Object.is ? Object.is : __webpack_require__(89);
var objectGetOwnPropertySymbols = Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols : function () {
  return [];
};
var numberIsNaN = Number.isNaN ? Number.isNaN : __webpack_require__(99);

function uncurryThis(f) {
  return f.call.bind(f);
}

var hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
var propertyIsEnumerable = uncurryThis(Object.prototype.propertyIsEnumerable);
var objectToString = uncurryThis(Object.prototype.toString);

var _require$types = (__webpack_require__(64).types),
    isAnyArrayBuffer = _require$types.isAnyArrayBuffer,
    isArrayBufferView = _require$types.isArrayBufferView,
    isDate = _require$types.isDate,
    isMap = _require$types.isMap,
    isRegExp = _require$types.isRegExp,
    isSet = _require$types.isSet,
    isNativeError = _require$types.isNativeError,
    isBoxedPrimitive = _require$types.isBoxedPrimitive,
    isNumberObject = _require$types.isNumberObject,
    isStringObject = _require$types.isStringObject,
    isBooleanObject = _require$types.isBooleanObject,
    isBigIntObject = _require$types.isBigIntObject,
    isSymbolObject = _require$types.isSymbolObject,
    isFloat32Array = _require$types.isFloat32Array,
    isFloat64Array = _require$types.isFloat64Array;

function isNonIndex(key) {
  if (key.length === 0 || key.length > 10) return true;

  for (var i = 0; i < key.length; i++) {
    var code = key.charCodeAt(i);
    if (code < 48 || code > 57) return true;
  } // The maximum size for an array is 2 ** 32 -1.


  return key.length === 10 && key >= Math.pow(2, 32);
}

function getOwnNonIndexProperties(value) {
  return Object.keys(value).filter(isNonIndex).concat(objectGetOwnPropertySymbols(value).filter(Object.prototype.propertyIsEnumerable.bind(value)));
} // Taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */


function compare(a, b) {
  if (a === b) {
    return 0;
  }

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) {
    return -1;
  }

  if (y < x) {
    return 1;
  }

  return 0;
}

var ONLY_ENUMERABLE = undefined;
var kStrict = true;
var kLoose = false;
var kNoIterator = 0;
var kIsArray = 1;
var kIsSet = 2;
var kIsMap = 3; // Check if they have the same source and flags

function areSimilarRegExps(a, b) {
  return regexFlagsSupported ? a.source === b.source && a.flags === b.flags : RegExp.prototype.toString.call(a) === RegExp.prototype.toString.call(b);
}

function areSimilarFloatArrays(a, b) {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  for (var offset = 0; offset < a.byteLength; offset++) {
    if (a[offset] !== b[offset]) {
      return false;
    }
  }

  return true;
}

function areSimilarTypedArrays(a, b) {
  if (a.byteLength !== b.byteLength) {
    return false;
  }

  return compare(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength)) === 0;
}

function areEqualArrayBuffers(buf1, buf2) {
  return buf1.byteLength === buf2.byteLength && compare(new Uint8Array(buf1), new Uint8Array(buf2)) === 0;
}

function isEqualBoxedPrimitive(val1, val2) {
  if (isNumberObject(val1)) {
    return isNumberObject(val2) && objectIs(Number.prototype.valueOf.call(val1), Number.prototype.valueOf.call(val2));
  }

  if (isStringObject(val1)) {
    return isStringObject(val2) && String.prototype.valueOf.call(val1) === String.prototype.valueOf.call(val2);
  }

  if (isBooleanObject(val1)) {
    return isBooleanObject(val2) && Boolean.prototype.valueOf.call(val1) === Boolean.prototype.valueOf.call(val2);
  }

  if (isBigIntObject(val1)) {
    return isBigIntObject(val2) && BigInt.prototype.valueOf.call(val1) === BigInt.prototype.valueOf.call(val2);
  }

  return isSymbolObject(val2) && Symbol.prototype.valueOf.call(val1) === Symbol.prototype.valueOf.call(val2);
} // Notes: Type tags are historical [[Class]] properties that can be set by
// FunctionTemplate::SetClassName() in C++ or Symbol.toStringTag in JS
// and retrieved using Object.prototype.toString.call(obj) in JS
// See https://tc39.github.io/ecma262/#sec-object.prototype.tostring
// for a list of tags pre-defined in the spec.
// There are some unspecified tags in the wild too (e.g. typed array tags).
// Since tags can be altered, they only serve fast failures
//
// Typed arrays and buffers are checked by comparing the content in their
// underlying ArrayBuffer. This optimization requires that it's
// reasonable to interpret their underlying memory in the same way,
// which is checked by comparing their type tags.
// (e.g. a Uint8Array and a Uint16Array with the same memory content
// could still be different because they will be interpreted differently).
//
// For strict comparison, objects should have
// a) The same built-in type tags
// b) The same prototypes.


function innerDeepEqual(val1, val2, strict, memos) {
  // All identical values are equivalent, as determined by ===.
  if (val1 === val2) {
    if (val1 !== 0) return true;
    return strict ? objectIs(val1, val2) : true;
  } // Check more closely if val1 and val2 are equal.


  if (strict) {
    if (_typeof(val1) !== 'object') {
      return typeof val1 === 'number' && numberIsNaN(val1) && numberIsNaN(val2);
    }

    if (_typeof(val2) !== 'object' || val1 === null || val2 === null) {
      return false;
    }

    if (Object.getPrototypeOf(val1) !== Object.getPrototypeOf(val2)) {
      return false;
    }
  } else {
    if (val1 === null || _typeof(val1) !== 'object') {
      if (val2 === null || _typeof(val2) !== 'object') {
        // eslint-disable-next-line eqeqeq
        return val1 == val2;
      }

      return false;
    }

    if (val2 === null || _typeof(val2) !== 'object') {
      return false;
    }
  }

  var val1Tag = objectToString(val1);
  var val2Tag = objectToString(val2);

  if (val1Tag !== val2Tag) {
    return false;
  }

  if (Array.isArray(val1)) {
    // Check for sparse arrays and general fast path
    if (val1.length !== val2.length) {
      return false;
    }

    var keys1 = getOwnNonIndexProperties(val1, ONLY_ENUMERABLE);
    var keys2 = getOwnNonIndexProperties(val2, ONLY_ENUMERABLE);

    if (keys1.length !== keys2.length) {
      return false;
    }

    return keyCheck(val1, val2, strict, memos, kIsArray, keys1);
  } // [browserify] This triggers on certain types in IE (Map/Set) so we don't
  // wan't to early return out of the rest of the checks. However we can check
  // if the second value is one of these values and the first isn't.


  if (val1Tag === '[object Object]') {
    // return keyCheck(val1, val2, strict, memos, kNoIterator);
    if (!isMap(val1) && isMap(val2) || !isSet(val1) && isSet(val2)) {
      return false;
    }
  }

  if (isDate(val1)) {
    if (!isDate(val2) || Date.prototype.getTime.call(val1) !== Date.prototype.getTime.call(val2)) {
      return false;
    }
  } else if (isRegExp(val1)) {
    if (!isRegExp(val2) || !areSimilarRegExps(val1, val2)) {
      return false;
    }
  } else if (isNativeError(val1) || val1 instanceof Error) {
    // Do not compare the stack as it might differ even though the error itself
    // is otherwise identical.
    if (val1.message !== val2.message || val1.name !== val2.name) {
      return false;
    }
  } else if (isArrayBufferView(val1)) {
    if (!strict && (isFloat32Array(val1) || isFloat64Array(val1))) {
      if (!areSimilarFloatArrays(val1, val2)) {
        return false;
      }
    } else if (!areSimilarTypedArrays(val1, val2)) {
      return false;
    } // Buffer.compare returns true, so val1.length === val2.length. If they both
    // only contain numeric keys, we don't need to exam further than checking
    // the symbols.


    var _keys = getOwnNonIndexProperties(val1, ONLY_ENUMERABLE);

    var _keys2 = getOwnNonIndexProperties(val2, ONLY_ENUMERABLE);

    if (_keys.length !== _keys2.length) {
      return false;
    }

    return keyCheck(val1, val2, strict, memos, kNoIterator, _keys);
  } else if (isSet(val1)) {
    if (!isSet(val2) || val1.size !== val2.size) {
      return false;
    }

    return keyCheck(val1, val2, strict, memos, kIsSet);
  } else if (isMap(val1)) {
    if (!isMap(val2) || val1.size !== val2.size) {
      return false;
    }

    return keyCheck(val1, val2, strict, memos, kIsMap);
  } else if (isAnyArrayBuffer(val1)) {
    if (!areEqualArrayBuffers(val1, val2)) {
      return false;
    }
  } else if (isBoxedPrimitive(val1) && !isEqualBoxedPrimitive(val1, val2)) {
    return false;
  }

  return keyCheck(val1, val2, strict, memos, kNoIterator);
}

function getEnumerables(val, keys) {
  return keys.filter(function (k) {
    return propertyIsEnumerable(val, k);
  });
}

function keyCheck(val1, val2, strict, memos, iterationType, aKeys) {
  // For all remaining Object pairs, including Array, objects and Maps,
  // equivalence is determined by having:
  // a) The same number of owned enumerable properties
  // b) The same set of keys/indexes (although not necessarily the same order)
  // c) Equivalent values for every corresponding key/index
  // d) For Sets and Maps, equal contents
  // Note: this accounts for both named and indexed properties on Arrays.
  if (arguments.length === 5) {
    aKeys = Object.keys(val1);
    var bKeys = Object.keys(val2); // The pair must have the same number of owned properties.

    if (aKeys.length !== bKeys.length) {
      return false;
    }
  } // Cheap key test


  var i = 0;

  for (; i < aKeys.length; i++) {
    if (!hasOwnProperty(val2, aKeys[i])) {
      return false;
    }
  }

  if (strict && arguments.length === 5) {
    var symbolKeysA = objectGetOwnPropertySymbols(val1);

    if (symbolKeysA.length !== 0) {
      var count = 0;

      for (i = 0; i < symbolKeysA.length; i++) {
        var key = symbolKeysA[i];

        if (propertyIsEnumerable(val1, key)) {
          if (!propertyIsEnumerable(val2, key)) {
            return false;
          }

          aKeys.push(key);
          count++;
        } else if (propertyIsEnumerable(val2, key)) {
          return false;
        }
      }

      var symbolKeysB = objectGetOwnPropertySymbols(val2);

      if (symbolKeysA.length !== symbolKeysB.length && getEnumerables(val2, symbolKeysB).length !== count) {
        return false;
      }
    } else {
      var _symbolKeysB = objectGetOwnPropertySymbols(val2);

      if (_symbolKeysB.length !== 0 && getEnumerables(val2, _symbolKeysB).length !== 0) {
        return false;
      }
    }
  }

  if (aKeys.length === 0 && (iterationType === kNoIterator || iterationType === kIsArray && val1.length === 0 || val1.size === 0)) {
    return true;
  } // Use memos to handle cycles.


  if (memos === undefined) {
    memos = {
      val1: new Map(),
      val2: new Map(),
      position: 0
    };
  } else {
    // We prevent up to two map.has(x) calls by directly retrieving the value
    // and checking for undefined. The map can only contain numbers, so it is
    // safe to check for undefined only.
    var val2MemoA = memos.val1.get(val1);

    if (val2MemoA !== undefined) {
      var val2MemoB = memos.val2.get(val2);

      if (val2MemoB !== undefined) {
        return val2MemoA === val2MemoB;
      }
    }

    memos.position++;
  }

  memos.val1.set(val1, memos.position);
  memos.val2.set(val2, memos.position);
  var areEq = objEquiv(val1, val2, strict, aKeys, memos, iterationType);
  memos.val1.delete(val1);
  memos.val2.delete(val2);
  return areEq;
}

function setHasEqualElement(set, val1, strict, memo) {
  // Go looking.
  var setValues = arrayFromSet(set);

  for (var i = 0; i < setValues.length; i++) {
    var val2 = setValues[i];

    if (innerDeepEqual(val1, val2, strict, memo)) {
      // Remove the matching element to make sure we do not check that again.
      set.delete(val2);
      return true;
    }
  }

  return false;
} // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Loose_equality_using
// Sadly it is not possible to detect corresponding values properly in case the
// type is a string, number, bigint or boolean. The reason is that those values
// can match lots of different string values (e.g., 1n == '+00001').


function findLooseMatchingPrimitives(prim) {
  switch (_typeof(prim)) {
    case 'undefined':
      return null;

    case 'object':
      // Only pass in null as object!
      return undefined;

    case 'symbol':
      return false;

    case 'string':
      prim = +prim;
    // Loose equal entries exist only if the string is possible to convert to
    // a regular number and not NaN.
    // Fall through

    case 'number':
      if (numberIsNaN(prim)) {
        return false;
      }

  }

  return true;
}

function setMightHaveLoosePrim(a, b, prim) {
  var altValue = findLooseMatchingPrimitives(prim);
  if (altValue != null) return altValue;
  return b.has(altValue) && !a.has(altValue);
}

function mapMightHaveLoosePrim(a, b, prim, item, memo) {
  var altValue = findLooseMatchingPrimitives(prim);

  if (altValue != null) {
    return altValue;
  }

  var curB = b.get(altValue);

  if (curB === undefined && !b.has(altValue) || !innerDeepEqual(item, curB, false, memo)) {
    return false;
  }

  return !a.has(altValue) && innerDeepEqual(item, curB, false, memo);
}

function setEquiv(a, b, strict, memo) {
  // This is a lazily initiated Set of entries which have to be compared
  // pairwise.
  var set = null;
  var aValues = arrayFromSet(a);

  for (var i = 0; i < aValues.length; i++) {
    var val = aValues[i]; // Note: Checking for the objects first improves the performance for object
    // heavy sets but it is a minor slow down for primitives. As they are fast
    // to check this improves the worst case scenario instead.

    if (_typeof(val) === 'object' && val !== null) {
      if (set === null) {
        set = new Set();
      } // If the specified value doesn't exist in the second set its an not null
      // object (or non strict only: a not matching primitive) we'll need to go
      // hunting for something thats deep-(strict-)equal to it. To make this
      // O(n log n) complexity we have to copy these values in a new set first.


      set.add(val);
    } else if (!b.has(val)) {
      if (strict) return false; // Fast path to detect missing string, symbol, undefined and null values.

      if (!setMightHaveLoosePrim(a, b, val)) {
        return false;
      }

      if (set === null) {
        set = new Set();
      }

      set.add(val);
    }
  }

  if (set !== null) {
    var bValues = arrayFromSet(b);

    for (var _i = 0; _i < bValues.length; _i++) {
      var _val = bValues[_i]; // We have to check if a primitive value is already
      // matching and only if it's not, go hunting for it.

      if (_typeof(_val) === 'object' && _val !== null) {
        if (!setHasEqualElement(set, _val, strict, memo)) return false;
      } else if (!strict && !a.has(_val) && !setHasEqualElement(set, _val, strict, memo)) {
        return false;
      }
    }

    return set.size === 0;
  }

  return true;
}

function mapHasEqualEntry(set, map, key1, item1, strict, memo) {
  // To be able to handle cases like:
  //   Map([[{}, 'a'], [{}, 'b']]) vs Map([[{}, 'b'], [{}, 'a']])
  // ... we need to consider *all* matching keys, not just the first we find.
  var setValues = arrayFromSet(set);

  for (var i = 0; i < setValues.length; i++) {
    var key2 = setValues[i];

    if (innerDeepEqual(key1, key2, strict, memo) && innerDeepEqual(item1, map.get(key2), strict, memo)) {
      set.delete(key2);
      return true;
    }
  }

  return false;
}

function mapEquiv(a, b, strict, memo) {
  var set = null;
  var aEntries = arrayFromMap(a);

  for (var i = 0; i < aEntries.length; i++) {
    var _aEntries$i = _slicedToArray(aEntries[i], 2),
        key = _aEntries$i[0],
        item1 = _aEntries$i[1];

    if (_typeof(key) === 'object' && key !== null) {
      if (set === null) {
        set = new Set();
      }

      set.add(key);
    } else {
      // By directly retrieving the value we prevent another b.has(key) check in
      // almost all possible cases.
      var item2 = b.get(key);

      if (item2 === undefined && !b.has(key) || !innerDeepEqual(item1, item2, strict, memo)) {
        if (strict) return false; // Fast path to detect missing string, symbol, undefined and null
        // keys.

        if (!mapMightHaveLoosePrim(a, b, key, item1, memo)) return false;

        if (set === null) {
          set = new Set();
        }

        set.add(key);
      }
    }
  }

  if (set !== null) {
    var bEntries = arrayFromMap(b);

    for (var _i2 = 0; _i2 < bEntries.length; _i2++) {
      var _bEntries$_i = _slicedToArray(bEntries[_i2], 2),
          key = _bEntries$_i[0],
          item = _bEntries$_i[1];

      if (_typeof(key) === 'object' && key !== null) {
        if (!mapHasEqualEntry(set, a, key, item, strict, memo)) return false;
      } else if (!strict && (!a.has(key) || !innerDeepEqual(a.get(key), item, false, memo)) && !mapHasEqualEntry(set, a, key, item, false, memo)) {
        return false;
      }
    }

    return set.size === 0;
  }

  return true;
}

function objEquiv(a, b, strict, keys, memos, iterationType) {
  // Sets and maps don't have their entries accessible via normal object
  // properties.
  var i = 0;

  if (iterationType === kIsSet) {
    if (!setEquiv(a, b, strict, memos)) {
      return false;
    }
  } else if (iterationType === kIsMap) {
    if (!mapEquiv(a, b, strict, memos)) {
      return false;
    }
  } else if (iterationType === kIsArray) {
    for (; i < a.length; i++) {
      if (hasOwnProperty(a, i)) {
        if (!hasOwnProperty(b, i) || !innerDeepEqual(a[i], b[i], strict, memos)) {
          return false;
        }
      } else if (hasOwnProperty(b, i)) {
        return false;
      } else {
        // Array is sparse.
        var keysA = Object.keys(a);

        for (; i < keysA.length; i++) {
          var key = keysA[i];

          if (!hasOwnProperty(b, key) || !innerDeepEqual(a[key], b[key], strict, memos)) {
            return false;
          }
        }

        if (keysA.length !== Object.keys(b).length) {
          return false;
        }

        return true;
      }
    }
  } // The pair must have equivalent values for every corresponding key.
  // Possibly expensive deep test:


  for (i = 0; i < keys.length; i++) {
    var _key = keys[i];

    if (!innerDeepEqual(a[_key], b[_key], strict, memos)) {
      return false;
    }
  }

  return true;
}

function isDeepEqual(val1, val2) {
  return innerDeepEqual(val1, val2, kLoose);
}

function isDeepStrictEqual(val1, val2) {
  return innerDeepEqual(val1, val2, kStrict);
}

module.exports = {
  isDeepEqual: isDeepEqual,
  isDeepStrictEqual: isDeepStrictEqual
};

/***/ }),
/* 99 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var callBind = __webpack_require__(75);
var define = __webpack_require__(90);

var implementation = __webpack_require__(100);
var getPolyfill = __webpack_require__(101);
var shim = __webpack_require__(102);

var polyfill = callBind(getPolyfill(), Number);

/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

define(polyfill, {
	getPolyfill: getPolyfill,
	implementation: implementation,
	shim: shim
});

module.exports = polyfill;


/***/ }),
/* 100 */
/***/ ((module) => {

"use strict";


/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

module.exports = function isNaN(value) {
	return value !== value;
};


/***/ }),
/* 101 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var implementation = __webpack_require__(100);

module.exports = function getPolyfill() {
	if (Number.isNaN && Number.isNaN(NaN) && !Number.isNaN('a')) {
		return Number.isNaN;
	}
	return implementation;
};


/***/ }),
/* 102 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var define = __webpack_require__(90);
var getPolyfill = __webpack_require__(101);

/* http://www.ecma-international.org/ecma-262/6.0/#sec-number.isnan */

module.exports = function shimNumberIsNaN() {
	var polyfill = getPolyfill();
	define(Number, { isNaN: polyfill }, {
		isNaN: function testIsNaN() {
			return Number.isNaN !== polyfill;
		}
	});
	return polyfill;
};


/***/ }),
/* 103 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var Cancel = __webpack_require__(58);

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;

  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;

  // eslint-disable-next-line func-names
  this.promise.then(function(cancel) {
    if (!token._listeners) return;

    var i;
    var l = token._listeners.length;

    for (i = 0; i < l; i++) {
      token._listeners[i](cancel);
    }
    token._listeners = null;
  });

  // eslint-disable-next-line func-names
  this.promise.then = function(onfulfilled) {
    var _resolve;
    // eslint-disable-next-line func-names
    var promise = new Promise(function(resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);

    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };

    return promise;
  };

  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Subscribe to the cancel signal
 */

CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }

  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};

/**
 * Unsubscribe from the cancel signal
 */

CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;


/***/ }),
/* 104 */
/***/ ((module) => {

"use strict";


/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};


/***/ }),
/* 105 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var utils = __webpack_require__(38);

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
module.exports = function isAxiosError(payload) {
  return utils.isObject(payload) && (payload.isAxiosError === true);
};


/***/ }),
/* 106 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
const ExperimentationServiceBase_1 = __webpack_require__(107);
const PollingService_1 = __webpack_require__(109);
/**
 * Implementation of Feature provider that provides a polling feature, where the source can be re-fetched every x time given.
 */
class ExperimentationServiceAutoPolling extends ExperimentationServiceBase_1.ExperimentationServiceBase {
    constructor(telemetry, filterProviders, refreshRateMs, assignmentContextTelemetryPropertyName, telemetryEventName, storageKey, storage) {
        super(telemetry, assignmentContextTelemetryPropertyName, telemetryEventName, storageKey, storage);
        this.telemetry = telemetry;
        this.filterProviders = filterProviders;
        this.refreshRateMs = refreshRateMs;
        this.assignmentContextTelemetryPropertyName = assignmentContextTelemetryPropertyName;
        this.telemetryEventName = telemetryEventName;
        this.storageKey = storageKey;
        this.storage = storage;
        // Excluding 0 since it allows to turn off the auto polling.
        if (refreshRateMs < 1000 && refreshRateMs !== 0) {
            throw new Error('The minimum refresh rate for polling is 1000 ms (1 second). If you wish to deactivate this auto-polling use value of 0.');
        }
        if (refreshRateMs > 0) {
            this.pollingService = new PollingService_1.PollingService(refreshRateMs);
            this.pollingService.OnPollTick(async () => {
                await super.getFeaturesAsync();
            });
        }
    }
    init() {
        if (this.pollingService) {
            this.pollingService.StartPolling(true);
        }
        else {
            super.getFeaturesAsync();
        }
    }
    /**
     * Wrapper that will reset the polling intervals whenever the feature data is fetched manually.
     */
    async getFeaturesAsync(overrideInMemoryFeatures = false) {
        if (!this.pollingService) {
            return await super.getFeaturesAsync(overrideInMemoryFeatures);
        }
        else {
            this.pollingService.StopPolling();
            let result = await super.getFeaturesAsync(overrideInMemoryFeatures);
            this.pollingService.StartPolling();
            return result;
        }
    }
}
exports.ExperimentationServiceAutoPolling = ExperimentationServiceAutoPolling;
//# sourceMappingURL=ExperimentationServiceAutoPolling.js.map

/***/ }),
/* 107 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
const MemoryKeyValueStorage_1 = __webpack_require__(108);
/**
 * Experimentation service to provide functionality of A/B experiments:
 * - reading flights;
 * - caching current set of flights;
 * - get answer on if flights are enabled.
 */
class ExperimentationServiceBase {
    constructor(telemetry, assignmentContextTelemetryPropertyName, telemetryEventName, storageKey, storage) {
        this.telemetry = telemetry;
        this.assignmentContextTelemetryPropertyName = assignmentContextTelemetryPropertyName;
        this.telemetryEventName = telemetryEventName;
        this.storageKey = storageKey;
        this.storage = storage;
        this.featuresConsumed = false;
        this.cachedTelemetryEvents = [];
        this._features = {
            features: [],
            assignmentContext: '',
            configs: []
        };
        if (!this.storageKey) {
            this.storageKey = 'ABExp.Features';
        }
        if (!this.storage) {
            storage = new MemoryKeyValueStorage_1.MemoryKeyValueStorage();
        }
        this.loadCachePromise = this.loadCachedFeatureData();
        this.initializePromise = this.loadCachePromise;
        this.initialFetch = new Promise((resolve, reject) => {
            this.resolveInitialFetchPromise = resolve;
        });
    }
    get features() {
        return this._features;
    }
    set features(value) {
        this._features = value;
        /**
         * If an implementation of telemetry exists, we set the shared property.
         */
        if (this.telemetry) {
            this.telemetry.setSharedProperty(this.assignmentContextTelemetryPropertyName, this.features.assignmentContext);
        }
    }
    /**
     * Gets all the features from the provider sources (not cache).
     * It returns these features and will also update the providers to have the latest features cached.
     */
    async getFeaturesAsync(overrideInMemoryFeatures = false) {
        /**
         * If there's already a fetching promise, there's no need to call it again.
         * We return that as result.
         */
        if (this.fetchPromise != null) {
            try {
                await this.fetchPromise;
            }
            catch (_a) {
                // Fetching features threw. Can happen if not connected to the internet, e.g
            }
            return this.features;
        }
        if (!this.featureProviders || this.featureProviders.length === 0) {
            return Promise.resolve({
                features: [],
                assignmentContext: '',
                configs: []
            });
        }
        /**
         * Fetch all from providers.
         */
        this.fetchPromise = Promise.all(this.featureProviders.map(async (provider) => {
            return await provider.getFeatures();
        }));
        try {
            const featureResults = await this.fetchPromise;
            this.updateFeatures(featureResults, overrideInMemoryFeatures);
        }
        catch (_b) {
            // Fetching features threw. Can happen if not connected to the internet, e.g.
        }
        this.fetchPromise = undefined;
        if (this.resolveInitialFetchPromise) {
            this.resolveInitialFetchPromise();
            this.resolveInitialFetchPromise = undefined;
        }
        /**
         * At this point all features have been re-fetched and cache has been updated.
         * We return the cached features.
         */
        return this.features;
    }
    /**
     *
     * @param featureResults The feature results obtained from all the feature providers.
     */
    updateFeatures(featureResults, overrideInMemoryFeatures = false) {
        /**
         * if features comes as a null value, that is taken as if there aren't any features active,
         * so an empty array is defaulted.
         */
        let features = {
            features: [],
            assignmentContext: '',
            configs: []
        };
        for (let result of featureResults) {
            for (let feature of result.features) {
                if (!features.features.includes(feature)) {
                    features.features.push(feature);
                }
            }
            for (let config of result.configs) {
                const existingConfig = features.configs.find(c => c.Id === config.Id);
                if (existingConfig) {
                    existingConfig.Parameters = Object.assign(Object.assign({}, existingConfig.Parameters), config.Parameters);
                }
                else {
                    features.configs.push(config);
                }
            }
            features.assignmentContext += result.assignmentContext;
        }
        /**
         * Set the obtained feature values to the global features variable. This stores them in memory.
         */
        if (overrideInMemoryFeatures || !this.featuresConsumed) {
            this.features = features;
        }
        /**
         * If we have storage, we cache the latest results into the storage.
         */
        if (this.storage) {
            this.storage.setValue(this.storageKey, features);
        }
    }
    async loadCachedFeatureData() {
        let cachedFeatureData;
        if (this.storage) {
            cachedFeatureData = await this.storage.getValue(this.storageKey);
            // When updating from an older version of tas-client, configs may be undefined 
            if (cachedFeatureData !== undefined && cachedFeatureData.configs === undefined) {
                cachedFeatureData.configs = [];
            }
        }
        if (this.features.features.length === 0) {
            this.features = cachedFeatureData || { features: [], assignmentContext: '', configs: [] };
        }
    }
    /**
     * Returns a value indicating whether the given flight is enabled.
     * It uses the in-memory cache.
     * @param flight The flight to check.
     */
    isFlightEnabled(flight) {
        this.featuresConsumed = true;
        this.PostEventToTelemetry(flight);
        return this.features.features.includes(flight);
    }
    /**
     * Returns a value indicating whether the given flight is enabled.
     * It uses the values currently on cache.
     * @param flight The flight to check.
     */
    async isCachedFlightEnabled(flight) {
        await this.loadCachePromise;
        this.featuresConsumed = true;
        this.PostEventToTelemetry(flight);
        return this.features.features.includes(flight);
    }
    /**
     * Returns a value indicating whether the given flight is enabled.
     * It re-fetches values from the server.
     * @param flight the flight to check.
     */
    async isFlightEnabledAsync(flight) {
        const features = await this.getFeaturesAsync(true);
        this.featuresConsumed = true;
        this.PostEventToTelemetry(flight);
        return features.features.includes(flight);
    }
    /**
     * Returns the value of the treatment variable, or undefined if not found.
     * It uses the values currently in memory, so the experimentation service
     * must be initialized before calling.
     * @param config name of the config to check.
     * @param name name of the treatment variable.
     */
    getTreatmentVariable(configId, name) {
        var _a;
        this.featuresConsumed = true;
        this.PostEventToTelemetry(`${configId}.${name}`);
        const config = this.features.configs.find(c => c.Id === configId);
        return (_a = config) === null || _a === void 0 ? void 0 : _a.Parameters[name];
    }
    /**
     * Returns the value of the treatment variable, or undefined if not found.
     * It re-fetches values from the server. If checkCache is set to true and the value exists
     * in the cache, the Treatment Assignment Service is not called.
     * @param config name of the config to check.
     * @param name name of the treatment variable.
     * @param checkCache check the cache for the variable before calling the TAS.
     */
    async getTreatmentVariableAsync(configId, name, checkCache) {
        if (checkCache) {
            const _featuresConsumed = this.featuresConsumed;
            const cachedValue = this.getTreatmentVariable(configId, name);
            if (cachedValue === undefined) {
                this.featuresConsumed = _featuresConsumed;
            }
            else {
                return cachedValue;
            }
        }
        await this.getFeaturesAsync(true);
        return this.getTreatmentVariable(configId, name);
    }
    PostEventToTelemetry(flight) {
        /**
         * If this event has already been posted, we omit from posting it again.
         */
        if (this.cachedTelemetryEvents.includes(flight)) {
            return;
        }
        this.telemetry.postEvent(this.telemetryEventName, new Map([['ABExp.queriedFeature', flight]]));
        /**
         * We cache the flight so we don't post it again.
         */
        this.cachedTelemetryEvents.push(flight);
    }
    invokeInit() {
        this.init();
    }
    addFeatureProvider(...providers) {
        if (providers == null || this.featureProviders == null) {
            return;
        }
        for (let provider of providers) {
            this.featureProviders.push(provider);
        }
    }
}
exports.ExperimentationServiceBase = ExperimentationServiceBase;
//# sourceMappingURL=ExperimentationServiceBase.js.map

/***/ }),
/* 108 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
class MemoryKeyValueStorage {
    constructor() {
        this.storage = new Map();
    }
    async getValue(key, defaultValue) {
        if (this.storage.has(key)) {
            return await Promise.resolve(this.storage.get(key));
        }
        return await Promise.resolve(defaultValue || undefined);
    }
    setValue(key, value) {
        this.storage.set(key, value);
    }
}
exports.MemoryKeyValueStorage = MemoryKeyValueStorage;
//# sourceMappingURL=MemoryKeyValueStorage.js.map

/***/ }),
/* 109 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
class PollingService {
    constructor(fetchInterval) {
        this.fetchInterval = fetchInterval;
    }
    StopPolling() {
        clearInterval(this.intervalHandle);
        this.intervalHandle = undefined;
    }
    OnPollTick(callback) {
        this.onTick = callback;
    }
    StartPolling(pollImmediately = false) {
        if (this.intervalHandle) {
            this.StopPolling();
        }
        // If there's no callback, there's no point to start polling.
        if (this.onTick == null) {
            return;
        }
        if (pollImmediately) {
            this.onTick().then(() => { return; }).catch(() => { return; });
        }
        /**
         * Set the interval to start running.
         */
        this.intervalHandle = setInterval(async () => {
            await this.onTick();
        }, this.fetchInterval);
        if (this.intervalHandle.unref) { // unref is only available in Node, not the web
            this.intervalHandle.unref(); // unref is used to avoid keeping node.js alive only because of these timeouts.
        }
    }
}
exports.PollingService = PollingService;
//# sourceMappingURL=PollingService.js.map

/***/ }),
/* 110 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
class MementoKeyValueStorage {
    constructor(mementoGlobalStorage) {
        this.mementoGlobalStorage = mementoGlobalStorage;
    }
    async getValue(key, defaultValue) {
        const value = await this.mementoGlobalStorage.get(key);
        return value || defaultValue;
    }
    setValue(key, value) {
        this.mementoGlobalStorage.update(key, value);
    }
}
exports.MementoKeyValueStorage = MementoKeyValueStorage;
//# sourceMappingURL=MementoKeyValueStorage.js.map

/***/ }),
/* 111 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", ({ value: true }));
class TelemetryDisabledExperimentationService {
    constructor() {
        this.initializePromise = Promise.resolve();
        this.initialFetch = Promise.resolve();
    }
    isFlightEnabled(flight) {
        return false;
    }
    isCachedFlightEnabled(flight) {
        return Promise.resolve(false);
    }
    isFlightEnabledAsync(flight) {
        return Promise.resolve(false);
    }
    getTreatmentVariable(configId, name) {
        return undefined;
    }
    getTreatmentVariableAsync(configId, name) {
        return Promise.resolve(undefined);
    }
}
exports["default"] = TelemetryDisabledExperimentationService;
//# sourceMappingURL=TelemetryDisabledExperimentationService.js.map

/***/ }),
/* 112 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ xc)
/* harmony export */ });
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var vscode__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(vscode__WEBPACK_IMPORTED_MODULE_0__);
/* provided dependency */ var console = __webpack_require__(63);
var xo=Object.defineProperty;var vo=Object.getOwnPropertySymbols;var Sc=Object.prototype.hasOwnProperty,Ic=Object.prototype.propertyIsEnumerable;var ho=(t,e,r)=>e in t?xo(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r,Xe=(t,e)=>{for(var r in e||(e={}))Sc.call(e,r)&&ho(t,r,e[r]);if(vo)for(var r of vo(e))Ic.call(e,r)&&ho(t,r,e[r]);return t};var I=(t,e)=>()=>(t&&(e=t(t=0)),e);var Cc=(t,e)=>{for(var r in e)xo(t,r,{get:e[r],enumerable:!0})};var Vr=(t,e,r)=>new Promise((n,i)=>{var a=s=>{try{u(r.next(s))}catch(c){i(c)}},o=s=>{try{u(r.throw(s))}catch(c){i(c)}},u=s=>s.done?n(s.value):Promise.resolve(s.value).then(a,o);u((r=r.apply(t,e)).next())});var So,Io=I(()=>{So={Unknown:0,NonRetryableStatus:1,InvalidEvent:2,SizeLimitExceeded:3,KillSwitch:4,QueueFull:5}});var mt,Je,Oe,Ce,qr,gt,Cr,Tr,Un,On,nr,zn=I(()=>{mt="function",Je="object",Oe="undefined",Ce="prototype",qr="hasOwnProperty",gt=Object,Cr=gt[Ce],Tr=gt.assign,Un=gt.create,On=gt.defineProperty,nr=Cr[qr]});function ot(){return typeof globalThis!==Oe&&globalThis?globalThis:typeof self!==Oe&&self?self:typeof window!==Oe&&window?window:typeof global!==Oe&&global?global:null}function Er(t){throw new TypeError(t)}function Dt(t){var e=Un;if(e)return e(t);if(t==null)return{};var r=typeof t;r!==Je&&r!==mt&&Er("Object prototype may only be an Object:"+t);function n(){}return n[Ce]=t,new n}var ki=I(()=>{zn()});function z(t,e){typeof e!==mt&&e!==null&&Er("Class extends value "+String(e)+" is not a constructor or null"),Fi(t,e);function r(){this.constructor=t}t[Ce]=e===null?Dt(e):(r[Ce]=e[Ce],new r)}var zl,Bl,Ec,yt,Fi,Co=I(()=>{zn();ki();zl=(ot()||{}).Symbol,Bl=(ot()||{}).Reflect,Ec=function(t){for(var e,r=1,n=arguments.length;r<n;r++){e=arguments[r];for(var i in e)Cr[qr].call(e,i)&&(t[i]=e[i])}return t},yt=Tr||Ec,Fi=function(t,e){return Fi=gt.setPrototypeOf||{__proto__:[]}instanceof Array&&function(r,n){r.__proto__=n}||function(r,n){for(var i in n)n[qr](i)&&(r[i]=n[i])},Fi(t,e)}});var To=I(()=>{});var ne=I(()=>{zn();ki();Co();To()});function Ht(t,e){return t&&Gn[Nt].hasOwnProperty.call(t,e)}function Ao(t){return t&&(t===Gn[Nt]||t===Array[Nt])}function Ui(t){return Ao(t)||t===Function[Nt]}function ir(t){if(t){if(Gr)return Gr(t);var e=t[bc]||t[Nt]||(t[Bn]?t[Bn][Nt]:null);if(e)return e}return null}function qn(t,e){var r=[],n=Gn.getOwnPropertyNames;if(n)r=n(t);else for(var i in t)typeof i=="string"&&Ht(t,i)&&r.push(i);if(r&&r.length>0)for(var a=0;a<r.length;a++)e(r[a])}function Oi(t,e,r){return e!==Bn&&typeof t[e]===Hn&&(r||Ht(t,e))}function jn(t){throw new TypeError("DynamicProto: "+t)}function Pc(t){var e={};return qn(t,function(r){!e[r]&&Oi(t,r,!1)&&(e[r]=t[r])}),e}function zi(t,e){for(var r=t.length-1;r>=0;r--)if(t[r]===e)return!0;return!1}function Ac(t,e,r,n){function i(s,c,l){var f=c[l];if(f[Li]&&n){var m=s[Vn]||{};m[jr]!==!1&&(f=(m[c[wr]]||{})[l]||f)}return function(){return f.apply(s,arguments)}}var a={};qn(r,function(s){a[s]=i(e,r,s)});for(var o=ir(t),u=[];o&&!Ui(o)&&!zi(u,o);)qn(o,function(s){!a[s]&&Oi(o,s,!Gr)&&(a[s]=i(e,o,s))}),u.push(o),o=ir(o);return a}function Dc(t,e,r,n){var i=null;if(t&&Ht(r,wr)){var a=t[Vn]||{};if(i=(a[r[wr]]||{})[e],i||jn("Missing ["+e+"] "+Hn),!i[_i]&&a[jr]!==!1){for(var o=!Ht(t,e),u=ir(t),s=[];o&&u&&!Ui(u)&&!zi(s,u);){var c=u[e];if(c){o=c===n;break}s.push(u),u=ir(u)}try{o&&(t[e]=i),i[_i]=1}catch(l){a[jr]=!1}}}return i}function Nc(t,e,r){var n=e[t];return n===r&&(n=ir(e)[t]),typeof n!==Hn&&jn("["+t+"] is not a "+Hn),n}function kc(t,e,r,n,i){function a(s,c){var l=function(){var f=Dc(this,c,s,l)||Nc(c,s,l);return f.apply(this,arguments)};return l[Li]=1,l}if(!Ao(t)){var o=r[Vn]=r[Vn]||{},u=o[e]=o[e]||{};o[jr]!==!1&&(o[jr]=!!i),qn(r,function(s){Oi(r,s,!1)&&r[s]!==n[s]&&(u[s]=r[s],delete r[s],(!Ht(t,s)||t[s]&&!t[s][Li])&&(t[s]=a(t,s)))})}}function Fc(t,e){if(Gr)for(var r=[],n=ir(e);n&&!Ui(n)&&!zi(r,n);){if(n===t)return!0;r.push(n),n=ir(n)}return!1}function Mi(t,e){return Ht(t,Nt)?t.name||e||Eo:((t||{})[Bn]||{}).name||e||Eo}function Bi(t,e,r,n){Ht(t,Nt)||jn("theClass is an invalid class definition.");var i=t[Nt];Fc(i,e)||jn("["+Mi(t)+"] is not in class hierarchy of ["+Mi(e)+"]");var a=null;Ht(i,wr)?a=i[wr]:(a=wc+Mi(t,"_")+"$"+bo,bo++,i[wr]=a);var o=Bi[Po],u=!!o[Ri];u&&n&&n[Ri]!==void 0&&(u=!!n[Ri]);var s=Pc(e),c=Ac(i,e,s,u);r(e,c);var l=!!Gr&&!!o[wo];l&&n&&(l=!!n[wo]),kc(i,a,e,s,l!==!1)}var Bn,Nt,Hn,Vn,Li,wr,wc,_i,jr,Po,Eo,bc,Ri,wo,Gn,Gr,bo,Rc,W,Te=I(()=>{Bn="constructor",Nt="prototype",Hn="function",Vn="_dynInstFuncs",Li="_isDynProxy",wr="_dynClass",wc="_dynCls$",_i="_dynInstChk",jr=_i,Po="_dfOpts",Eo="_unknown_",bc="__proto__",Ri="useBaseInst",wo="setInstFuncs",Gn=Object,Gr=Gn.getPrototypeOf,bo=0;Rc={setInstFuncs:!0,useBaseInst:!0};Bi[Po]=Rc;W=Bi});var S,h,Kr=I(()=>{(function(t){t[t.CRITICAL=1]="CRITICAL",t[t.WARNING=2]="WARNING"})(S||(S={}));h={BrowserDoesNotSupportLocalStorage:0,BrowserCannotReadLocalStorage:1,BrowserCannotReadSessionStorage:2,BrowserCannotWriteLocalStorage:3,BrowserCannotWriteSessionStorage:4,BrowserFailedRemovalFromLocalStorage:5,BrowserFailedRemovalFromSessionStorage:6,CannotSendEmptyTelemetry:7,ClientPerformanceMathError:8,ErrorParsingAISessionCookie:9,ErrorPVCalc:10,ExceptionWhileLoggingError:11,FailedAddingTelemetryToBuffer:12,FailedMonitorAjaxAbort:13,FailedMonitorAjaxDur:14,FailedMonitorAjaxOpen:15,FailedMonitorAjaxRSC:16,FailedMonitorAjaxSend:17,FailedMonitorAjaxGetCorrelationHeader:18,FailedToAddHandlerForOnBeforeUnload:19,FailedToSendQueuedTelemetry:20,FailedToReportDataLoss:21,FlushFailed:22,MessageLimitPerPVExceeded:23,MissingRequiredFieldSpecification:24,NavigationTimingNotSupported:25,OnError:26,SessionRenewalDateIsZero:27,SenderNotInitialized:28,StartTrackEventFailed:29,StopTrackEventFailed:30,StartTrackFailed:31,StopTrackFailed:32,TelemetrySampledAndNotSent:33,TrackEventFailed:34,TrackExceptionFailed:35,TrackMetricFailed:36,TrackPVFailed:37,TrackPVFailedCalc:38,TrackTraceFailed:39,TransmissionFailed:40,FailedToSetStorageBuffer:41,FailedToRestoreStorageBuffer:42,InvalidBackendResponse:43,FailedToFixDepricatedValues:44,InvalidDurationValue:45,TelemetryEnvelopeInvalid:46,CreateEnvelopeError:47,CannotSerializeObject:48,CannotSerializeObjectNonSerializable:49,CircularReferenceDetected:50,ClearAuthContextFailed:51,ExceptionTruncated:52,IllegalCharsInName:53,ItemNotInArray:54,MaxAjaxPerPVExceeded:55,MessageTruncated:56,NameTooLong:57,SampleRateOutOfRange:58,SetAuthContextFailed:59,SetAuthContextFailedAccountName:60,StringValueTooLong:61,StartCalledMoreThanOnce:62,StopCalledWithoutStart:63,TelemetryInitializerFailed:64,TrackArgumentsNotSpecified:65,UrlTooLong:66,SessionStorageBufferFull:67,CannotAccessCookie:68,IdTooLong:69,InvalidEvent:70,FailedMonitorAjaxSetRequestHeader:71,SendBrowserInfoOnUserInit:72,PluginException:73,NotificationException:74,SnippetScriptLoadFailure:99,InvalidInstrumentationKey:100,CannotParseAiBlobValue:101,InvalidContentBlob:102,TrackPageActionEventFailed:103}});function Vi(t){return Cr.toString.call(t)}function qi(t,e){return typeof t===e}function pe(t){return t===void 0||typeof t===Oe}function x(t){return t===null||pe(t)}function ji(t){return!x(t)}function br(t,e){return t&&nr.call(t,e)}function st(t){return typeof t===Je}function B(t){return typeof t===mt}function Vt(t,e,r,n){n===void 0&&(n=!1);var i=!1;if(!x(t))try{x(t[No])?x(t[Do])||(t[Do](Mo+e,r),i=!0):(t[No](e,r,n),i=!0)}catch(a){}return i}function Kn(t,e,r,n){if(n===void 0&&(n=!1),!x(t))try{x(t[Fo])?x(t[ko])||t[ko](Mo+e,r):t[Fo](e,r,n)}catch(i){}}function Gi(t){var e=t,r=/([^\w\d_$])/g;return r.test(t)&&(e=t.replace(r,"_")),e}function Y(t,e){if(t)for(var r in t)nr.call(t,r)&&e.call(t,r,t[r])}function Ki(t,e){if(t&&e){var r=e.length,n=t.length;if(t===e)return!0;if(n>=r){for(var i=n-1,a=r-1;a>=0;a--){if(t[i]!=e[a])return!1;i--}return!0}}return!1}function Ee(t,e){return t&&e?t.indexOf(e)!==-1:!1}function Pr(t){return Vi(t)==="[object Date]"}function Re(t){return Vi(t)==="[object Array]"}function qt(t){return Vi(t)==="[object Error]"}function U(t){return typeof t=="string"}function ar(t){return typeof t=="number"}function Wr(t){return typeof t=="boolean"}function Me(t){if(Pr(t)){var e=function(r){var n=String(r);return n.length===1&&(n="0"+n),n};return t.getUTCFullYear()+"-"+e(t.getUTCMonth()+1)+"-"+e(t.getUTCDate())+"T"+e(t.getUTCHours())+":"+e(t.getUTCMinutes())+":"+e(t.getUTCSeconds())+"."+String((t.getUTCMilliseconds()/1e3).toFixed(3)).slice(2,5)+"Z"}}function R(t,e,r){for(var n=t.length,i=0;i<n&&!(i in t&&e.call(r||t,t[i],i,t)===-1);i++);}function kt(t,e,r){for(var n=t.length,i=r||0,a=Math.max(i>=0?i:n-Math.abs(i),0);a<n;a++)if(a in t&&t[a]===e)return a;return-1}function jt(t,e,r){for(var n=t.length,i=r||t,a=new Array(n),o=0;o<n;o++)o in t&&(a[o]=e.call(i,t[o],t));return a}function Xr(t,e,r){var n=t.length,i=0,a;if(arguments.length>=3)a=arguments[2];else{for(;i<n&&!(i in t);)i++;a=t[i++]}for(;i<n;)i in t&&(a=e(a,t[i],i,t)),i++;return a}function se(t){return typeof t!="string"?t:t.replace(/^\s+|\s+$/g,"")}function Ye(t){var e=typeof t;e!==mt&&(e!==Je||t===null)&&Er("objKeys called on non-object");var r=[];for(var n in t)t&&nr.call(t,n)&&r.push(n);if(Mc)for(var i=Hi.length,a=0;a<i;a++)t&&nr.call(t,Hi[a])&&r.push(Hi[a]);return r}function St(t,e,r,n){if(Ro)try{var i={enumerable:!0,configurable:!0};return r&&(i.get=r),n&&(i.set=n),Ro(t,e,i),!0}catch(a){}return!1}function de(){var t=Date;return t.now?t.now():new t().getTime()}function G(t){return qt(t)?t.name:""}function K(t,e,r,n,i){var a=r;return t&&(a=t[e],a!==r&&(!i||i(a))&&(!n||n(r))&&(a=r,t[e]=a)),a}function ge(t,e,r){var n;return t?(n=t[e],!n&&x(n)&&(n=pe(r)?{}:r,t[e]=n)):n=pe(r)?{}:r,n}function Wn(t){return!t}function Ar(t){return!!t}function De(t){throw new Error(t)}function Jr(t,e,r){if(t&&e&&t!==e&&st(t)&&st(e)){var n=function(a){if(U(a)){var o=e[a];B(o)?(!r||r(a,!0,e,t))&&(t[a]=function(u){return function(){var s=arguments;return e[u].apply(e,s)}}(a)):(!r||r(a,!1,e,t))&&(br(t,a)&&delete t[a],St(t,a,function(){return e[a]},function(u){e[a]=u})||(t[a]=o))}};for(var i in e)n(i)}return t}function Wi(t){return function(){function e(){var r=this;t&&Y(t,function(n,i){r[n]=i})}return e}()}function Xn(t){return t&&(t=gt(Tr?Tr({},t):t)),t}var Mo,Do,No,ko,Fo,Ro,pf,df,Mc,Hi,Le=I(()=>{ne();Mo="on",Do="attachEvent",No="addEventListener",ko="detachEvent",Fo="removeEventListener",Ro=On,pf=gt.freeze,df=gt.seal;Mc=!{toString:null}.propertyIsEnumerable("toString"),Hi=["toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","constructor"]});function we(t){var e=ot();return e&&e[t]?e[t]:t===Lo&&or()?window:null}function or(){return Boolean(typeof window===Je&&window)}function It(){return or()?window:we(Lo)}function Jn(){return Boolean(typeof document===Je&&document)}function Ne(){return Jn()?document:we(Lc)}function Uo(){return Boolean(typeof navigator===Je&&navigator)}function _e(){return Uo()?navigator:we(_c)}function Oo(){return Boolean(typeof history===Je&&history)}function $i(){return Oo()?history:we(Uc)}function et(t){if(t&&jc){var e=we("__mockLocation");if(e)return e}return typeof location===Je&&location?location:we(Oc)}function Yi(){return typeof console!==Oe?console:we(zc)}function Qe(){return we(Bc)}function vt(){return Boolean(typeof JSON===Je&&JSON||we(_o)!==null)}function be(){return vt()?JSON||we(_o):null}function ea(){return we(Hc)}function ta(){return we(Vc)}function ra(){var t=_e();return t&&t.product?t.product===qc:!1}function Gt(){var t=_e();if(t&&(t.userAgent!==Ji||Xi===null)){Ji=t.userAgent;var e=(Ji||"").toLowerCase();Xi=Ee(e,Qi)||Ee(e,Zi)}return Xi}function sr(t){if(t===void 0&&(t=null),!t){var e=_e()||{};t=e?(e.userAgent||"").toLowerCase():""}var r=(t||"").toLowerCase();if(Ee(r,Qi))return parseInt(r.split(Qi)[1]);if(Ee(r,Zi)){var n=parseInt(r.split(Zi)[1]);if(n)return n+4}return null}function O(t){var e=Object[Ce].toString.call(t),r="";return e==="[object Error]"?r="{ stack: '"+t.stack+"', message: '"+t.message+"', name: '"+t.name+"'":vt()&&(r=be().stringify(t)),e+r}var Lo,Lc,_c,Uc,Oc,zc,Bc,_o,Hc,Vc,qc,Qi,Zi,Xi,Ji,jc,Dr=I(()=>{"use strict";ne();Le();Lo="window",Lc="document",_c="navigator",Uc="history",Oc="location",zc="console",Bc="performance",_o="JSON",Hc="crypto",Vc="msCrypto",qc="ReactNative",Qi="msie",Zi="trident/",Xi=null,Ji=null,jc=!1});function zo(t){return t?'"'+t.replace(/\"/g,"")+'"':""}function Rt(t,e){return(t||{}).logger||new Qn(e)}var Gc,Kc,Wc,Ft,Qn,Zn=I(()=>{"use strict";Kr();Dr();Te();Le();Gc="AI (Internal): ",Kc="AI: ",Wc="AITR_";Ft=function(){function t(e,r,n,i){n===void 0&&(n=!1);var a=this;a.messageId=e,a.message=(n?Kc:Gc)+e;var o="";vt()&&(o=be().stringify(i));var u=(r?" message:"+zo(r):"")+(i?" props:"+zo(o):"");a.message+=u}return t.dataType="MessageData",t}();Qn=function(){function t(e){this.identifier="DiagnosticLogger",this.queue=[];var r=0,n={};W(t,this,function(i){x(e)&&(e={}),i.consoleLoggingLevel=function(){return a("loggingLevelConsole",0)},i.telemetryLoggingLevel=function(){return a("loggingLevelTelemetry",1)},i.maxInternalMessageLimit=function(){return a("maxMessageLimit",25)},i.enableDebugExceptions=function(){return a("enableDebugExceptions",!1)},i.throwInternal=function(u,s,c,l,f){f===void 0&&(f=!1);var m=new Ft(s,c,f,l);if(i.enableDebugExceptions())throw m;if(!pe(m.message)){var C=i.consoleLoggingLevel();if(f){var E=+m.messageId;!n[E]&&C>=S.WARNING&&(i.warnToConsole(m.message),n[E]=!0)}else C>=S.WARNING&&i.warnToConsole(m.message);i.logInternalMessage(u,m)}},i.warnToConsole=function(u){var s=Yi();if(s){var c="log";s.warn&&(c="warn"),B(s[c])&&s[c](u)}},i.resetInternalMessageCount=function(){r=0,n={}},i.logInternalMessage=function(u,s){if(!o()){var c=!0,l=Wc+s.messageId;if(n[l]?c=!1:n[l]=!0,c&&(u<=i.telemetryLoggingLevel()&&(i.queue.push(s),r++),r===i.maxInternalMessageLimit())){var f="Internal events throttle limit per PageView reached for this app.",m=new Ft(h.MessageLimitPerPVExceeded,f,!1);i.queue.push(m),i.warnToConsole(f)}}};function a(u,s){var c=e[u];return x(c)?s:c}function o(){return r>=i.maxInternalMessageLimit()}})}return t}()});function ut(t,e,r,n,i){if(t){var a=t;if(B(a.getPerfMgr)&&(a=a.getPerfMgr()),a){var o=void 0,u=a.getCtx(na);try{if(o=a.create(e(),n,i),o){if(u&&o.setCtx&&(o.setCtx(ur.ParentContextKey,u),u.getCtx&&u.setCtx)){var s=u.getCtx(ur.ChildrenContextKey);s||(s=[],u.setCtx(ur.ChildrenContextKey,s)),s.push(o)}return a.setCtx(na,o),r(o)}}catch(c){o&&o.setCtx&&o.setCtx("exception",c)}finally{o&&a.fire(o),a.setCtx(na,u)}}}return r()}var Nr,ur,Qr,na,Zr=I(()=>{Te();Le();Nr="ctx",ur=function(){function t(e,r,n){var i=this,a=!1;if(i.start=de(),i.name=e,i.isAsync=n,i.isChildEvt=function(){return!1},B(r)){var o;a=St(i,"payload",function(){return!o&&B(r)&&(o=r(),r=null),o})}i.getCtx=function(u){return u?u===t.ParentContextKey||u===t.ChildrenContextKey?i[u]:(i[Nr]||{})[u]:null},i.setCtx=function(u,s){if(u)if(u===t.ParentContextKey)i[u]||(i.isChildEvt=function(){return!0}),i[u]=s;else if(u===t.ChildrenContextKey)i[u]=s;else{var c=i[Nr]=i[Nr]||{};c[u]=s}},i.complete=function(){var u=0,s=i.getCtx(t.ChildrenContextKey);if(Re(s))for(var c=0;c<s.length;c++){var l=s[c];l&&(u+=l.time)}i.time=de()-i.start,i.exTime=i.time-u,i.complete=function(){},!a&&B(r)&&(i.payload=r())}}return t.ParentContextKey="parent",t.ChildrenContextKey="childEvts",t}(),Qr=function(){function t(e){this.ctx={},W(t,this,function(r){r.create=function(n,i,a){return new ur(n,i,a)},r.fire=function(n){n&&(n.complete(),e&&e.perfEvent(n))},r.setCtx=function(n,i){if(n){var a=r[Nr]=r[Nr]||{};a[n]=i}},r.getCtx=function(n){return(r[Nr]||{})[n]}})}return t}(),na="CoreUtils.doPerf"});var Bo,Ho=I(()=>{"use strict";Zr();Kr();Le();Bo=function(){function t(e,r){var n=this,i=null,a=B(e.processTelemetry),o=B(e.setNextPlugin);n._hasRun=!1,n.getPlugin=function(){return e},n.getNext=function(){return i},n.setNext=function(u){i=u},n.processTelemetry=function(u,s){s||(s=r);var c=e?e.identifier:"TelemetryPluginChain";ut(s?s.core():null,function(){return c+":processTelemetry"},function(){if(e&&a){n._hasRun=!0;try{s.setNext(i),o&&e.setNextPlugin(i),i&&(i._hasRun=!1),e.processTelemetry(u,s)}catch(f){var l=i&&i._hasRun;(!i||!l)&&s.diagLog().throwInternal(S.CRITICAL,h.PluginException,"Plugin ["+e.identifier+"] failed during processTelemetry - "+f),i&&!l&&i.processTelemetry(u,s)}}else i&&(n._hasRun=!0,i.processTelemetry(u,s))},function(){return{item:u}},!u.sync)}}return t}()});function ia(t,e){var r=[];if(t&&t.length>0)for(var n=null,i=0;i<t.length;i++){var a=t[i];if(a&&B(a.processTelemetry)){var o=new Bo(a,e);r.push(o),n&&n.setNext(o),n=o}}return r.length>0?r[0]:null}function Xc(t,e,r){var n=[],i=!r;if(t)for(;t;){var a=t.getPlugin();(i||a===r)&&(i=!0,n.push(a)),t=t.getNext()}return i||n.push(r),ia(n,e)}function Jc(t,e,r){var n=t,i=!1;return r&&t&&(n=[],R(t,function(a){(i||a===r)&&(i=!0,n.push(a))})),r&&!i&&(n||(n=[]),n.push(r)),ia(n,e)}var Mt,$n=I(()=>{"use strict";Zn();Ho();Le();Mt=function(){function t(e,r,n,i){var a=this,o=null;i!==null&&(e&&B(e.getPlugin)?o=Xc(e,a,i||e.getPlugin()):i?o=Jc(e,a,i):pe(i)&&(o=ia(e,a))),a.core=function(){return n},a.diagLog=function(){return Rt(n,r)},a.getCfg=function(){return r},a.getExtCfg=function(u,s){s===void 0&&(s={});var c;if(r){var l=r.extensionConfig;l&&u&&(c=l[u])}return c||s},a.getConfig=function(u,s,c){c===void 0&&(c=!1);var l,f=a.getExtCfg(u,null);return f&&!x(f[s])?l=f[s]:r&&!x(r[s])&&(l=r[s]),x(l)?c:l},a.hasNext=function(){return o!=null},a.getNext=function(){return o},a.setNext=function(u){o=u},a.processNext=function(u){var s=o;s&&(o=s.getNext(),s.processTelemetry(u,a))},a.createNew=function(u,s){return u===void 0&&(u=null),new t(u||o,r,n,s)}}return t}()});var Vo,Yn,aa=I(()=>{Vo="iKey",Yn="extensionConfig"});var ei,tt,oa=I(()=>{"use strict";$n();Le();aa();ei="getPlugin",tt=function(){function t(){var e=this,r=!1,n=null,i=null;e.core=null,e.diagLog=function(a){return e._getTelCtx(a).diagLog()},e.isInitialized=function(){return r},e.setInitialized=function(a){r=a},e.setNextPlugin=function(a){i=a},e.processNext=function(a,o){o?o.processNext(a):i&&B(i.processTelemetry)&&i.processTelemetry(a,null)},e._getTelCtx=function(a){a===void 0&&(a=null);var o=a;if(!o){var u=n||new Mt(null,{},e.core);i&&i[ei]?o=u.createNew(null,i[ei]):o=u.createNew(null,i)}return o},e._baseTelInit=function(a,o,u,s){a&&K(a,Yn,[],null,x),!s&&o&&(s=o.getProcessTelContext().getNext());var c=i;i&&i[ei]&&(c=i[ei]()),e.core=o,n=new Mt(s,a,o,c),r=!0}}return t.prototype.initialize=function(e,r,n,i){this._baseTelInit(e,r,n,i)},t}()});function $r(t,e){for(var r=[],n=null,i=t.getNext();i;){var a=i.getPlugin();a&&(n&&B(n[jo])&&B(a[sa])&&n[jo](a),(!B(a[Go])||!a[Go]())&&r.push(a),n=a,i=i.getNext())}R(r,function(o){o.initialize(t.getCfg(),t.core(),e,t.getNext())})}function ua(t){return t.sort(function(e,r){var n=0,i=B(r[sa]);return B(e[sa])?n=i?e[qo]-r[qo]:1:i&&(n=-1),n})}var sa,qo,jo,Go,ca=I(()=>{"use strict";Le();sa="processTelemetry",qo="priority",jo="setNextPlugin",Go="isInitialized"});var la,Qc,Ko,Wo=I(()=>{"use strict";ne();Te();oa();$n();ca();Le();la=500,Qc="Channel has invalid priority",Ko=function(t){z(e,t);function e(){var r=t.call(this)||this;r.identifier="ChannelControllerPlugin",r.priority=la;var n;W(e,r,function(u,s){u.setNextPlugin=function(c){},u.processTelemetry=function(c,l){n&&R(n,function(f){if(f.length>0){var m=r._getTelCtx(l).createNew(f);m.processNext(c)}})},u.getChannelControls=function(){return n},u.initialize=function(c,l,f){u.isInitialized()||(s.initialize(c,l,f),o((c||{}).channels,f),R(n,function(m){return $r(new Mt(m,c,l),f)}))}});function i(u){R(u,function(s){s.priority<la&&De(Qc+s.identifier)})}function a(u){u&&u.length>0&&(u=u.sort(function(s,c){return s.priority-c.priority}),i(u),n.push(u))}function o(u,s){if(n=[],u&&R(u,function(l){return a(l)}),s){var c=[];R(s,function(l){l.priority>la&&c.push(l)}),a(c)}}return r}return e._staticInit=function(){var r=e.prototype;St(r,"ChannelControls",r.getChannelControls),St(r,"channelQueue",r.getChannelControls)}(),e}(tt)});function va(t,e){var r=cr[Kt]||ni[Kt];return r||(r=cr[Kt]=cr(t,e),ni[Kt]=r),r}function ri(t){return t?t.isEnabled():!0}function Zc(t){var e=t.cookieCfg=t.cookieCfg||{};if(K(e,"domain",t.cookieDomain,ji,x),K(e,"path",t.cookiePath||"/",null,x),x(e[da])){var r=void 0;pe(t[Qo])||(r=!t[Qo]),pe(t[Zo])||(r=!t[Zo]),e[da]=r}return e}function lr(t,e){var r;if(t)r=t.getCookieMgr();else if(e){var n=e.cookieCfg;n[Kt]?r=n[Kt]:r=cr(e)}return r||(r=va(e,(t||{}).logger)),r}function cr(t,e){var r=Zc(t||ni),n=r.path||"/",i=r.domain,a=r[da]!==!1,o={isEnabled:function(){var u=a&&ma(e),s=ni[Kt];return u&&s&&o!==s&&(u=ri(s)),u},setEnabled:function(u){a=u!==!1},set:function(u,s,c,l,f){if(ri(o)){var m={},C=se(s||ht),E=C.indexOf(";");if(E!==-1&&(C=se(s.substring(0,E)),m=ns(s.substring(E+1))),K(m,"domain",l||i,Ar,pe),!x(c)){var P=Gt();if(pe(m[fa])){var p=de(),v=p+c*1e3;if(v>0){var y=new Date;y.setTime(v),K(m,fa,es(y,P?Xo:Jo)||es(y,P?Xo:Jo)||ht,Ar)}}P||K(m,"max-age",ht+c,null,pe)}var w=et();w&&w.protocol==="https:"&&(K(m,"secure",null,null,pe),pa===null&&(pa=!ii((_e()||{}).userAgent)),pa&&K(m,"SameSite","None",null,pe)),K(m,"path",f||n,null,pe);var L=r.setCookie||rs;L(u,ts(C,m))}},get:function(u){var s=ht;return ri(o)&&(s=(r.getCookie||$c)(u)),s},del:function(u,s){ri(o)&&o.purge(u,s)},purge:function(u,s){if(ma(e)){var c=(f={},f.path=s||"/",f[fa]="Thu, 01 Jan 1970 00:00:01 GMT",f);Gt()||(c["max-age"]="0");var l=r.delCookie||rs;l(u,ts(ht,c))}var f}};return o[Kt]=o,o}function ma(t){if(ti===null){ti=!1;try{var e=Yr||{};ti=e[ga]!==void 0}catch(r){t&&t.throwInternal(S.WARNING,h.CannotAccessCookie,"Cannot access document.cookie - "+G(r),{exception:O(r)})}}return ti}function ns(t){var e={};if(t&&t.length){var r=se(t).split(";");R(r,function(n){if(n=se(n||ht),n){var i=n.indexOf("=");i===-1?e[n]=null:e[se(n.substring(0,i))]=se(n.substring(i+1))}})}return e}function es(t,e){return B(t[e])?t[e]():null}function ts(t,e){var r=t||ht;return Y(e,function(n,i){r+="; "+n+(x(i)?ht:"="+i)}),r}function $c(t){var e=ht;if(Yr){var r=Yr[ga]||ht;$o!==r&&(Yo=ns(r),$o=r),e=se(Yo[t]||ht)}return e}function rs(t,e){Yr&&(Yr[ga]=t+"="+e)}function ii(t){return U(t)?!!(Ee(t,"CPU iPhone OS 12")||Ee(t,"iPad; CPU OS 12")||Ee(t,"Macintosh; Intel Mac OS X 10_14")&&Ee(t,"Version/")&&Ee(t,"Safari")||Ee(t,"Macintosh; Intel Mac OS X 10_14")&&Ki(t,"AppleWebKit/605.1.15 (KHTML, like Gecko)")||Ee(t,"Chrome/5")||Ee(t,"Chrome/6")||Ee(t,"UnrealEngine")&&!Ee(t,"Chrome")||Ee(t,"UCBrowser/12")||Ee(t,"UCBrowser/11")):!1}var Xo,Jo,ga,fa,da,Qo,Zo,Kt,ht,ti,pa,$o,Yr,Yo,ni,ai=I(()=>{Kr();Dr();Le();Xo="toGMTString",Jo="toUTCString",ga="cookie",fa="expires",da="enabled",Qo="isCookieUseDisabled",Zo="disableCookiesUsage",Kt="_ckMgr",ht="",ti=null,pa=null,$o=null,Yr=Ne(),Yo={},ni={}});var Yc,is,en,ha=I(()=>{"use strict";ne();Te();Wo();$n();ca();Zr();ai();Le();aa();Yc="Extensions must provide callback to initialize",is="_notificationManager",en=function(){function t(){var e=!1,r,n,i,a,o;W(t,this,function(u){u._extensions=new Array,n=new Ko,u.logger=Dt({throwInternal:function(s,c,l,f,m){m===void 0&&(m=!1)},warnToConsole:function(s){},resetInternalMessageCount:function(){}}),r=[],u.isInitialized=function(){return e},u.initialize=function(s,c,l,f){u.isInitialized()&&De("Core should not be initialized more than once"),(!s||x(s.instrumentationKey))&&De("Please provide instrumentation key"),i=f,u[is]=f,u.config=s||{},s.extensions=x(s.extensions)?[]:s.extensions;var m=ge(s,Yn);m.NotificationManager=f,l&&(u.logger=l);var C=[];C.push.apply(C,c.concat(s.extensions)),C=ua(C);var E=[],P=[],p={};R(C,function(v){(x(v)||x(v.initialize))&&De(Yc);var y=v.priority,w=v.identifier;v&&y&&(x(p[y])?p[y]=w:l.warnToConsole("Two extensions have same priority #"+y+" - "+p[y]+", "+w)),!y||y<n.priority?E.push(v):P.push(v)}),C.push(n),E.push(n),C=ua(C),u._extensions=C,$r(new Mt([n],s,u),C),$r(new Mt(E,s,u),C),u._extensions=E,u.getTransmissionControls().length===0&&De("No channels available"),e=!0,u.releaseQueue()},u.getTransmissionControls=function(){return n.getChannelControls()},u.track=function(s){K(s,Vo,u.config.instrumentationKey,null,Wn),K(s,"time",Me(new Date),null,Wn),K(s,"ver","4.0",null,x),u.isInitialized()?u.getProcessTelContext().processNext(s):r.push(s)},u.getProcessTelContext=function(){var s=u._extensions,c=s;return(!s||s.length===0)&&(c=[n]),new Mt(c,u.config,u)},u.getNotifyMgr=function(){return i||(i=Dt({addNotificationListener:function(s){},removeNotificationListener:function(s){},eventsSent:function(s){},eventsDiscarded:function(s,c){},eventsSendRequest:function(s,c){}}),u[is]=i),i},u.getCookieMgr=function(){return o||(o=cr(u.config,u.logger)),o},u.setCookieMgr=function(s){o=s},u.getPerfMgr=function(){return a||u.config&&u.config.enablePerfMgr&&(a=new Qr(u.getNotifyMgr())),a},u.setPerfMgr=function(s){a=s},u.eventCnt=function(){return r.length},u.releaseQueue=function(){r.length>0&&(R(r,function(s){u.getProcessTelContext().processNext(s)}),r=[])}})}return t}()});var tn,xa=I(()=>{Te();Le();tn=function(){function t(e){this.listeners=[];var r=!!(e||{}).perfEvtsSendAll;W(t,this,function(n){n.addNotificationListener=function(i){n.listeners.push(i)},n.removeNotificationListener=function(i){for(var a=kt(n.listeners,i);a>-1;)n.listeners.splice(a,1),a=kt(n.listeners,i)},n.eventsSent=function(i){R(n.listeners,function(a){a&&a.eventsSent&&setTimeout(function(){return a.eventsSent(i)},0)})},n.eventsDiscarded=function(i,a){R(n.listeners,function(o){o&&o.eventsDiscarded&&setTimeout(function(){return o.eventsDiscarded(i,a)},0)})},n.eventsSendRequest=function(i,a){R(n.listeners,function(o){if(o&&o.eventsSendRequest)if(a)setTimeout(function(){return o.eventsSendRequest(i,a)},0);else try{o.eventsSendRequest(i,a)}catch(u){}})},n.perfEvent=function(i){i&&(r||!i.isChildEvt())&&R(n.listeners,function(a){if(a&&a.perfEvent)if(i.isAsync)setTimeout(function(){return a.perfEvent(i)},0);else try{a.perfEvent(i)}catch(o){}})}})}return t}()});var rn,as=I(()=>{ne();ha();Io();xa();Zr();Zn();Te();Le();rn=function(t){z(e,t);function e(){var r=t.call(this)||this;return W(e,r,function(n,i){n.initialize=function(u,s,c,l){i.initialize(u,s,c||new Qn(u),l||new tn(u))},n.track=function(u){ut(n.getPerfMgr(),function(){return"AppInsightsCore:track"},function(){u===null&&(o(u),De("Invalid telemetry item")),a(u),i.track(u)},function(){return{item:u}},!u.sync)},n.addNotificationListener=function(u){var s=n.getNotifyMgr();s&&s.addNotificationListener(u)},n.removeNotificationListener=function(u){var s=n.getNotifyMgr();s&&s.removeNotificationListener(u)},n.pollInternalLogs=function(u){var s=n.config.diagnosticLogInterval;return(!s||!(s>0))&&(s=1e4),setInterval(function(){var c=n.logger?n.logger.queue:[];R(c,function(l){var f={name:u||"InternalMessageId: "+l.messageId,iKey:n.config.instrumentationKey,time:Me(new Date),baseType:Ft.dataType,baseData:{message:l.message}};n.track(f)}),c.length=0},s)};function a(u){if(x(u.name))throw o(u),Error("telemetry name required")}function o(u){var s=n.getNotifyMgr();s&&s.eventsDiscarded([u],So.InvalidEvent)}}),r}return e}(en)});function us(t){t<0&&(t>>>=0),nn=123456789+t&Wt,an=987654321-t&Wt,ss=!0}function cs(){try{var t=de()&2147483647;us((Math.random()*os^t)+t)}catch(e){}}function oi(t){return t>0?Math.floor(Ct()/Wt*(t+1))>>>0:0}function Ct(t){var e,r=ea()||ta();return r&&r.getRandomValues?e=r.getRandomValues(new Uint32Array(1))[0]&Wt:Gt()?(ss||cs(),e=si()&Wt):e=Math.floor(os*Math.random()|0),t||(e>>>=0),e}function ya(t){t?us(t):cs()}function si(t){an=36969*(an&65535)+(an>>16)&Wt,nn=18e3*(nn&65535)+(nn>>16)&Wt;var e=(an<<16)+(nn&65535)>>>0&Wt|0;return t||(e>>>=0),e}var os,Wt,ss,nn,an,Sa=I(()=>{Dr();Le();os=4294967296,Wt=4294967295,ss=!1,nn=123456789,an=987654321});function Lt(t,e){var r=!1,n=It();n&&(r=Vt(n,t,e),r=Vt(n.body,t,e)||r);var i=Ne();return i&&(r=Jt.Attach(i,t,e)||r),r}function ls(){function t(){return oi(15)}return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(el,function(e){var r=t()|0,n=e==="x"?r:r&3|8;return n.toString(16)})}function fs(){var t=Qe();return t&&t.now?t.now():de()}function Xt(t){t===void 0&&(t=22);for(var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",r=Ct()>>>0,n=0,i="";i.length<t;)n++,i+=e.charAt(r&63),r>>>=6,n===5&&(r=(Ct()<<2&4294967295|r&3)>>>0,n=0);return i}function ze(){for(var t=["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"],e="",r,n=0;n<4;n++)r=Ct(),e+=t[r&15]+t[r>>4&15]+t[r>>8&15]+t[r>>12&15]+t[r>>16&15]+t[r>>20&15]+t[r>>24&15]+t[r>>28&15];var i=t[8+(Ct()&3)|0];return e.substr(0,8)+e.substr(9,4)+"4"+e.substr(13,3)+i+e.substr(16,3)+e.substr(19,12)}function Qt(t,e){var r=va(t,e),n=un._canUseCookies;return on===null&&(on=[],sn=n,St(un,"_canUseCookies",function(){return sn},function(i){sn=i,R(on,function(a){a.setEnabled(i)})})),kt(on,r)===-1&&on.push(r),Wr(n)&&r.setEnabled(n),Wr(sn)&&r.setEnabled(sn),r}function ui(){Qt().setEnabled(!1)}function Ia(t){return Qt(null,t).isEnabled()}function Ca(t,e){return Qt(null,t).get(e)}function Ta(t,e,r,n){Qt(null,t).set(e,r,null,n)}function Ea(t,e){return Qt(null,t).del(e)}var on,sn,un,el,Jt,ps=I(()=>{"use strict";ne();ai();Dr();Le();Sa();on=null;un={_canUseCookies:void 0,isTypeof:qi,isUndefined:pe,isNullOrUndefined:x,hasOwnProperty:br,isFunction:B,isObject:st,isDate:Pr,isArray:Re,isError:qt,isString:U,isNumber:ar,isBoolean:Wr,toISOString:Me,arrForEach:R,arrIndexOf:kt,arrMap:jt,arrReduce:Xr,strTrim:se,objCreate:Dt,objKeys:Ye,objDefineAccessors:St,addEventHandler:Lt,dateNow:de,isIE:Gt,disableCookies:ui,newGuid:ls,perfNow:fs,newId:Xt,randomValue:oi,random32:Ct,mwcRandomSeed:ya,mwcRandom32:si,generateW3CId:ze},el=/[xy]/g,Jt={Attach:Vt,AttachEvent:Vt,Detach:Kn,DetachEvent:Kn}});function ba(t,e){if(t)for(var r=0;r<t.length&&!e(t[r],r);r++);}function wa(t,e,r,n,i){i>=0&&i<=2&&ba(t,function(a,o){var u=a.cbks,s=u[ms[i]];if(s){e.ctx=function(){var f=n[o]=n[o]||{};return f};try{s.apply(e.inst,r)}catch(f){var c=e.err;try{var l=u[ms[2]];l&&(e.err=f,l.apply(e.inst,r))}catch(m){}finally{e.err=c}}}})}function nl(t){return function(){var e=this,r=arguments,n=t.h,i={name:t.n,inst:e,ctx:null,set:s},a=[],o=u([i],r);function u(l,f){return ba(f,function(m){l.push(m)}),l}function s(l,f){r=u([],r),r[l]=f,o=u([i],r)}wa(n,i,o,a,0);var c=t.f;try{i.rslt=c.apply(e,r)}catch(l){throw i.err=l,wa(n,i,o,a,3),l}return wa(n,i,o,a,1),i.rslt}}function il(t){if(t){if(gs)return gs(t);var e=t[tl]||t[Ce]||t[rl];if(e)return e}return null}function vs(t,e,r){var n=null;return t&&(br(t,e)?n=t:r&&(n=vs(il(t),e,!1))),n}function Pa(t,e,r){return t?cn(t[Ce],e,r,!1):null}function cn(t,e,r,n){if(n===void 0&&(n=!0),t&&e&&r){var i=vs(t,e,n);if(i){var a=i[e];if(typeof a===mt){var o=a[ds];if(!o){o={i:0,n:e,f:a,h:[]};var u=nl(o);u[ds]=o,i[e]=u}var s={id:o.i,cbks:r,rm:function(){var c=this.id;ba(o.h,function(l,f){if(l.id===c)return o.h.splice(f,1),1})}};return o.i++,o.h.push(s),s}}}return null}var ds,ms,tl,rl,gs,hs=I(()=>{ne();Le();ds="_aiHooks",ms=["req","rsp","hkErr","fnErr"],tl="__proto__",rl="constructor";gs=Object.getPrototypeOf});var X=I(()=>{as();ha();oa();Sa();ps();Le();Dr();ne();xa();Zr();Zn();Kr();hs();ai()});var te,Aa=I(()=>{te={requestContextHeader:"Request-Context",requestContextTargetKey:"appId",requestContextAppIdFormat:"appId=cid-v1:",requestIdHeader:"Request-Id",traceParentHeader:"traceparent",traceStateHeader:"tracestate",sdkContextHeader:"Sdk-Context",sdkContextHeaderAppIdRequest:"appId",requestContextHeaderLowerCase:"request-context"}});function ci(t,e,r){var n=e.length,i=Da(t,e);if(i.length!==n){for(var a=0,o=i;r[o]!==void 0;)a++,o=i.substring(0,150-3)+Na(a);i=o}return i}function Da(t,e){var r;return e&&(e=se(e.toString()),e.length>150&&(r=e.substring(0,150),t.throwInternal(S.WARNING,h.NameTooLong,"name is too long.  It has been truncated to "+150+" characters.",{name:e},!0))),r||e}function oe(t,e,r){r===void 0&&(r=1024);var n;return e&&(r=r||1024,e=se(e),e.toString().length>r&&(n=e.toString().substring(0,r),t.throwInternal(S.WARNING,h.StringValueTooLong,"string value is too long. It has been truncated to "+r+" characters.",{value:e},!0))),n||e}function Tt(t,e){return pi(t,e,2048,h.UrlTooLong)}function kr(t,e){var r;return e&&e.length>32768&&(r=e.substring(0,32768),t.throwInternal(S.WARNING,h.MessageTruncated,"message is too long, it has been truncated to "+32768+" characters.",{message:e},!0)),r||e}function li(t,e){var r;if(e){var n=""+e;n.length>32768&&(r=n.substring(0,32768),t.throwInternal(S.WARNING,h.ExceptionTruncated,"exception is too long, it has been truncated to "+32768+" characters.",{exception:e},!0))}return r||e}function Be(t,e){if(e){var r={};Y(e,function(n,i){if(st(i)&&vt())try{i=be().stringify(i)}catch(a){t.throwInternal(S.WARNING,h.CannotSerializeObjectNonSerializable,"custom property is not valid",{exception:a},!0)}i=oe(t,i,8192),n=ci(t,n,r),r[n]=i}),e=r}return e}function He(t,e){if(e){var r={};Y(e,function(n,i){n=ci(t,n,r),r[n]=i}),e=r}return e}function fi(t,e){return e&&pi(t,e,128,h.IdTooLong).toString()}function pi(t,e,r,n){var i;return e&&(e=se(e),e.length>r&&(i=e.substring(0,r),t.throwInternal(S.WARNING,n,"input is too long, it has been truncated to "+r+" characters.",{data:e},!0))),i||e}function Na(t){var e="00"+t;return e.substr(e.length-3)}var ka,ct=I(()=>{X();ka={MAX_NAME_LENGTH:150,MAX_ID_LENGTH:128,MAX_PROPERTY_LENGTH:8192,MAX_STRING_LENGTH:1024,MAX_URL_LENGTH:2048,MAX_MESSAGE_LENGTH:32768,MAX_EXCEPTION_LENGTH:32768,sanitizeKeyAndAddUniqueness:ci,sanitizeKey:Da,sanitizeString:oe,sanitizeUrl:Tt,sanitizeMessage:kr,sanitizeException:li,sanitizeProperties:Be,sanitizeMeasurements:He,sanitizeId:fi,sanitizeInput:pi,padNumber:Na,trim:se}});function _t(t){var e=null;if(B(Event))e=new Event(t);else{var r=Ne();r&&r.createEvent&&(e=r.createEvent("Event"),e.initEvent(t,!0,!0))}return e}var Fa=I(()=>{X()});function ee(t,e){return e===void 0&&(e=!1),t==null?e:t.toString().toLowerCase()==="true"}function Ge(t){(isNaN(t)||t<0)&&(t=0),t=Math.round(t);var e=""+t%1e3,r=""+Math.floor(t/1e3)%60,n=""+Math.floor(t/(1e3*60))%60,i=""+Math.floor(t/(1e3*60*60))%24,a=Math.floor(t/(1e3*60*60*24));return e=e.length===1?"00"+e:e.length===2?"0"+e:e,r=r.length<2?"0"+r:r,n=n.length<2?"0"+n:n,i=i.length<2?"0"+i:i,(a>0?a+".":"")+i+":"+n+":"+r+"."+e}function Fr(){var t=_e();return"sendBeacon"in t&&t.sendBeacon}function ln(t,e){var r=null;return R(t,function(n){if(n.identifier===e)return r=n,-1}),r}function fn(t,e,r,n,i){return!i&&U(t)&&(t==="Script error."||t==="Script error")}var pn=I(()=>{X()});var Et,fr,Ut,Rr,dn,le,lt=I(()=>{Et="Microsoft_ApplicationInsights_BypassAjaxInstrumentation",fr="sampleRate",Ut="ProcessLegacy",Rr="http.method",dn="https://dc.services.visualstudio.com",le="not_specified"});var Zt,Ke,Ra=I(()=>{(function(t){t[t.LocalStorage=0]="LocalStorage",t[t.SessionStorage=1]="SessionStorage"})(Zt||(Zt={}));(function(t){t[t.AI=0]="AI",t[t.AI_AND_W3C=1]="AI_AND_W3C",t[t.W3C=2]="W3C"})(Ke||(Ke={}))});function Ma(){return Mr()?di(Zt.LocalStorage):null}function di(t){try{if(x(ot()))return null;var e=new Date,r=we(t===Zt.LocalStorage?"localStorage":"sessionStorage");r.setItem(e.toString(),e.toString());var n=r.getItem(e.toString())!==e.toString();if(r.removeItem(e.toString()),!n)return r}catch(i){}return null}function La(){return wt()?di(Zt.SessionStorage):null}function mn(){pr=!1,dr=!1}function Mr(){return pr===void 0&&(pr=!!di(Zt.LocalStorage)),pr}function gn(t,e){var r=Ma();if(r!==null)try{return r.getItem(e)}catch(n){pr=!1,t.throwInternal(S.WARNING,h.BrowserCannotReadLocalStorage,"Browser failed read of local storage. "+G(n),{exception:O(n)})}return null}function vn(t,e,r){var n=Ma();if(n!==null)try{return n.setItem(e,r),!0}catch(i){pr=!1,t.throwInternal(S.WARNING,h.BrowserCannotWriteLocalStorage,"Browser failed write to local storage. "+G(i),{exception:O(i)})}return!1}function hn(t,e){var r=Ma();if(r!==null)try{return r.removeItem(e),!0}catch(n){pr=!1,t.throwInternal(S.WARNING,h.BrowserFailedRemovalFromLocalStorage,"Browser failed removal of local storage item. "+G(n),{exception:O(n)})}return!1}function wt(){return dr===void 0&&(dr=!!di(Zt.SessionStorage)),dr}function _a(){var t=[];return wt()&&Y(we("sessionStorage"),function(e){t.push(e)}),t}function $t(t,e){var r=La();if(r!==null)try{return r.getItem(e)}catch(n){dr=!1,t.throwInternal(S.WARNING,h.BrowserCannotReadSessionStorage,"Browser failed read of session storage. "+G(n),{exception:O(n)})}return null}function Yt(t,e,r){var n=La();if(n!==null)try{return n.setItem(e,r),!0}catch(i){dr=!1,t.throwInternal(S.WARNING,h.BrowserCannotWriteSessionStorage,"Browser failed write to session storage. "+G(i),{exception:O(i)})}return!1}function xn(t,e){var r=La();if(r!==null)try{return r.removeItem(e),!0}catch(n){dr=!1,t.throwInternal(S.WARNING,h.BrowserFailedRemovalFromSessionStorage,"Browser failed removal of session storage item. "+G(n),{exception:O(n)})}return!1}var pr,dr,Ua=I(()=>{X();Ra();pr=void 0,dr=void 0});function mr(t){var e=ys,r=al,n=r[e];return xs.createElement?r[e]||(n=r[e]=xs.createElement("a")):n={host:mi(t,!0)},n.href=t,e++,e>=r.length&&(e=0),ys=e,n}function yn(t){var e,r=mr(t);return r&&(e=r.href),e}function Oa(t){var e,r=mr(t);return r&&(e=r.pathname),e}function Sn(t,e){return t?t.toUpperCase()+" "+e:e}function mi(t,e){var r=In(t,e)||"";if(r){var n=r.match(/(www[0-9]?\.)?(.[^/:]+)(\:[\d]+)?/i);if(n!=null&&n.length>3&&U(n[2])&&n[2].length>0)return n[2]+(n[3]||"")}return r}function In(t,e){var r=null;if(t){var n=t.match(/(\w*):\/\/(.[^/:]+)(\:[\d]+)?/i);if(n!=null&&n.length>2&&U(n[2])&&n[2].length>0&&(r=n[2]||"",e&&n.length>2)){var i=(n[1]||"").toLowerCase(),a=n[3]||"";(i==="http"&&a===":80"||i==="https"&&a===":443")&&(a=""),r+=a}}return r}var xs,ys,al,za=I(()=>{X();xs=Ne()||{},ys=0,al=[null,null,null,null,null]});function Lr(t){return ol.indexOf(t.toLowerCase())!==-1}function Ss(t,e,r,n){var i,a=n,o=n;if(e&&e.length>0){var u=mr(e);if(i=u.host,!a)if(u.pathname!=null){var s=u.pathname.length===0?"/":u.pathname;s.charAt(0)!=="/"&&(s="/"+s),o=u.pathname,a=oe(t,r?r+" "+s:s)}else a=oe(t,e)}else i=n,a=n;return{target:i,name:a,data:o}}function gr(){var t=Qe();if(t&&t.now&&t.timing){var e=t.now()+t.timing.navigationStart;if(e>0)return e}return de()}function ve(t,e){var r=null;return t!==0&&e!==0&&!x(t)&&!x(e)&&(r=e-t),r}var ol,Cn,Ba,bt,Ha,Va=I(()=>{X();Aa();ct();Fa();pn();lt();Ua();za();ol=["https://dc.services.visualstudio.com/v2/track","https://breeze.aimon.applicationinsights.io/v2/track","https://dc-int.services.visualstudio.com/v2/track"];Cn={NotSpecified:le,createDomEvent:_t,disableStorage:mn,isInternalApplicationInsightsEndpoint:Lr,canUseLocalStorage:Mr,getStorage:gn,setStorage:vn,removeStorage:hn,canUseSessionStorage:wt,getSessionStorageKeys:_a,getSessionStorage:$t,setSessionStorage:Yt,removeSessionStorage:xn,disableCookies:ui,canUseCookies:Ia,disallowsSameSiteNone:ii,setCookie:Ta,stringToBoolOrDefault:ee,getCookie:Ca,deleteCookie:Ea,trim:se,newId:Xt,random32:function(){return Ct(!0)},generateW3CId:ze,isArray:Re,isError:qt,isDate:Pr,toISOStringForIE8:Me,getIEVersion:sr,msToTimeSpan:Ge,isCrossOriginError:fn,dump:O,getExceptionName:G,addEventHandler:Vt,IsBeaconApiSupported:Fr,getExtension:ln},Ba={parseUrl:mr,getAbsoluteUrl:yn,getPathName:Oa,getCompleteUrl:Sn,parseHost:mi,parseFullHost:In},bt={correlationIdPrefix:"cid-v1:",canIncludeCorrelationHeader:function(t,e,r){if(!e||t&&t.disableCorrelationHeaders)return!1;if(t&&t.correlationHeaderExcludePatterns){for(var n=0;n<t.correlationHeaderExcludePatterns.length;n++)if(t.correlationHeaderExcludePatterns[n].test(e))return!1}var i=mr(e).host.toLowerCase();if(i&&(i.indexOf(":443")!==-1||i.indexOf(":80")!==-1)&&(i=(In(e,!0)||"").toLowerCase()),(!t||!t.enableCorsCorrelation)&&i&&i!==r)return!1;var a=t&&t.correlationHeaderDomains;if(a){var o;if(R(a,function(c){var l=new RegExp(c.toLowerCase().replace(/\\/g,"\\\\").replace(/\./g,"\\.").replace(/\*/g,".*"));o=o||l.test(i)}),!o)return!1}var u=t&&t.correlationHeaderExcludedDomains;if(!u||u.length===0)return!0;for(var n=0;n<u.length;n++){var s=new RegExp(u[n].toLowerCase().replace(/\\/g,"\\\\").replace(/\./g,"\\.").replace(/\*/g,".*"));if(s.test(i))return!1}return i&&i.length>0},getCorrelationContext:function(t){if(t){var e=bt.getCorrelationContextValue(t,te.requestContextTargetKey);if(e&&e!==bt.correlationIdPrefix)return e}},getCorrelationContextValue:function(t,e){if(t)for(var r=t.split(","),n=0;n<r.length;++n){var i=r[n].split("=");if(i.length===2&&i[0]===e)return i[1]}}};Ha={Now:gr,GetDuration:ve}});function gi(t){if(!t)return{};var e=t.split(sl),r=Xr(e,function(i,a){var o=a.split(ul);if(o.length===2){var u=o[0].toLowerCase(),s=o[1];i[u]=s}return i},{});if(Ye(r).length>0){if(r.endpointsuffix){var n=r.location?r.location+".":"";r.ingestionendpoint=r.ingestionendpoint||"https://"+n+"dc."+r.endpointsuffix}r.ingestionendpoint=r.ingestionendpoint||dn}return r}var sl,ul,qa,Is=I(()=>{lt();X();sl=";",ul="=";qa={parse:gi}});var Tn,ja=I(()=>{Tn=function(){function t(){}return t}()});var En,Ga=I(()=>{ne();ja();En=function(t){z(e,t);function e(){return t.call(this)||this}return e}(Tn)});var Cs,Ts=I(()=>{Cs=function(){function t(){this.ver=1,this.sampleRate=100,this.tags={}}return t}()});var wn,Es=I(()=>{ne();Ts();ct();X();lt();wn=function(t){z(e,t);function e(r,n,i){var a=t.call(this)||this;return a.name=oe(r,i)||le,a.data=n,a.time=Me(new Date),a.aiDataContract={time:1,iKey:1,name:1,sampleRate:function(){return a.sampleRate===100?4:1},tags:1,data:1},a}return e}(Cs)});var vi,Ka=I(()=>{vi=function(){function t(){this.ver=2,this.properties={},this.measurements={}}return t}()});var Ve,ws=I(()=>{ne();Ka();ct();lt();Ve=function(t){z(e,t);function e(r,n,i,a){var o=t.call(this)||this;return o.aiDataContract={ver:1,name:1,properties:0,measurements:0},o.name=oe(r,n)||le,o.properties=Be(r,i),o.measurements=He(r,a),o}return e.envelopeType="Microsoft.ApplicationInsights.{0}.Event",e.dataType="EventData",e}(vi)});var bs,Ps=I(()=>{bs=function(){function t(){}return t}()});var As,Ds=I(()=>{As=function(){function t(){this.ver=2,this.exceptions=[],this.properties={},this.measurements={}}return t}()});var Ns,ks=I(()=>{Ns=function(){function t(){this.hasFullStack=!0,this.parsedStack=[]}return t}()});function Qa(t,e){var r=t;return r&&!U(r)&&(JSON&&JSON.stringify?(r=JSON.stringify(t),e&&(!r||r==="{}")&&(B(t.toString)?r=t.toString():r=""+t)):r=""+t+" - (Missing JSON.stringify)"),r||""}function _s(t,e){var r=t;return t&&(r=t[Ja]||t[Ls]||"",r&&!U(r)&&(r=Qa(r,!0)),t.filename&&(r=r+" @"+(t.filename||"")+":"+(t.lineno||"?")+":"+(t.colno||"?"))),e&&e!=="String"&&e!=="Object"&&e!=="Error"&&(r||"").indexOf(e)===-1&&(r=e+": "+r),r||""}function ll(t){return st(t)?"hasFullStack"in t&&"typeName"in t:!1}function fl(t){return st(t)?"ver"in t&&"exceptions"in t&&"properties"in t:!1}function Rs(t){return t&&t.src&&U(t.src)&&t.obj&&Re(t.obj)}function _r(t){var e=t||"";U(e)||(U(e[ft])?e=e[ft]:e=""+e);var r=e.split(`
`);return{src:e,obj:r}}function pl(t){for(var e=[],r=t.split(`
`),n=0;n<r.length;n++){var i=r[n];r[n+1]&&(i+="@"+r[n+1],n++),e.push(i)}return{src:t,obj:e}}function Us(t){var e=null;if(t)try{if(t[ft])e=_r(t[ft]);else if(t[Ur]&&t[Ur][ft])e=_r(t[Ur][ft]);else if(t.exception&&t.exception[ft])e=_r(t.exception[ft]);else if(Rs(t))e=t;else if(Rs(t[Xa]))e=t[Xa];else if(window.opera&&t[Ja])e=pl(t.message);else if(U(t))e=_r(t);else{var r=t[Ja]||t[Ls]||"";U(t[Fs])&&(r&&(r+=`
`),r+=" from "+t[Fs]),r&&(e=_r(r))}}catch(n){e=_r(n)}return e||{src:"",obj:null}}function dl(t){var e="";return t&&(t.obj?R(t.obj,function(r){e+=r+`
`}):e=t.src||""),e}function ml(t){var e,r=t.obj;if(r&&r.length>0){e=[];var n=0,i=0;R(r,function(E){var P=E.toString();if(Za.regex.test(P)){var p=new Za(P,n++);i+=p.sizeInBytes,e.push(p)}});var a=32*1024;if(i>a)for(var o=0,u=e.length-1,s=0,c=o,l=u;o<u;){var f=e[o].sizeInBytes,m=e[u].sizeInBytes;if(s+=f+m,s>a){var C=l-c+1;e.splice(c,C);break}c=o,l=u,o++,u--}}return e}function hi(t){var e="";if(t&&(e=t.typeName||t.name||"",!e))try{var r=/function (.{1,200})\(/,n=r.exec(t.constructor.toString());e=n&&n.length>1?n[1]:""}catch(i){}return e}function Wa(t){if(t)try{if(!U(t)){var e=hi(t),r=Qa(t,!1);return(!r||r==="{}")&&(t[Ur]&&(t=t[Ur],e=hi(t)),r=Qa(t,!0)),r.indexOf(e)!==0&&e!=="String"?e+":"+r:r}}catch(n){}return""+(t||"")}var cl,Ur,ft,Xa,Fs,Ja,Ls,he,Ms,Za,Os=I(()=>{ne();Ps();Ds();ks();ct();X();lt();cl="<no_method>",Ur="error",ft="stack",Xa="stackDetails",Fs="errorSrc",Ja="message",Ls="description";he=function(t){z(e,t);function e(r,n,i,a,o,u){var s=t.call(this)||this;return s.aiDataContract={ver:1,exceptions:1,severityLevel:0,properties:0,measurements:0},fl(n)?(s.exceptions=n.exceptions,s.properties=n.properties,s.measurements=n.measurements,n.severityLevel&&(s.severityLevel=n.severityLevel),n.id&&(s.id=n.id),n.problemGroup&&(s.problemGroup=n.problemGroup),s.ver=2,x(n.isManual)||(s.isManual=n.isManual)):(i||(i={}),s.exceptions=[new Ms(r,n,i)],s.properties=Be(r,i),s.measurements=He(r,a),o&&(s.severityLevel=o),u&&(s.id=u)),s}return e.CreateAutoException=function(r,n,i,a,o,u,s,c){var l=hi(o||u||r);return{message:_s(r,l),url:n,lineNumber:i,columnNumber:a,error:Wa(o||u||r),evt:Wa(u||r),typeName:l,stackDetails:Us(s||o||u),errorSrc:c}},e.CreateFromInterface=function(r,n,i,a){var o=n.exceptions&&jt(n.exceptions,function(s){return Ms.CreateFromInterface(r,s)}),u=new e(r,yt({},n,{exceptions:o}),i,a);return u},e.prototype.toInterface=function(){var r=this,n=r.exceptions,i=r.properties,a=r.measurements,o=r.severityLevel,u=r.ver,s=r.problemGroup,c=r.id,l=r.isManual,f=n instanceof Array&&jt(n,function(m){return m.toInterface()})||void 0;return{ver:"4.0",exceptions:f,severityLevel:o,properties:i,measurements:a,problemGroup:s,id:c,isManual:l}},e.CreateSimpleException=function(r,n,i,a,o,u){return{exceptions:[{hasFullStack:!0,message:r,stack:o,typeName:n}]}},e.envelopeType="Microsoft.ApplicationInsights.{0}.Exception",e.dataType="ExceptionData",e.formatError=Wa,e}(As),Ms=function(t){z(e,t);function e(r,n,i){var a=t.call(this)||this;if(a.aiDataContract={id:0,outerId:0,typeName:1,message:1,hasFullStack:0,stack:0,parsedStack:2},ll(n))a.typeName=n.typeName,a.message=n.message,a[ft]=n[ft],a.parsedStack=n.parsedStack,a.hasFullStack=n.hasFullStack;else{var o=n,u=o&&o.evt;qt(o)||(o=o[Ur]||u||o),a.typeName=oe(r,hi(o))||le,a.message=kr(r,_s(n||o,a.typeName))||le;var s=n[Xa]||Us(n);a.parsedStack=ml(s),a[ft]=li(r,dl(s)),a.hasFullStack=Re(a.parsedStack)&&a.parsedStack.length>0,i&&(i.typeName=i.typeName||a.typeName)}return a}return e.prototype.toInterface=function(){var r=this.parsedStack instanceof Array&&jt(this.parsedStack,function(i){return i.toInterface()}),n={id:this.id,outerId:this.outerId,typeName:this.typeName,message:this.message,hasFullStack:this.hasFullStack,stack:this[ft],parsedStack:r||void 0};return n},e.CreateFromInterface=function(r,n){var i=n.parsedStack instanceof Array&&jt(n.parsedStack,function(o){return Za.CreateFromInterface(o)})||n.parsedStack,a=new e(r,yt({},n,{parsedStack:i}));return a},e}(Ns),Za=function(t){z(e,t);function e(r,n){var i=t.call(this)||this;if(i.sizeInBytes=0,i.aiDataContract={level:1,method:1,assembly:0,fileName:0,line:0},typeof r=="string"){var a=r;i.level=n,i.method=cl,i.assembly=se(a),i.fileName="",i.line=0;var o=a.match(e.regex);o&&o.length>=5&&(i.method=se(o[2])||i.method,i.fileName=se(o[4]),i.line=parseInt(o[5])||0)}else i.level=r.level,i.method=r.method,i.assembly=r.assembly,i.fileName=r.fileName,i.line=r.line,i.sizeInBytes=0;return i.sizeInBytes+=i.method.length,i.sizeInBytes+=i.fileName.length,i.sizeInBytes+=i.assembly.length,i.sizeInBytes+=e.baseSize,i.sizeInBytes+=i.level.toString().length,i.sizeInBytes+=i.line.toString().length,i}return e.CreateFromInterface=function(r){return new e(r,null)},e.prototype.toInterface=function(){return{level:this.level,method:this.method,assembly:this.assembly,fileName:this.fileName,line:this.line}},e.regex=/^([\s]+at)?[\s]{0,50}([^\@\()]+?)[\s]{0,50}(\@|\()([^\(\n]+):([0-9]+):([0-9]+)(\)?)$/,e.baseSize=58,e}(bs)});var zs,Bs=I(()=>{zs=function(){function t(){this.ver=2,this.metrics=[],this.properties={},this.measurements={}}return t}()});var xi,Hs=I(()=>{(function(t){t[t.Measurement=0]="Measurement",t[t.Aggregation=1]="Aggregation"})(xi||(xi={}))});var Vs,qs=I(()=>{Hs();Vs=function(){function t(){this.kind=xi.Measurement}return t}()});var js,Gs=I(()=>{ne();qs();js=function(t){z(e,t);function e(){var r=t!==null&&t.apply(this,arguments)||this;return r.aiDataContract={name:1,kind:0,value:1,count:0,min:0,max:0,stdDev:0},r}return e}(Vs)});var qe,Ks=I(()=>{ne();Bs();ct();Gs();lt();qe=function(t){z(e,t);function e(r,n,i,a,o,u,s,c){var l=t.call(this)||this;l.aiDataContract={ver:1,metrics:1,properties:0};var f=new js;return f.count=a>0?a:void 0,f.max=isNaN(u)||u===null?void 0:u,f.min=isNaN(o)||o===null?void 0:o,f.name=oe(r,n)||le,f.value=i,l.metrics=[f],l.properties=Be(r,s),l.measurements=He(r,c),l}return e.envelopeType="Microsoft.ApplicationInsights.{0}.Metric",e.dataType="MetricData",e}(zs)});var vr,yi=I(()=>{ne();Ka();vr=function(t){z(e,t);function e(){var r=t.call(this)||this;return r.ver=2,r.properties={},r.measurements={},r}return e}(vi)});var ke,Ws=I(()=>{ne();yi();ct();pn();lt();ke=function(t){z(e,t);function e(r,n,i,a,o,u,s){var c=t.call(this)||this;return c.aiDataContract={ver:1,name:0,url:0,duration:0,properties:0,measurements:0,id:0},c.id=fi(r,s),c.url=Tt(r,i),c.name=oe(r,n)||le,isNaN(a)||(c.duration=Ge(a)),c.properties=Be(r,o),c.measurements=He(r,u),c}return e.envelopeType="Microsoft.ApplicationInsights.{0}.Pageview",e.dataType="PageviewData",e}(vr)});var Xs,Js=I(()=>{Xs=function(){function t(){this.ver=2,this.success=!0,this.properties={},this.measurements={}}return t}()});var je,Qs=I(()=>{ne();ct();Va();Js();pn();je=function(t){z(e,t);function e(r,n,i,a,o,u,s,c,l,f,m,C){l===void 0&&(l="Ajax");var E=t.call(this)||this;E.aiDataContract={id:1,ver:1,name:0,resultCode:0,duration:0,success:0,data:0,target:0,type:0,properties:0,measurements:0,kind:0,value:0,count:0,min:0,max:0,stdDev:0,dependencyKind:0,dependencySource:0,commandName:0,dependencyTypeName:0},E.id=n,E.duration=Ge(o),E.success=u,E.resultCode=s+"",E.type=oe(r,l);var P=Ss(r,i,c,a);return E.data=Tt(r,a)||P.data,E.target=oe(r,P.target),f&&(E.target=E.target+" | "+f),E.name=oe(r,P.name),E.properties=Be(r,m),E.measurements=He(r,C),E}return e.envelopeType="Microsoft.ApplicationInsights.{0}.RemoteDependency",e.dataType="RemoteDependencyData",e}(Xs)});var Zs,$s=I(()=>{Zs=function(){function t(){this.ver=2,this.properties={},this.measurements={}}return t}()});var Ze,Ys=I(()=>{ne();$s();ct();lt();Ze=function(t){z(e,t);function e(r,n,i,a,o){var u=t.call(this)||this;return u.aiDataContract={ver:1,message:1,severityLevel:0,properties:0},n=n||le,u.message=kr(r,n),u.properties=Be(r,a),u.measurements=He(r,o),i&&(u.severityLevel=i),u}return e.envelopeType="Microsoft.ApplicationInsights.{0}.Message",e.dataType="MessageData",e}(Zs)});var eu,tu=I(()=>{ne();yi();eu=function(t){z(e,t);function e(){var r=t.call(this)||this;return r.ver=2,r.properties={},r.measurements={},r}return e}(vr)});var $e,ru=I(()=>{ne();tu();ct();lt();$e=function(t){z(e,t);function e(r,n,i,a,o,u,s){var c=t.call(this)||this;return c.aiDataContract={ver:1,name:0,url:0,duration:0,perfTotal:0,networkConnect:0,sentRequest:0,receivedResponse:0,domProcessing:0,properties:0,measurements:0},c.url=Tt(r,i),c.name=oe(r,n)||le,c.properties=Be(r,o),c.measurements=He(r,u),s&&(c.domProcessing=s.domProcessing,c.duration=s.duration,c.networkConnect=s.networkConnect,c.perfTotal=s.perfTotal,c.receivedResponse=s.receivedResponse,c.sentRequest=s.sentRequest),c}return e.envelopeType="Microsoft.ApplicationInsights.{0}.PageviewPerformance",e.dataType="PageviewPerformanceData",e}(eu)});var xt,nu=I(()=>{ne();Ga();xt=function(t){z(e,t);function e(r,n){var i=t.call(this)||this;return i.aiDataContract={baseType:1,baseData:1},i.baseType=r,i.baseData=n,i}return e}(En)});var Ot,iu=I(()=>{(function(t){t[t.Verbose=0]="Verbose",t[t.Information=1]="Information",t[t.Warning=2]="Warning",t[t.Error=3]="Error",t[t.Critical=4]="Critical"})(Ot||(Ot={}))});var $a,au=I(()=>{X();$a=function(){function t(){}return t.getConfig=function(e,r,n,i){i===void 0&&(i=!1);var a;return n&&e.extensionConfig&&e.extensionConfig[n]&&!x(e.extensionConfig[n][r])?a=e.extensionConfig[n][r]:a=e[r],x(a)?i:a},t}()});function tr(t){var e="ai."+t+".";return function(r){return e+r}}var bn,Pe,Si,Or,Ya,er,hr,Pn,xr,eo=I(()=>{ne();X();bn=tr("application"),Pe=tr("device"),Si=tr("location"),Or=tr("operation"),Ya=tr("session"),er=tr("user"),hr=tr("cloud"),Pn=tr("internal"),xr=function(t){z(e,t);function e(){return t.call(this)||this}return e}(Wi({applicationVersion:bn("ver"),applicationBuild:bn("build"),applicationTypeId:bn("typeId"),applicationId:bn("applicationId"),applicationLayer:bn("layer"),deviceId:Pe("id"),deviceIp:Pe("ip"),deviceLanguage:Pe("language"),deviceLocale:Pe("locale"),deviceModel:Pe("model"),deviceFriendlyName:Pe("friendlyName"),deviceNetwork:Pe("network"),deviceNetworkName:Pe("networkName"),deviceOEMName:Pe("oemName"),deviceOS:Pe("os"),deviceOSVersion:Pe("osVersion"),deviceRoleInstance:Pe("roleInstance"),deviceRoleName:Pe("roleName"),deviceScreenResolution:Pe("screenResolution"),deviceType:Pe("type"),deviceMachineName:Pe("machineName"),deviceVMName:Pe("vmName"),deviceBrowser:Pe("browser"),deviceBrowserVersion:Pe("browserVersion"),locationIp:Si("ip"),locationCountry:Si("country"),locationProvince:Si("province"),locationCity:Si("city"),operationId:Or("id"),operationName:Or("name"),operationParentId:Or("parentId"),operationRootId:Or("rootId"),operationSyntheticSource:Or("syntheticSource"),operationCorrelationVector:Or("correlationVector"),sessionId:Ya("id"),sessionIsFirst:Ya("isFirst"),sessionIsNew:Ya("isNew"),userAccountAcquisitionDate:er("accountAcquisitionDate"),userAccountId:er("accountId"),userAgent:er("userAgent"),userId:er("id"),userStoreRegion:er("storeRegion"),userAuthUserId:er("authUserId"),userAnonymousUserAcquisitionDate:er("anonUserAcquisitionDate"),userAuthenticatedUserAcquisitionDate:er("authUserAcquisitionDate"),cloudName:hr("name"),cloudRole:hr("role"),cloudRoleVer:hr("roleVer"),cloudRoleInstance:hr("roleInstance"),cloudEnvironment:hr("environment"),cloudLocation:hr("location"),cloudDeploymentUnit:hr("deploymentUnit"),internalNodeName:Pn("nodeName"),internalSdkVersion:Pn("sdkVersion"),internalAgentVersion:Pn("agentVersion"),internalSnippet:Pn("snippet"),internalSdkSrc:Pn("sdkSrc")}))});var rt,ou=I(()=>{ct();X();lt();rt=function(){function t(){}return t.create=function(e,r,n,i,a,o){if(n=oe(i,n)||le,x(e)||x(r)||x(n))throw Error("Input doesn't contain all required fields");var u={name:n,time:Me(new Date),iKey:"",ext:o||{},tags:[],data:{},baseType:r,baseData:e};return x(a)||Y(a,function(s,c){u.data[s]=c}),u},t}()});var Ue,re,su=I(()=>{eo();Ue={UserExt:"user",DeviceExt:"device",TraceExt:"trace",WebExt:"web",AppExt:"app",OSExt:"os",SessionExt:"ses",SDKExt:"sdk"},re=new xr});var zt,zr,Ii,xe=I(()=>{Va();Is();Aa();lt();Ga();ja();Es();ws();Os();Ks();Ws();yi();Qs();Ys();ru();nu();iu();au();eo();ct();ou();su();Ra();pn();Fa();Ua();za();zt="AppInsightsPropertiesPlugin",zr="AppInsightsChannelPlugin",Ii="ApplicationInsightsAnalytics"});var uu,cu=I(()=>{xe();X();Te();uu=function(){function t(e,r,n,i){W(t,this,function(a){var o=null,u=[],s=!1,c;n&&(c=n.logger);function l(){n&&R(n.getTransmissionControls(),function(m){R(m,function(C){return C.flush(!0)})})}function f(m){u.push(m),o||(o=setInterval(function(){var C=u.slice(0),E=!1;u=[],R(C,function(P){P()?E=!0:u.push(P)}),u.length===0&&(clearInterval(o),o=null),E&&l()},100))}a.trackPageView=function(m,C){var E=m.name;if(x(E)||typeof E!="string"){var P=Ne();E=m.name=P&&P.title||""}var p=m.uri;if(x(p)||typeof p!="string"){var v=et();p=m.uri=v&&v.href||""}if(!i.isPerformanceTimingSupported()){e.sendPageViewInternal(m,C),l(),c.throwInternal(S.WARNING,h.NavigationTimingNotSupported,"trackPageView: navigation timing API used for calculation of page duration is not supported in this browser. This page view will be collected without duration and timing info.");return}var y=!1,w,L=i.getPerformanceTiming().navigationStart;L>0&&(w=ve(L,+new Date),i.shouldCollectDuration(w)||(w=void 0));var k;!x(C)&&!x(C.duration)&&(k=C.duration),(r||!isNaN(k))&&(isNaN(k)&&(C||(C={}),C.duration=w),e.sendPageViewInternal(m,C),l(),y=!0);var Q=6e4;C||(C={}),f(function(){var Se=!1;try{if(i.isPerformanceTimingDataReady()){Se=!0;var J={name:E,uri:p};i.populatePageViewPerformanceEvent(J),!J.isValid&&!y?(C.duration=w,e.sendPageViewInternal(m,C)):(y||(C.duration=J.durationMs,e.sendPageViewInternal(m,C)),s||(e.sendPageViewPerformanceInternal(J,C),s=!0))}else L>0&&ve(L,+new Date)>Q&&(Se=!0,y||(C.duration=Q,e.sendPageViewInternal(m,C)))}catch(me){c.throwInternal(S.CRITICAL,h.TrackPVFailedCalc,"trackPageView failed on page load calculation: "+G(me),{exception:O(me)})}return Se})}})}return t}()});var lu,gl,fu=I(()=>{xe();X();lu=function(){function t(e,r){this.prevPageVisitDataKeyName="prevPageVisitData",this.pageVisitTimeTrackingHandler=r,this._logger=e}return t.prototype.trackPreviousPageVisit=function(e,r){try{var n=this.restartPageVisitTimer(e,r);n&&this.pageVisitTimeTrackingHandler(n.pageName,n.pageUrl,n.pageVisitTime)}catch(i){this._logger.warnToConsole("Auto track page visit time failed, metric will not be collected: "+O(i))}},t.prototype.restartPageVisitTimer=function(e,r){try{var n=this.stopPageVisitTimer();return this.startPageVisitTimer(e,r),n}catch(i){return this._logger.warnToConsole("Call to restart failed: "+O(i)),null}},t.prototype.startPageVisitTimer=function(e,r){try{if(wt()){$t(this._logger,this.prevPageVisitDataKeyName)!=null&&De("Cannot call startPageVisit consecutively without first calling stopPageVisit");var n=new gl(e,r),i=be().stringify(n);Yt(this._logger,this.prevPageVisitDataKeyName,i)}}catch(a){this._logger.warnToConsole("Call to start failed: "+O(a))}},t.prototype.stopPageVisitTimer=function(){try{if(wt()){var e=de(),r=$t(this._logger,this.prevPageVisitDataKeyName);if(r&&vt()){var n=be().parse(r);return n.pageVisitTime=e-n.pageVisitStartTime,xn(this._logger,this.prevPageVisitDataKeyName),n}else return null}return null}catch(i){return this._logger.warnToConsole("Stop page visit timer failed: "+O(i)),null}},t}(),gl=function(){function t(e,r){this.pageVisitStartTime=de(),this.pageName=e,this.pageUrl=r}return t}()});var pu,du=I(()=>{xe();X();pu=function(){function t(e){this.MAX_DURATION_ALLOWED=36e5,e&&(this._logger=e.logger)}return t.prototype.populatePageViewPerformanceEvent=function(e){e.isValid=!1;var r=this.getPerformanceNavigationTiming(),n=this.getPerformanceTiming(),i=0,a=0,o=0,u=0,s=0;(r||n)&&(r?(i=r.duration,a=r.startTime===0?r.connectEnd:ve(r.startTime,r.connectEnd),o=ve(r.requestStart,r.responseStart),u=ve(r.responseStart,r.responseEnd),s=ve(r.responseEnd,r.loadEventEnd)):(i=ve(n.navigationStart,n.loadEventEnd),a=ve(n.navigationStart,n.connectEnd),o=ve(n.requestStart,n.responseStart),u=ve(n.responseStart,n.responseEnd),s=ve(n.responseEnd,n.loadEventEnd)),i===0?this._logger.throwInternal(S.WARNING,h.ErrorPVCalc,"error calculating page view performance.",{total:i,network:a,request:o,response:u,dom:s}):this.shouldCollectDuration(i,a,o,u,s)?i<Math.floor(a)+Math.floor(o)+Math.floor(u)+Math.floor(s)?this._logger.throwInternal(S.WARNING,h.ClientPerformanceMathError,"client performance math error.",{total:i,network:a,request:o,response:u,dom:s}):(e.durationMs=i,e.perfTotal=e.duration=Ge(i),e.networkConnect=Ge(a),e.sentRequest=Ge(o),e.receivedResponse=Ge(u),e.domProcessing=Ge(s),e.isValid=!0):this._logger.throwInternal(S.WARNING,h.InvalidDurationValue,"Invalid page load duration value. Browser perf data won't be sent.",{total:i,network:a,request:o,response:u,dom:s}))},t.prototype.getPerformanceTiming=function(){return this.isPerformanceTimingSupported()?Qe().timing:null},t.prototype.getPerformanceNavigationTiming=function(){return this.isPerformanceNavigationTimingSupported()?Qe().getEntriesByType("navigation")[0]:null},t.prototype.isPerformanceNavigationTimingSupported=function(){var e=Qe();return e&&e.getEntriesByType&&e.getEntriesByType("navigation").length>0},t.prototype.isPerformanceTimingSupported=function(){var e=Qe();return e&&e.timing},t.prototype.isPerformanceTimingDataReady=function(){var e=Qe(),r=e?e.timing:0;return r&&r.domainLookupStart>0&&r.navigationStart>0&&r.responseStart>0&&r.requestStart>0&&r.loadEventEnd>0&&r.responseEnd>0&&r.connectEnd>0&&r.domLoading>0},t.prototype.shouldCollectDuration=function(){for(var e=[],r=0;r<arguments.length;r++)e[r]=arguments[r];var n=_e()||{},i=["googlebot","adsbot-google","apis-google","mediapartners-google"],a=n.userAgent,o=!1;if(a)for(var u=0;u<i.length;u++)o=o||a.toLowerCase().indexOf(i[u])!==-1;if(o)return!1;for(var u=0;u<e.length;u++)if(e[u]<0||e[u]>=this.MAX_DURATION_ALLOWED)return!1;return!0},t}()});function An(t,e){t&&t.dispatchEvent&&e&&t.dispatchEvent(e)}var mu,to,Dn,gu,vu=I(()=>{ne();xe();X();cu();fu();du();Te();mu="duration",to="event";Dn=function(t){z(e,t);function e(){var r=t.call(this)||this;r.identifier=Ii,r.priority=180,r.autoRoutePVDelay=500;var n,i,a,o=0,u,s;return W(e,r,function(c,l){var f=et(!0);u=f&&f.href||"",c.getCookieMgr=function(){return lr(c.core)},c.processTelemetry=function(p,v){ut(c.core,function(){return c.identifier+":processTelemetry"},function(){var y=!1,w=c._telemetryInitializers.length;v=c._getTelCtx(v);for(var L=0;L<w;++L){var k=c._telemetryInitializers[L];if(k)try{if(k.apply(null,[p])===!1){y=!0;break}}catch(Q){v.diagLog().throwInternal(S.CRITICAL,h.TelemetryInitializerFailed,"One of telemetry initializers failed, telemetry item will not be sent: "+G(Q),{exception:O(Q)},!0)}}y||c.processNext(p,v)},function(){return{item:p}},!p.sync)},c.trackEvent=function(p,v){try{var y=rt.create(p,Ve.dataType,Ve.envelopeType,c.diagLog(),v);c.core.track(y)}catch(w){c.diagLog().throwInternal(S.WARNING,h.TrackTraceFailed,"trackTrace failed, trace will not be collected: "+G(w),{exception:O(w)})}},c.startTrackEvent=function(p){try{n.start(p)}catch(v){c.diagLog().throwInternal(S.CRITICAL,h.StartTrackEventFailed,"startTrackEvent failed, event will not be collected: "+G(v),{exception:O(v)})}},c.stopTrackEvent=function(p,v,y){try{n.stop(p,void 0,v)}catch(w){c.diagLog().throwInternal(S.CRITICAL,h.StopTrackEventFailed,"stopTrackEvent failed, event will not be collected: "+G(w),{exception:O(w)})}},c.trackTrace=function(p,v){try{var y=rt.create(p,Ze.dataType,Ze.envelopeType,c.diagLog(),v);c.core.track(y)}catch(w){c.diagLog().throwInternal(S.WARNING,h.TrackTraceFailed,"trackTrace failed, trace will not be collected: "+G(w),{exception:O(w)})}},c.trackMetric=function(p,v){try{var y=rt.create(p,qe.dataType,qe.envelopeType,c.diagLog(),v);c.core.track(y)}catch(w){c.diagLog().throwInternal(S.CRITICAL,h.TrackMetricFailed,"trackMetric failed, metric will not be collected: "+G(w),{exception:O(w)})}},c.trackPageView=function(p,v){try{var y=p||{};c._pageViewManager.trackPageView(y,yt({},y.properties,y.measurements,v)),c.config.autoTrackPageVisitTime&&c._pageVisitTimeManager.trackPreviousPageVisit(y.name,y.uri)}catch(w){c.diagLog().throwInternal(S.CRITICAL,h.TrackPVFailed,"trackPageView failed, page view will not be collected: "+G(w),{exception:O(w)})}},c.sendPageViewInternal=function(p,v,y){var w=Ne();w&&(p.refUri=p.refUri===void 0?w.referrer:p.refUri);var L=rt.create(p,ke.dataType,ke.envelopeType,c.diagLog(),v,y);c.core.track(L),o=0},c.sendPageViewPerformanceInternal=function(p,v,y){var w=rt.create(p,$e.dataType,$e.envelopeType,c.diagLog(),v,y);c.core.track(w)},c.trackPageViewPerformance=function(p,v){try{c._pageViewPerformanceManager.populatePageViewPerformanceEvent(p),c.sendPageViewPerformanceInternal(p,v)}catch(y){c.diagLog().throwInternal(S.CRITICAL,h.TrackPVFailed,"trackPageViewPerformance failed, page view will not be collected: "+G(y),{exception:O(y)})}},c.startTrackPage=function(p){try{if(typeof p!="string"){var v=Ne();p=v&&v.title||""}i.start(p)}catch(y){c.diagLog().throwInternal(S.CRITICAL,h.StartTrackFailed,"startTrackPage failed, page view may not be collected: "+G(y),{exception:O(y)})}},c.stopTrackPage=function(p,v,y,w){try{if(typeof p!="string"){var L=Ne();p=L&&L.title||""}if(typeof v!="string"){var k=et();v=k&&k.href||""}i.stop(p,v,y,w),c.config.autoTrackPageVisitTime&&c._pageVisitTimeManager.trackPreviousPageVisit(p,v)}catch(Q){c.diagLog().throwInternal(S.CRITICAL,h.StopTrackFailed,"stopTrackPage failed, page view will not be collected: "+G(Q),{exception:O(Q)})}},c.sendExceptionInternal=function(p,v,y){var w=p.exception||p.error||new Error(le),L=new he(c.diagLog(),w,p.properties||v,p.measurements,p.severityLevel,p.id).toInterface(),k=rt.create(L,he.dataType,he.envelopeType,c.diagLog(),v,y);c.core.track(k)},c.trackException=function(p,v){try{c.sendExceptionInternal(p,v)}catch(y){c.diagLog().throwInternal(S.CRITICAL,h.TrackExceptionFailed,"trackException failed, exception will not be collected: "+G(y),{exception:O(y)})}},c._onerror=function(p){var v=p&&p.error,y=p&&p.evt;try{if(!y){var w=It();w&&(y=w[to])}var L=p&&p.url||(Ne()||{}).URL,k=p.errorSrc||"window.onerror@"+L+":"+(p.lineNumber||0)+":"+(p.columnNumber||0),Q={errorSrc:k,url:L,lineNumber:p.lineNumber||0,columnNumber:p.columnNumber||0,message:p.message};fn(p.message,p.url,p.lineNumber,p.columnNumber,p.error)?P(he.CreateAutoException("Script error: The browser's same-origin policy prevents us from getting the details of this exception. Consider using the 'crossorigin' attribute.",L,p.lineNumber||0,p.columnNumber||0,v,y,null,k),Q):(p.errorSrc||(p.errorSrc=k),c.trackException({exception:p,severityLevel:Ot.Error},Q))}catch(J){var Se=v?v.name+", "+v.message:"null";c.diagLog().throwInternal(S.CRITICAL,h.ExceptionWhileLoggingError,"_onError threw exception while logging error, error will not be collected: "+G(J),{exception:O(J),errorString:Se})}},c.addTelemetryInitializer=function(p){c._telemetryInitializers.push(p)},c.initialize=function(p,v,y,w){if(!c.isInitialized()){if(x(v))throw Error("Error initializing");l.initialize(p,v,y,w),c.setInitialized(!1);var L=c._getTelCtx(),k=c.identifier;c.config=L.getExtCfg(k);var Q=e.getDefaultConfig(p);Q!==void 0&&Y(Q,function(A,H){c.config[A]=L.getConfig(k,A,H),c.config[A]===void 0&&(c.config[A]=H)}),c.config.isStorageUseDisabled&&mn();var Se={instrumentationKey:function(){return p.instrumentationKey},accountId:function(){return c.config.accountId||p.accountId},sessionRenewalMs:function(){return c.config.sessionRenewalMs||p.sessionRenewalMs},sessionExpirationMs:function(){return c.config.sessionExpirationMs||p.sessionExpirationMs},sampleRate:function(){return c.config.samplingPercentage||p.samplingPercentage},sdkExtension:function(){return c.config.sdkExtension||p.sdkExtension},isBrowserLinkTrackingEnabled:function(){return c.config.isBrowserLinkTrackingEnabled||p.isBrowserLinkTrackingEnabled},appId:function(){return c.config.appId||p.appId}};c._pageViewPerformanceManager=new pu(c.core),c._pageViewManager=new uu(r,c.config.overridePageViewDuration,c.core,c._pageViewPerformanceManager),c._pageVisitTimeManager=new lu(c.diagLog(),function(A,H,_){return m(A,H,_)}),c._telemetryInitializers=c._telemetryInitializers||[],C(Se),n=new gu(c.diagLog(),"trackEvent"),n.action=function(A,H,_,j){j||(j={}),j[mu]=_.toString(),c.trackEvent({name:A,properties:j})},i=new gu(c.diagLog(),"trackPageView"),i.action=function(A,H,_,j,Z){x(j)&&(j={}),j[mu]=_.toString();var ie={name:A,uri:H,properties:j,measurements:Z};c.sendPageViewInternal(ie,j)};var J=It(),me=$i(),Ae=et(!0),pt=r;if(c.config.disableExceptionTracking===!1&&!c.config.autoExceptionInstrumented&&J){var at="onerror",dt=J[at];J.onerror=function(A,H,_,j,Z){var ie=J[to],Bt=dt&&dt(A,H,_,j,Z);return Bt!==!0&&pt._onerror(he.CreateAutoException(A,H,_,j,Z,ie)),Bt},c.config.autoExceptionInstrumented=!0}if(c.config.disableExceptionTracking===!1&&c.config.enableUnhandledPromiseRejectionTracking===!0&&!c.config.autoUnhandledPromiseInstrumented&&J){var d="onunhandledrejection",T=J[d];J[d]=function(A){var H=J[to],_=T&&T.call(J,A);return _!==!0&&pt._onerror(he.CreateAutoException(A.reason.toString(),Ae?Ae.href:"",0,0,A,H)),_},c.config.autoUnhandledPromiseInstrumented=!0}if(c.config.enableAutoRouteTracking===!0&&me&&B(me.pushState)&&B(me.replaceState)&&J&&typeof Event!="undefined"){var D=r;R(y,function(A){A.identifier===zt&&(a=A)}),me.pushState=function(A){return function(){var _=A.apply(this,arguments);return An(J,_t(D.config.namePrefix+"pushState")),An(J,_t(D.config.namePrefix+"locationchange")),_}}(me.pushState),me.replaceState=function(A){return function(){var _=A.apply(this,arguments);return An(J,_t(D.config.namePrefix+"replaceState")),An(J,_t(D.config.namePrefix+"locationchange")),_}}(me.replaceState),J.addEventListener&&(J.addEventListener(D.config.namePrefix+"popstate",function(){An(J,_t(D.config.namePrefix+"locationchange"))}),J.addEventListener(D.config.namePrefix+"locationchange",function(){if(a&&a.context&&a.context.telemetryTrace){a.context.telemetryTrace.traceID=ze();var A="_unknown_";Ae&&Ae.pathname&&(A=Ae.pathname+(Ae.hash||"")),a.context.telemetryTrace.name=A}s&&(u=s),s=Ae&&Ae.href||"",setTimeout(function(H){D.trackPageView({refUri:H,properties:{duration:0}})}.bind(r,u),D.autoRoutePVDelay)}))}c.setInitialized(!0)}};function m(p,v,y){var w={PageName:p,PageUrl:v};c.trackMetric({name:"PageVisitTime",average:y,max:y,min:y,sampleCount:1},w)}function C(p){if(!p.isBrowserLinkTrackingEnabled()){var v=["/browserLinkSignalR/","/__browserLink/"],y=function(w){if(w.baseType===je.dataType){var L=w.baseData;if(L){for(var k=0;k<v.length;k++)if(L.target&&L.target.indexOf(v[k])>=0)return!1}}return!0};E(y)}}function E(p){c._telemetryInitializers.push(p)}function P(p,v){var y=rt.create(p,he.dataType,he.envelopeType,c.diagLog(),v);c.core.track(y)}}),r}return e.getDefaultConfig=function(r){return r||(r={}),r.sessionRenewalMs=30*60*1e3,r.sessionExpirationMs=24*60*60*1e3,r.disableExceptionTracking=ee(r.disableExceptionTracking),r.autoTrackPageVisitTime=ee(r.autoTrackPageVisitTime),r.overridePageViewDuration=ee(r.overridePageViewDuration),r.enableUnhandledPromiseRejectionTracking=ee(r.enableUnhandledPromiseRejectionTracking),(isNaN(r.samplingPercentage)||r.samplingPercentage<=0||r.samplingPercentage>=100)&&(r.samplingPercentage=100),r.isStorageUseDisabled=ee(r.isStorageUseDisabled),r.isBrowserLinkTrackingEnabled=ee(r.isBrowserLinkTrackingEnabled),r.enableAutoRouteTracking=ee(r.enableAutoRouteTracking),r.namePrefix=r.namePrefix||"",r.enableDebug=ee(r.enableDebug),r.disableFlushOnBeforeUnload=ee(r.disableFlushOnBeforeUnload),r.disableFlushOnUnload=ee(r.disableFlushOnUnload,r.disableFlushOnBeforeUnload),r},e.Version="2.6.4",e}(tt),gu=function(){function t(e,r){var n=this,i={};n.start=function(a){typeof i[a]!="undefined"&&e.throwInternal(S.WARNING,h.StartCalledMoreThanOnce,"start was called more than once for this event without calling stop.",{name:a,key:a},!0),i[a]=+new Date},n.stop=function(a,o,u,s){var c=i[a];if(isNaN(c))e.throwInternal(S.WARNING,h.StopCalledWithoutStart,"stop was called without a corresponding start.",{name:a,key:a},!0);else{var l=+new Date,f=ve(c,l);n.action(a,o,f,u,s)}delete i[a],i[a]=void 0}}return t}()});var ro=I(()=>{vu()});var hu,xu,yu=I(()=>{xe();X();Te();hu=function(){function t(e){var r=[];W(t,this,function(n){n.enqueue=function(i){r.push(i)},n.count=function(){return r.length},n.clear=function(){r.length=0},n.getItems=function(){return r.slice(0)},n.batchPayloads=function(i){if(i&&i.length>0){var a=e.emitLineDelimitedJson()?i.join(`
`):"["+i.join(",")+"]";return a}return null},n.markAsSent=function(i){n.clear()},n.clearSent=function(i){}})}return t}(),xu=function(){function t(e,r){var n=!1,i;W(t,this,function(a){var o=c(t.BUFFER_KEY),u=c(t.SENT_BUFFER_KEY);i=o.concat(u),i.length>t.MAX_BUFFER_SIZE&&(i.length=t.MAX_BUFFER_SIZE),l(t.SENT_BUFFER_KEY,[]),l(t.BUFFER_KEY,i),a.enqueue=function(f){if(i.length>=t.MAX_BUFFER_SIZE){n||(e.throwInternal(S.WARNING,h.SessionStorageBufferFull,"Maximum buffer size reached: "+i.length,!0),n=!0);return}i.push(f),l(t.BUFFER_KEY,i)},a.count=function(){return i.length},a.clear=function(){i=[],l(t.BUFFER_KEY,[]),l(t.SENT_BUFFER_KEY,[]),n=!1},a.getItems=function(){return i.slice(0)},a.batchPayloads=function(f){if(f&&f.length>0){var m=r.emitLineDelimitedJson()?f.join(`
`):"["+f.join(",")+"]";return m}return null},a.markAsSent=function(f){i=s(f,i),l(t.BUFFER_KEY,i);var m=c(t.SENT_BUFFER_KEY);m instanceof Array&&f instanceof Array&&(m=m.concat(f),m.length>t.MAX_BUFFER_SIZE&&(e.throwInternal(S.CRITICAL,h.SessionStorageBufferFull,"Sent buffer reached its maximum size: "+m.length,!0),m.length=t.MAX_BUFFER_SIZE),l(t.SENT_BUFFER_KEY,m))},a.clearSent=function(f){var m=c(t.SENT_BUFFER_KEY);m=s(f,m),l(t.SENT_BUFFER_KEY,m)};function s(f,m){var C=[];return R(m,function(E){!B(E)&&kt(f,E)===-1&&C.push(E)}),C}function c(f){var m=f;try{m=r.namePrefix&&r.namePrefix()?r.namePrefix()+"_"+m:m;var C=$t(e,m);if(C){var E=be().parse(C);if(U(E)&&(E=be().parse(E)),E&&Re(E))return E}}catch(P){e.throwInternal(S.CRITICAL,h.FailedToRestoreStorageBuffer," storage key: "+m+", "+G(P),{exception:O(P)})}return[]}function l(f,m){var C=f;try{C=r.namePrefix&&r.namePrefix()?r.namePrefix()+"_"+C:C;var E=JSON.stringify(m);Yt(e,C,E)}catch(P){Yt(e,C,JSON.stringify([])),e.throwInternal(S.WARNING,h.FailedToSetStorageBuffer," storage key: "+C+", "+G(P)+". Buffer cleared",{exception:O(P)})}}})}return t.BUFFER_KEY="AI_buffer",t.SENT_BUFFER_KEY="AI_sentBuffer",t.MAX_BUFFER_SIZE=2e3,t}()});function ye(t,e,r){return K(t,e,r,Ar)}var no,ue,Fe,Su,fe,Iu,io,Cu,Tu,Eu,wu,bu,Pu=I(()=>{ne();xe();X();no="baseType",ue="baseData",Fe="properties",Su="true";fe=function(){function t(){}return t.extractPropsAndMeasurements=function(e,r,n){x(e)||Y(e,function(i,a){ar(a)?n[i]=a:U(a)?r[i]=a:vt()&&(r[i]=be().stringify(a))})},t.createEnvelope=function(e,r,n,i){var a=new wn(e,i,r);ye(a,"sampleRate",n[fr]),(n[ue]||{}).startTime&&(a.time=Me(n[ue].startTime)),a.iKey=n.iKey;var o=n.iKey.replace(/-/g,"");return a.name=a.name.replace("{0}",o),t.extractPartAExtensions(n,a),n.tags=n.tags||[],Xn(a)},t.extractPartAExtensions=function(e,r){var n=r.tags=r.tags||{},i=e.ext=e.ext||{},a=e.tags=e.tags||[],o=i.user;o&&(ye(n,re.userAuthUserId,o.authId),ye(n,re.userId,o.id||o.localId));var u=i.app;u&&ye(n,re.sessionId,u.sesId);var s=i.device;s&&(ye(n,re.deviceId,s.id||s.localId),ye(n,re.deviceType,s.deviceClass),ye(n,re.deviceIp,s.ip),ye(n,re.deviceModel,s.model),ye(n,re.deviceType,s.deviceType));var c=e.ext.web;if(c){ye(n,re.deviceLanguage,c.browserLang),ye(n,re.deviceBrowserVersion,c.browserVer),ye(n,re.deviceBrowser,c.browser);var l=r.data=r.data||{},f=l[ue]=l[ue]||{},m=f[Fe]=f[Fe]||{};ye(m,"domain",c.domain),ye(m,"isManual",c.isManual?Su:null),ye(m,"screenRes",c.screenRes),ye(m,"userConsent",c.userConsent?Su:null)}var C=i.os;C&&ye(n,re.deviceOS,C.name);var E=i.trace;E&&(ye(n,re.operationParentId,E.parentID),ye(n,re.operationName,E.name),ye(n,re.operationId,E.traceID));for(var P={},p=a.length-1;p>=0;p--){var v=a[p];Y(v,function(w,L){P[w]=L}),a.splice(p,1)}Y(a,function(w,L){P[w]=L});var y=yt({},n,P);y[re.internalSdkVersion]||(y[re.internalSdkVersion]="javascript:"+t.Version),r.tags=Xn(y)},t.prototype.Init=function(e,r){this._logger=e,x(r[ue])&&this._logger.throwInternal(S.CRITICAL,h.TelemetryEnvelopeInvalid,"telemetryItem.baseData cannot be null.")},t.Version="2.6.4",t}(),Iu=function(t){z(e,t);function e(){return t!==null&&t.apply(this,arguments)||this}return e.prototype.Create=function(r,n){t.prototype.Init.call(this,r,n);var i=n[ue].measurements||{},a=n[ue][Fe]||{};fe.extractPropsAndMeasurements(n.data,a,i);var o=n[ue];if(x(o))return r.warnToConsole("Invalid input for dependency data"),null;var u=o[Fe]&&o[Fe][Rr]?o[Fe][Rr]:"GET",s=new je(r,o.id,o.target,o.name,o.duration,o.success,o.responseCode,u,o.type,o.correlationContext,a,i),c=new xt(je.dataType,s);return fe.createEnvelope(r,je.envelopeType,n,c)},e.DependencyEnvelopeCreator=new e,e}(fe),io=function(t){z(e,t);function e(){return t!==null&&t.apply(this,arguments)||this}return e.prototype.Create=function(r,n){t.prototype.Init.call(this,r,n);var i={},a={};n[no]!==Ve.dataType&&(i.baseTypeSource=n[no]),n[no]===Ve.dataType?(i=n[ue][Fe]||{},a=n[ue].measurements||{}):n[ue]&&fe.extractPropsAndMeasurements(n[ue],i,a),fe.extractPropsAndMeasurements(n.data,i,a);var o=n[ue].name,u=new Ve(r,o,i,a),s=new xt(Ve.dataType,u);return fe.createEnvelope(r,Ve.envelopeType,n,s)},e.EventEnvelopeCreator=new e,e}(fe),Cu=function(t){z(e,t);function e(){return t!==null&&t.apply(this,arguments)||this}return e.prototype.Create=function(r,n){t.prototype.Init.call(this,r,n);var i=n[ue].measurements||{},a=n[ue][Fe]||{};fe.extractPropsAndMeasurements(n.data,a,i);var o=n[ue],u=he.CreateFromInterface(r,o,a,i),s=new xt(he.dataType,u);return fe.createEnvelope(r,he.envelopeType,n,s)},e.ExceptionEnvelopeCreator=new e,e}(fe),Tu=function(t){z(e,t);function e(){return t!==null&&t.apply(this,arguments)||this}return e.prototype.Create=function(r,n){t.prototype.Init.call(this,r,n);var i=n[ue],a=i[Fe]||{},o=i.measurements||{};fe.extractPropsAndMeasurements(n.data,a,o);var u=new qe(r,i.name,i.average,i.sampleCount,i.min,i.max,a,o),s=new xt(qe.dataType,u);return fe.createEnvelope(r,qe.envelopeType,n,s)},e.MetricEnvelopeCreator=new e,e}(fe),Eu=function(t){z(e,t);function e(){return t!==null&&t.apply(this,arguments)||this}return e.prototype.Create=function(r,n){t.prototype.Init.call(this,r,n);var i="duration",a,o=n[ue];!x(o)&&!x(o[Fe])&&!x(o[Fe][i])?(a=o[Fe][i],delete o[Fe][i]):!x(n.data)&&!x(n.data[i])&&(a=n.data[i],delete n.data[i]);var u=n[ue],s;((n.ext||{}).trace||{}).traceID&&(s=n.ext.trace.traceID);var c=u.id||s,l=u.name,f=u.uri,m=u[Fe]||{},C=u.measurements||{};if(x(u.refUri)||(m.refUri=u.refUri),x(u.pageType)||(m.pageType=u.pageType),x(u.isLoggedIn)||(m.isLoggedIn=u.isLoggedIn.toString()),!x(u[Fe])){var E=u[Fe];Y(E,function(v,y){m[v]=y})}fe.extractPropsAndMeasurements(n.data,m,C);var P=new ke(r,l,f,a,m,C,c),p=new xt(ke.dataType,P);return fe.createEnvelope(r,ke.envelopeType,n,p)},e.PageViewEnvelopeCreator=new e,e}(fe),wu=function(t){z(e,t);function e(){return t!==null&&t.apply(this,arguments)||this}return e.prototype.Create=function(r,n){t.prototype.Init.call(this,r,n);var i=n[ue],a=i.name,o=i.uri||i.url,u=i[Fe]||{},s=i.measurements||{};fe.extractPropsAndMeasurements(n.data,u,s);var c=new $e(r,a,o,void 0,u,s,i),l=new xt($e.dataType,c);return fe.createEnvelope(r,$e.envelopeType,n,l)},e.PageViewPerformanceEnvelopeCreator=new e,e}(fe),bu=function(t){z(e,t);function e(){return t!==null&&t.apply(this,arguments)||this}return e.prototype.Create=function(r,n){t.prototype.Init.call(this,r,n);var i=n[ue].message,a=n[ue].severityLevel,o=n[ue][Fe]||{},u=n[ue].measurements||{};fe.extractPropsAndMeasurements(n.data,o,u);var s=new Ze(r,i,a,o,u),c=new xt(Ze.dataType,s);return fe.createEnvelope(r,Ze.envelopeType,n,c)},e.TraceEnvelopeCreator=new e,e}(fe)});var Au,Du=I(()=>{X();Te();Au=function(){function t(e){W(t,this,function(r){r.serialize=function(o){var u=n(o,"root");try{return be().stringify(u)}catch(s){e.throwInternal(S.CRITICAL,h.CannotSerializeObject,s&&B(s.toString)?s.toString():"Error serializing object",null,!0)}};function n(o,u){var s="__aiCircularRefCheck",c={};if(!o)return e.throwInternal(S.CRITICAL,h.CannotSerializeObject,"cannot serialize object because it is null or undefined",{name:u},!0),c;if(o[s])return e.throwInternal(S.WARNING,h.CircularReferenceDetected,"Circular reference detected while serializing object",{name:u},!0),c;if(!o.aiDataContract){if(u==="measurements")c=a(o,"number",u);else if(u==="properties")c=a(o,"string",u);else if(u==="tags")c=a(o,"string",u);else if(Re(o))c=i(o,u);else{e.throwInternal(S.WARNING,h.CannotSerializeObjectNonSerializable,"Attempting to serialize an object which does not implement ISerializable",{name:u},!0);try{be().stringify(o),c=o}catch(l){e.throwInternal(S.CRITICAL,h.CannotSerializeObject,l&&B(l.toString)?l.toString():"Error serializing object",null,!0)}}return c}return o[s]=!0,Y(o.aiDataContract,function(l,f){var m=B(f)?f()&1:f&1,C=B(f)?f()&4:f&4,E=f&2,P=o[l]!==void 0,p=st(o[l])&&o[l]!==null;if(m&&!P&&!E)e.throwInternal(S.CRITICAL,h.MissingRequiredFieldSpecification,"Missing required field specification. The field is required but not present on source",{field:l,name:u});else if(!C){var v=void 0;p?E?v=i(o[l],l):v=n(o[l],l):v=o[l],v!==void 0&&(c[l]=v)}}),delete o[s],c}function i(o,u){var s;if(o)if(!Re(o))e.throwInternal(S.CRITICAL,h.ItemNotInArray,`This field was specified as an array in the contract but the item is not an array.\r
`,{name:u},!0);else{s=[];for(var c=0;c<o.length;c++){var l=o[c],f=n(l,u+"["+c+"]");s.push(f)}}return s}function a(o,u,s){var c;return o&&(c={},Y(o,function(l,f){if(u==="string")f===void 0?c[l]="undefined":f===null?c[l]="null":f.toString?c[l]=f.toString():c[l]="invalid field: toString() is not defined.";else if(u==="number")if(f===void 0)c[l]="undefined";else if(f===null)c[l]="null";else{var m=parseFloat(f);isNaN(m)?c[l]="NaN":c[l]=m}else c[l]="invalid field: "+s+" is of unknown type.",e.throwInternal(S.CRITICAL,c[l],null,!0)})),c}})}return t}()});var vl,ao,Nu=I(()=>{X();Te();vl=function(){function t(){var e=It(),r=Ne(),n=!1,i=!0;W(t,this,function(a){try{if(e&&Jt.Attach(e,"online",s)&&(Jt.Attach(e,"offline",c),n=!0),r){var o=r.body||r;pe(o.ononline)||(o.ononline=s,o.onoffline=c,n=!0)}if(n){var u=_e();u&&!x(u.onLine)&&(i=u.onLine)}}catch(l){n=!1}a.isListening=n,a.isOnline=function(){var l=!0,f=_e();return n?l=i:f&&!x(f.onLine)&&(l=f.onLine),l},a.isOffline=function(){return!a.isOnline()};function s(){i=!0}function c(){i=!1}})}return t.Offline=new t,t}(),ao=vl.Offline});var ku,Fu=I(()=>{ku=function(){function t(){}return t.prototype.getHashCodeScore=function(e){var r=this.getHashCode(e)/t.INT_MAX_VALUE;return r*100},t.prototype.getHashCode=function(e){if(e==="")return 0;for(;e.length<t.MIN_INPUT_LENGTH;)e=e.concat(e);for(var r=5381,n=0;n<e.length;++n)r=(r<<5)+r+e.charCodeAt(n),r=r&r;return Math.abs(r)},t.INT_MAX_VALUE=2147483647,t.MIN_INPUT_LENGTH=8,t}()});var Ru,Mu=I(()=>{Fu();xe();Ru=function(){function t(){this.hashCodeGeneragor=new ku,this.keys=new xr}return t.prototype.getSamplingScore=function(e){var r=0;return e.tags&&e.tags[this.keys.userId]?r=this.hashCodeGeneragor.getHashCodeScore(e.tags[this.keys.userId]):e.ext&&e.ext.user&&e.ext.user.id?r=this.hashCodeGeneragor.getHashCodeScore(e.ext.user.id):e.tags&&e.tags[this.keys.operationId]?r=this.hashCodeGeneragor.getHashCodeScore(e.tags[this.keys.operationId]):e.ext&&e.ext.telemetryTrace&&e.ext.telemetryTrace.traceID?r=this.hashCodeGeneragor.getHashCodeScore(e.ext.telemetryTrace.traceID):r=Math.random()*100,r},t}()});var Lu,_u=I(()=>{Mu();xe();X();Lu=function(){function t(e,r){this.INT_MAX_VALUE=2147483647,this._logger=r||Rt(null),(e>100||e<0)&&(this._logger.throwInternal(S.WARNING,h.SampleRateOutOfRange,"Sampling rate is out of range (0..100). Sampling will be disabled, you may be sending too much data which may affect your AI service level.",{samplingRate:e},!0),e=100),this.sampleRate=e,this.samplingScoreGenerator=new Ru}return t.prototype.isSampledIn=function(e){var r=this.sampleRate,n=!1;return r==null||r>=100||e.baseType===qe.dataType?!0:(n=this.samplingScoreGenerator.getSamplingScore(e)<r,n)},t}()});function Ci(t){try{return t.responseText}catch(e){}return null}var Nn,Uu=I(()=>{ne();yu();Pu();Du();xe();X();Nu();_u();Te();Nn=function(t){z(e,t);function e(){var r=t.call(this)||this;r.priority=1001,r.identifier=zr,r._XMLHttpRequestSupported=!1;var n,i,a,o,u,s,c={};return W(e,r,function(l,f){function m(){De("Method not implemented.")}l.pause=m,l.resume=m,l.flush=function(){try{l.triggerSend(!0,null,1)}catch(d){l.diagLog().throwInternal(S.CRITICAL,h.FlushFailed,"flush failed, telemetry will not be collected: "+G(d),{exception:O(d)})}},l.onunloadFlush=function(){if((l._senderConfig.onunloadDisableBeacon()===!1||l._senderConfig.isBeaconApiDisabled()===!1)&&Fr())try{l.triggerSend(!0,p,2)}catch(d){l.diagLog().throwInternal(S.CRITICAL,h.FailedToSendQueuedTelemetry,"failed to flush with beacon sender on page unload, telemetry will not be collected: "+G(d),{exception:O(d)})}else l.flush()},l.teardown=m,l.addHeader=function(d,T){c[d]=T},l.initialize=function(d,T,D,A){f.initialize(d,T,D,A);var H=l._getTelCtx(),_=l.identifier;u=new Au(T.logger),n=0,i=null,a=0,l._sender=null,s=0;var j=e._getDefaultAppInsightsChannelConfig();if(l._senderConfig=e._getEmptyAppInsightsChannelConfig(),Y(j,function(g,b){l._senderConfig[g]=function(){return H.getConfig(_,g,b())}}),l._buffer=l._senderConfig.enableSessionStorageBuffer()&&wt()?new xu(l.diagLog(),l._senderConfig):new hu(l._senderConfig),l._sample=new Lu(l._senderConfig.samplingPercentage(),l.diagLog()),dt(d)||l.diagLog().throwInternal(S.CRITICAL,h.InvalidInstrumentationKey,"Invalid Instrumentation key "+d.instrumentationKey),!Lr(l._senderConfig.endpointUrl())&&l._senderConfig.customHeaders()&&l._senderConfig.customHeaders().length>0&&R(l._senderConfig.customHeaders(),function(g){r.addHeader(g.header,g.value)}),!l._senderConfig.isBeaconApiDisabled()&&Fr())l._sender=p;else{var Z=we("XMLHttpRequest");if(Z){var ie=new Z;"withCredentials"in ie?(l._sender=v,l._XMLHttpRequestSupported=!0):typeof XDomainRequest!==Oe&&(l._sender=me)}else{var Bt=we("fetch");Bt&&(l._sender=y)}}},l.processTelemetry=function(d,T){T=l._getTelCtx(T);try{if(l._senderConfig.disableTelemetry())return;if(!d){T.diagLog().throwInternal(S.CRITICAL,h.CannotSendEmptyTelemetry,"Cannot send empty telemetry");return}if(d.baseData&&!d.baseType){T.diagLog().throwInternal(S.CRITICAL,h.InvalidEvent,"Cannot send telemetry without baseData and baseType");return}if(d.baseType||(d.baseType="EventData"),!l._sender){T.diagLog().throwInternal(S.CRITICAL,h.SenderNotInitialized,"Sender was not initialized");return}if(C(d))d[fr]=l._sample.sampleRate;else{T.diagLog().throwInternal(S.WARNING,h.TelemetrySampledAndNotSent,"Telemetry item was sampled out and not sent",{SampleRate:l._sample.sampleRate});return}var D=e.constructEnvelope(d,l._senderConfig.instrumentationKey(),T.diagLog());if(!D){T.diagLog().throwInternal(S.CRITICAL,h.CreateEnvelopeError,"Unable to create an AppInsights envelope");return}var A=!1;if(d.tags&&d.tags[Ut]&&(R(d.tags[Ut],function(Z){try{Z&&Z(D)===!1&&(A=!0,T.diagLog().warnToConsole("Telemetry processor check returns false"))}catch(ie){T.diagLog().throwInternal(S.CRITICAL,h.TelemetryInitializerFailed,"One of telemetry initializers failed, telemetry item will not be sent: "+G(ie),{exception:O(ie)},!0)}}),delete d.tags[Ut]),A)return;var H=u.serialize(D),_=l._buffer.getItems(),j=l._buffer.batchPayloads(_);j&&j.length+H.length>l._senderConfig.maxBatchSizeInBytes()&&l.triggerSend(!0,null,10),l._buffer.enqueue(H),Q()}catch(Z){T.diagLog().throwInternal(S.WARNING,h.FailedAddingTelemetryToBuffer,"Failed adding telemetry to the sender's buffer, some telemetry will be lost: "+G(Z),{exception:O(Z)})}l.processNext(d,T)},l._xhrReadyStateChange=function(d,T,D){d.readyState===4&&E(d.status,T,d.responseURL,D,J(d),Ci(d)||d.response)},l.triggerSend=function(d,T,D){d===void 0&&(d=!0);try{if(l._senderConfig.disableTelemetry())l._buffer.clear();else{if(l._buffer.count()>0){var A=l._buffer.getItems();at(D||0,d),T?T.call(r,A,d):l._sender(A,d)}a=+new Date}clearTimeout(o),o=null,i=null}catch(_){var H=sr();(!H||H>9)&&l.diagLog().throwInternal(S.CRITICAL,h.TransmissionFailed,"Telemetry transmission failed, some telemetry will be lost: "+G(_),{exception:O(_)})}},l._onError=function(d,T,D){l.diagLog().throwInternal(S.WARNING,h.OnError,"Failed to send telemetry.",{message:T}),l._buffer.clearSent(d)},l._onPartialSuccess=function(d,T){for(var D=[],A=[],H=T.errors.reverse(),_=0,j=H;_<j.length;_++){var Z=j[_],ie=d.splice(Z.index,1)[0];Se(Z.statusCode)?A.push(ie):D.push(ie)}d.length>0&&l._onSuccess(d,T.itemsAccepted),D.length>0&&l._onError(D,J(null,["partial success",T.itemsAccepted,"of",T.itemsReceived].join(" "))),A.length>0&&(L(A),l.diagLog().throwInternal(S.WARNING,h.TransmissionFailed,"Partial success. Delivered: "+d.length+", Failed: "+D.length+". Will retry to send "+A.length+" our of "+T.itemsReceived+" items"))},l._onSuccess=function(d,T){l._buffer.clearSent(d)},l._xdrOnLoad=function(d,T){var D=Ci(d);if(d&&(D+""=="200"||D===""))n=0,l._onSuccess(T,0);else{var A=w(D);A&&A.itemsReceived&&A.itemsReceived>A.itemsAccepted&&!l._senderConfig.isRetryDisabled()?l._onPartialSuccess(T,A):l._onError(T,Ae(d))}};function C(d){return l._sample.isSampledIn(d)}function E(d,T,D,A,H,_){var j=null;if(l._appId||(j=w(_),j&&j.appId&&(l._appId=j.appId)),(d<200||d>=300)&&d!==0){if((d===301||d===307||d===308)&&!P(D)){l._onError(T,H);return}!l._senderConfig.isRetryDisabled()&&Se(d)?(L(T),l.diagLog().throwInternal(S.WARNING,h.TransmissionFailed,". Response code "+d+". Will retry to send "+T.length+" items.")):l._onError(T,H)}else if(ao.isOffline()){if(!l._senderConfig.isRetryDisabled()){var Z=10;L(T,Z),l.diagLog().throwInternal(S.WARNING,h.TransmissionFailed,". Offline - Response Code: "+d+". Offline status: "+ao.isOffline()+". Will retry to send "+T.length+" items.")}}else P(D),d===206?(j||(j=w(_)),j&&!l._senderConfig.isRetryDisabled()?l._onPartialSuccess(T,j):l._onError(T,H)):(n=0,l._onSuccess(T,A))}function P(d){return s>=10?!1:!x(d)&&d!==""&&d!==l._senderConfig.endpointUrl()?(l._senderConfig.endpointUrl=function(){return d},++s,!0):!1}function p(d,T){var D=l._senderConfig.endpointUrl(),A=l._buffer.batchPayloads(d),H=new Blob([A],{type:"text/plain;charset=UTF-8"}),_=_e().sendBeacon(D,H);_?(l._buffer.markAsSent(d),l._onSuccess(d,d.length)):(v(d,!0),l.diagLog().throwInternal(S.WARNING,h.TransmissionFailed,". Failed to send telemetry with Beacon API, retried with xhrSender."))}function v(d,T){var D=new XMLHttpRequest,A=l._senderConfig.endpointUrl();try{D[Et]=!0}catch(_){}D.open("POST",A,T),D.setRequestHeader("Content-type","application/json"),Lr(A)&&D.setRequestHeader(te.sdkContextHeader,te.sdkContextHeaderAppIdRequest),R(Ye(c),function(_){D.setRequestHeader(_,c[_])}),D.onreadystatechange=function(){return l._xhrReadyStateChange(D,d,d.length)},D.onerror=function(_){return l._onError(d,J(D),_)};var H=l._buffer.batchPayloads(d);D.send(H),l._buffer.markAsSent(d)}function y(d,T){var D=l._senderConfig.endpointUrl(),A=l._buffer.batchPayloads(d),H=new Blob([A],{type:"text/plain;charset=UTF-8"}),_=new Headers;Lr(D)&&_.append(te.sdkContextHeader,te.sdkContextHeaderAppIdRequest),R(Ye(c),function(ie){_.append(ie,c[ie])});var j={method:"POST",headers:_,body:H},Z=new Request(D,j);fetch(Z).then(function(ie){if(ie.ok)ie.text().then(function(Bt){E(ie.status,d,ie.url,d.length,ie.statusText,Bt)}),l._buffer.markAsSent(d);else throw Error(ie.statusText)}).catch(function(ie){l._onError(d,ie.message)})}function w(d){try{if(d&&d!==""){var T=be().parse(d);if(T&&T.itemsReceived&&T.itemsReceived>=T.itemsAccepted&&T.itemsReceived-T.itemsAccepted===T.errors.length)return T}}catch(D){l.diagLog().throwInternal(S.CRITICAL,h.InvalidBackendResponse,"Cannot parse the response. "+G(D),{response:d})}return null}function L(d,T){if(T===void 0&&(T=1),!(!d||d.length===0)){l._buffer.clearSent(d),n++;for(var D=0,A=d;D<A.length;D++){var H=A[D];l._buffer.enqueue(H)}k(T),Q()}}function k(d){var T=10,D;if(n<=1)D=T;else{var A=(Math.pow(2,n)-1)/2,H=Math.floor(Math.random()*A*T)+1;H=d*H,D=Math.max(Math.min(H,3600),T)}var _=de()+D*1e3;i=_}function Q(){if(!o){var d=i?Math.max(0,i-de()):0,T=Math.max(l._senderConfig.maxBatchInterval(),d);o=setTimeout(function(){l.triggerSend(!0,null,1)},T)}}function Se(d){return d===408||d===429||d===500||d===503}function J(d,T){return d?"XMLHttpRequest,Status:"+d.status+",Response:"+Ci(d)||0||0:T}function me(d,T){var D=It(),A=new XDomainRequest;A.onload=function(){return l._xdrOnLoad(A,d)},A.onerror=function(Z){return l._onError(d,Ae(A),Z)};var H=D&&D.location&&D.location.protocol||"";if(l._senderConfig.endpointUrl().lastIndexOf(H,0)!==0){l.diagLog().throwInternal(S.WARNING,h.TransmissionFailed,". Cannot send XDomain request. The endpoint URL protocol doesn't match the hosting page protocol."),l._buffer.clear();return}var _=l._senderConfig.endpointUrl().replace(/^(https?:)/,"");A.open("POST",_);var j=l._buffer.batchPayloads(d);A.send(j),l._buffer.markAsSent(d)}function Ae(d,T){return d?"XDomainRequest,Response:"+Ci(d)||0:T}function pt(){var d="getNotifyMgr";return l.core[d]?l.core[d]():l.core._notificationManager}function at(d,T){var D=pt();if(D&&D.eventsSendRequest)try{D.eventsSendRequest(d,T)}catch(A){l.diagLog().throwInternal(S.CRITICAL,h.NotificationException,"send request notification failed: "+G(A),{exception:O(A)})}}function dt(d){var T=x(d.disableInstrumentationKeyValidation)?!1:d.disableInstrumentationKeyValidation;if(T)return!0;var D="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",A=new RegExp(D);return A.test(d.instrumentationKey)}}),r}return e.constructEnvelope=function(r,n,i){var a;switch(n!==r.iKey&&!x(n)?a=yt({},r,{iKey:n}):a=r,a.baseType){case Ve.dataType:return io.EventEnvelopeCreator.Create(i,a);case Ze.dataType:return bu.TraceEnvelopeCreator.Create(i,a);case ke.dataType:return Eu.PageViewEnvelopeCreator.Create(i,a);case $e.dataType:return wu.PageViewPerformanceEnvelopeCreator.Create(i,a);case he.dataType:return Cu.ExceptionEnvelopeCreator.Create(i,a);case qe.dataType:return Tu.MetricEnvelopeCreator.Create(i,a);case je.dataType:return Iu.DependencyEnvelopeCreator.Create(i,a);default:return io.EventEnvelopeCreator.Create(i,a)}},e._getDefaultAppInsightsChannelConfig=function(){return{endpointUrl:function(){return"https://dc.services.visualstudio.com/v2/track"},emitLineDelimitedJson:function(){return!1},maxBatchInterval:function(){return 15e3},maxBatchSizeInBytes:function(){return 102400},disableTelemetry:function(){return!1},enableSessionStorageBuffer:function(){return!0},isRetryDisabled:function(){return!1},isBeaconApiDisabled:function(){return!0},onunloadDisableBeacon:function(){return!1},instrumentationKey:function(){},namePrefix:function(){},samplingPercentage:function(){return 100},customHeaders:function(){}}},e._getEmptyAppInsightsChannelConfig=function(){return{endpointUrl:void 0,emitLineDelimitedJson:void 0,maxBatchInterval:void 0,maxBatchSizeInBytes:void 0,disableTelemetry:void 0,enableSessionStorageBuffer:void 0,isRetryDisabled:void 0,isBeaconApiDisabled:void 0,onunloadDisableBeacon:void 0,instrumentationKey:void 0,namePrefix:void 0,samplingPercentage:void 0,customHeaders:void 0}},e}(tt)});var oo=I(()=>{Uu()});var hl,so,Ou,zu=I(()=>{Te();xe();X();hl="ai_session",so=function(){function t(){}return t}(),Ou=function(){function t(e,r){var n=this,i,a,o=Rt(r),u=lr(r);W(t,n,function(s){e||(e={}),B(e.sessionExpirationMs)||(e.sessionExpirationMs=function(){return t.acquisitionSpan}),B(e.sessionRenewalMs)||(e.sessionRenewalMs=function(){return t.renewalSpan}),s.config=e;var c=s.config.sessionCookiePostfix&&s.config.sessionCookiePostfix()?s.config.sessionCookiePostfix():s.config.namePrefix&&s.config.namePrefix()?s.config.namePrefix():"";i=function(){return hl+c},s.automaticSession=new so,s.update=function(){var P=de(),p=!1,v=s.automaticSession;v.id||(p=!l(v,P));var y=s.config.sessionExpirationMs();if(!p&&y>0){var w=s.config.sessionRenewalMs(),L=P-v.acquisitionDate,k=P-v.renewalDate;p=L<0||k<0,p=p||L>y,p=p||k>w}p?m(P):(!a||P-a>t.cookieUpdateInterval)&&C(v,P)},s.backup=function(){var P=s.automaticSession;E(P.id,P.acquisitionDate,P.renewalDate)};function l(P,p){var v=!1,y=u.get(i());if(y&&B(y.split))v=f(P,y);else{var w=gn(o,i());w&&(v=f(P,w))}return v||!!P.id}function f(P,p){var v=!1,y=", session will be reset",w=p.split("|");if(w.length>=2)try{var L=+w[1]||0,k=+w[2]||0;isNaN(L)||L<=0?o.throwInternal(S.WARNING,h.SessionRenewalDateIsZero,"AI session acquisition date is 0"+y):isNaN(k)||k<=0?o.throwInternal(S.WARNING,h.SessionRenewalDateIsZero,"AI session renewal date is 0"+y):w[0]&&(P.id=w[0],P.acquisitionDate=L,P.renewalDate=k,v=!0)}catch(Q){o.throwInternal(S.CRITICAL,h.ErrorParsingAISessionCookie,"Error parsing ai_session value ["+(p||"")+"]"+y+" - "+G(Q),{exception:O(Q)})}return v}function m(P){var p=s.config||{},v=(p.getNewId?p.getNewId():null)||Xt;s.automaticSession.id=v(p.idLength?p.idLength():22),s.automaticSession.acquisitionDate=P,C(s.automaticSession,P),Mr()||o.throwInternal(S.WARNING,h.BrowserDoesNotSupportLocalStorage,"Browser does not support local storage. Session durations will be inaccurate.")}function C(P,p){var v=P.acquisitionDate;P.renewalDate=p;var y=s.config,w=y.sessionRenewalMs(),L=v+y.sessionExpirationMs()-p,k=[P.id,v,p],Q=0;L<w?Q=L/1e3:Q=w/1e3;var Se=y.cookieDomain?y.cookieDomain():null;u.set(i(),k.join("|"),y.sessionExpirationMs()>0?Q:null,Se),a=p}function E(P,p,v){vn(o,i(),[P,p,v].join("|"))}})}return t.acquisitionSpan=864e5,t.renewalSpan=18e5,t.cookieUpdateInterval=6e4,t}()});var Bu,Hu=I(()=>{Bu=function(){function t(){}return t}()});var Vu,qu=I(()=>{Vu=function(){function t(){this.id="browser",this.deviceClass="Browser"}return t}()});var xl,ju,Gu=I(()=>{xl="2.6.4",ju=function(){function t(e){this.sdkVersion=(e.sdkExtension&&e.sdkExtension()?e.sdkExtension()+"_":"")+"javascript:"+xl}return t}()});function Ku(t){return!(typeof t!="string"||!t||t.match(/,|;|=| |\|/))}var Wu,Xu=I(()=>{Te();xe();X();Wu=function(){function t(e,r){this.isNewUser=!1;var n=Rt(r),i=lr(r),a;W(t,this,function(o){o.config=e;var u=o.config.userCookiePostfix&&o.config.userCookiePostfix()?o.config.userCookiePostfix():"";a=function(){return t.userCookieName+u};var s=i.get(a());if(s){o.isNewUser=!1;var c=s.split(t.cookieSeparator);c.length>0&&(o.id=c[0])}if(!o.id){var l=e||{},f=(l.getNewId?l.getNewId():null)||Xt;o.id=f(l.idLength?e.idLength():22);var m=31536e3,C=Me(new Date);o.accountAcquisitionDate=C,o.isNewUser=!0;var E=[o.id,C];i.set(a(),E.join(t.cookieSeparator),m);var P=e.namePrefix&&e.namePrefix()?e.namePrefix()+"ai_session":"ai_session";hn(n,P)}o.accountId=e.accountId?e.accountId():void 0;var p=i.get(t.authUserCookieName);if(p){p=decodeURI(p);var v=p.split(t.cookieSeparator);v[0]&&(o.authenticatedId=v[0]),v.length>1&&v[1]&&(o.accountId=v[1])}o.setAuthenticatedUserContext=function(y,w,L){L===void 0&&(L=!1);var k=!Ku(y)||w&&!Ku(w);if(k){n.throwInternal(S.WARNING,h.SetAuthContextFailedAccountName,"Setting auth user context failed. User auth/account id should be of type string, and not contain commas, semi-colons, equal signs, spaces, or vertical-bars.",!0);return}o.authenticatedId=y;var Q=o.authenticatedId;w&&(o.accountId=w,Q=[o.authenticatedId,o.accountId].join(t.cookieSeparator)),L&&i.set(t.authUserCookieName,encodeURI(Q))},o.clearAuthenticatedUserContext=function(){o.authenticatedId=null,o.accountId=null,i.del(t.authUserCookieName)}})}return t.cookieSeparator="|",t.userCookieName="ai_user",t.authUserCookieName="ai_authUser",t}()});var Ju,Qu=I(()=>{Ju=function(){function t(){}return t}()});var Zu,$u=I(()=>{xe();X();Zu=function(){function t(e,r,n,i){var a=this;a.traceID=e||ze(),a.parentID=r,a.name=n;var o=et();!n&&o&&o.pathname&&(a.name=o.pathname),a.name=oe(i,a.name)}return t}()});function Br(t,e){t&&t[e]&&Ye(t[e]).length===0&&delete t[e]}var Ti,Ei,Yu,ec=I(()=>{Te();X();zu();xe();Hu();qu();Gu();Xu();Qu();$u();Ti="ext",Ei="tags";Yu=function(){function t(e,r){var n=this,i=e.logger;this.appId=function(){return null},W(t,this,function(a){a.application=new Bu,a.internal=new ju(r),or()&&(a.sessionManager=new Ou(r,e),a.device=new Vu,a.location=new Ju,a.user=new Wu(r,e),a.telemetryTrace=new Zu(void 0,void 0,void 0,i),a.session=new so),a.applySessionContext=function(o,u){var s=a.session,c=a.sessionManager;s&&U(s.id)?K(ge(o.ext,Ue.AppExt),"sesId",s.id):c&&c.automaticSession&&K(ge(o.ext,Ue.AppExt),"sesId",c.automaticSession.id,U)},a.applyOperatingSystemContxt=function(o,u){K(o.ext,Ue.OSExt,a.os)},a.applyApplicationContext=function(o,u){var s=a.application;if(s){var c=ge(o,Ei);K(c,re.applicationVersion,s.ver,U),K(c,re.applicationBuild,s.build,U)}},a.applyDeviceContext=function(o,u){var s=a.device;if(s){var c=ge(ge(o,Ti),Ue.DeviceExt);K(c,"localId",s.id,U),K(c,"ip",s.ip,U),K(c,"model",s.model,U),K(c,"deviceClass",s.deviceClass,U)}},a.applyInternalContext=function(o,u){var s=a.internal;if(s){var c=ge(o,Ei);K(c,re.internalAgentVersion,s.agentVersion,U),K(c,re.internalSdkVersion,s.sdkVersion,U),(o.baseType===Ft.dataType||o.baseType===ke.dataType)&&(K(c,re.internalSnippet,s.snippetVer,U),K(c,re.internalSdkSrc,s.sdkSrc,U))}},a.applyLocationContext=function(o,u){var s=n.location;s&&K(ge(o,Ei,[]),re.locationIp,s.ip,U)},a.applyOperationContext=function(o,u){var s=a.telemetryTrace;if(s){var c=ge(ge(o,Ti),Ue.TraceExt,{traceID:void 0,parentID:void 0});K(c,"traceID",s.traceID,U),K(c,"name",s.name,U),K(c,"parentID",s.parentID,U)}},a.applyWebContext=function(o,u){var s=n.web;s&&K(ge(o,Ti),Ue.WebExt,s)},a.applyUserContext=function(o,u){var s=a.user;if(s){var c=ge(o,Ei,[]);K(c,re.userAccountId,s.accountId,U);var l=ge(ge(o,Ti),Ue.UserExt);K(l,"id",s.id,U),K(l,"authId",s.authenticatedId,U)}},a.cleanUp=function(o,u){var s=o.ext;s&&(Br(s,Ue.DeviceExt),Br(s,Ue.UserExt),Br(s,Ue.WebExt),Br(s,Ue.OSExt),Br(s,Ue.AppExt),Br(s,Ue.TraceExt))}})}return t}()});var yl,kn,tc=I(()=>{ne();Te();X();ec();xe();yl=function(t){z(e,t);function e(){var r=t.call(this)||this;r.priority=110,r.identifier=zt;var n,i;return W(e,r,function(a,o){a.initialize=function(s,c,l,f){o.initialize(s,c,l,f);var m=a._getTelCtx(),C=a.identifier,E=e.getDefaultConfig();i=i||{},Y(E,function(P,p){i[P]=function(){return m.getConfig(C,P,p())}}),a.context=new Yu(c,i),n=ln(l,zr),a.context.appId=function(){return n?n._appId:null},a._extConfig=i},a.processTelemetry=function(s,c){if(!x(s)){c=a._getTelCtx(c),s.name===ke.envelopeType&&c.diagLog().resetInternalMessageCount();var l=a.context||{};if(l.session&&typeof a.context.session.id!="string"&&l.sessionManager&&l.sessionManager.update(),u(s,c),l.user&&l.user.isNewUser){l.user.isNewUser=!1;var f=new Ft(h.SendBrowserInfoOnUserInit,(_e()||{}).userAgent||"");c.diagLog().logInternalMessage(S.CRITICAL,f)}a.processNext(s,c)}};function u(s,c){ge(s,"tags",[]),ge(s,"ext",{});var l=a.context;l.applySessionContext(s,c),l.applyApplicationContext(s,c),l.applyDeviceContext(s,c),l.applyOperationContext(s,c),l.applyUserContext(s,c),l.applyOperatingSystemContxt(s,c),l.applyWebContext(s,c),l.applyLocationContext(s,c),l.applyInternalContext(s,c),l.cleanUp(s,c)}}),r}return e.getDefaultConfig=function(){var r={instrumentationKey:function(){},accountId:function(){return null},sessionRenewalMs:function(){return 18e5},samplingPercentage:function(){return 100},sessionExpirationMs:function(){return 864e5},cookieDomain:function(){return null},sdkExtension:function(){return null},isBrowserLinkTrackingEnabled:function(){return!1},appId:function(){return null},namePrefix:function(){},sessionCookiePostfix:function(){},userCookiePostfix:function(){},idLength:function(){return 22},getNewId:function(){return null}};return r},e}(tt),kn=yl});var uo=I(()=>{tc()});function rc(t,e,r){var n=0,i=t[e],a=t[r];return i&&a&&(n=ve(i,a)),n}function yr(t,e,r,n,i){var a=0,o=rc(r,n,i);return o&&(a=rr(t,e,Ge(o))),a}function rr(t,e,r){var n="ajaxPerf",i=0;if(t&&e&&r){var a=t[n]=t[n]||{};a[e]=r,i=1}return i}function Sl(t,e){var r=t.perfTiming,n=e[nt]||{},i=0,a="name",o="Start",u="End",s="domainLookup",c="connect",l="redirect",f="request",m="response",C="duration",E="startTime",P=s+o,p=s+u,v=c+o,y=c+u,w=f+o,L=f+u,k=m+o,Q=m+u,Se=l+o,J=l=u,me="transferSize",Ae="encodedBodySize",pt="decodedBodySize",at="serverTiming";if(r){i|=yr(n,l,r,Se,J),i|=yr(n,s,r,P,p),i|=yr(n,c,r,v,y),i|=yr(n,f,r,w,L),i|=yr(n,m,r,k,Q),i|=yr(n,"networkConnect",r,E,y),i|=yr(n,"sentRequest",r,w,Q);var dt=r[C];dt||(dt=rc(r,E,Q)||0),i|=rr(n,C,dt),i|=rr(n,"perfTotal",dt);var d=r[at];if(d){var T={};R(d,function(D,A){var H=Gi(D[a]||""+A),_=T[H]||{};Y(D,function(j,Z){(j!==a&&U(Z)||ar(Z))&&(_[j]&&(Z=_[j]+";"+Z),(Z||!U(Z))&&(_[j]=Z))}),T[H]=_}),i|=rr(n,at,T)}i|=rr(n,me,r[me]),i|=rr(n,Ae,r[Ae]),i|=rr(n,pt,r[pt])}else t.perfMark&&(i|=rr(n,"missing",t.perfAttempts));i&&(e[nt]=n)}var nt,Il,co,nc=I(()=>{xe();X();Te();nt="properties";Il=function(){function t(){var e=this;e.openDone=!1,e.setRequestHeaderDone=!1,e.sendDone=!1,e.abortDone=!1,e.stateChangeAttached=!1}return t}(),co=function(){function t(e,r,n){var i=this,a=n,o="responseText";i.perfMark=null,i.completed=!1,i.requestHeadersSize=null,i.requestHeaders=null,i.responseReceivingDuration=null,i.callbackDuration=null,i.ajaxTotalDuration=null,i.aborted=0,i.pageUrl=null,i.requestUrl=null,i.requestSize=0,i.method=null,i.status=null,i.requestSentTime=null,i.responseStartedTime=null,i.responseFinishedTime=null,i.callbackFinishedTime=null,i.endTime=null,i.xhrMonitoringState=new Il,i.clientFailure=0,i.traceID=e,i.spanID=r,W(t,i,function(u){u.getAbsoluteUrl=function(){return u.requestUrl?yn(u.requestUrl):null},u.getPathName=function(){return u.requestUrl?Tt(a,Sn(u.method,u.requestUrl)):null},u.CreateTrackItem=function(s,c,l){if(u.ajaxTotalDuration=Math.round(ve(u.requestSentTime,u.responseFinishedTime)*1e3)/1e3,u.ajaxTotalDuration<0)return null;var f=(P={id:"|"+u.traceID+"."+u.spanID,target:u.getAbsoluteUrl(),name:u.getPathName(),type:s,startTime:null,duration:u.ajaxTotalDuration,success:+u.status>=200&&+u.status<400,responseCode:+u.status,method:u.method},P[nt]={HttpMethod:u.method},P);if(u.requestSentTime&&(f.startTime=new Date,f.startTime.setTime(u.requestSentTime)),Sl(u,f),c&&Ye(u.requestHeaders).length>0&&(f[nt]=f[nt]||{},f[nt].requestHeaders=u.requestHeaders),l){var m=l();if(m){var C=m.correlationContext;if(C&&(f.correlationContext=C),m.headerMap&&Ye(m.headerMap).length>0&&(f[nt]=f[nt]||{},f[nt].responseHeaders=m.headerMap),u.status>=400){var E=m.type;f[nt]=f[nt]||{},(E===""||E==="text")&&(f[nt][o]=m[o]?m.statusText+" - "+m[o]:m.statusText),E==="json"&&(f[nt][o]=m.response?m.statusText+" - "+JSON.stringify(m.response):m.statusText)}}}return f;var P}})}return t}()});var Sh,ic=I(()=>{X();X();Sh=function(){function t(){}return t.GetLength=function(e){var r=0;if(!x(e)){var n="";try{n=e.toString()}catch(i){}r=n.length,r=isNaN(r)?0:r}return r},t}()});var lo,ac=I(()=>{X();lo=function(){function t(e,r){var n=this;n.traceFlag=t.DEFAULT_TRACE_FLAG,n.version=t.DEFAULT_VERSION,e&&t.isValidTraceId(e)?n.traceId=e:n.traceId=ze(),r&&t.isValidSpanId(r)?n.spanId=r:n.spanId=ze().substr(0,16)}return t.isValidTraceId=function(e){return e.match(/^[0-9a-f]{32}$/)&&e!=="00000000000000000000000000000000"},t.isValidSpanId=function(e){return e.match(/^[0-9a-f]{16}$/)&&e!=="0000000000000000"},t.prototype.toString=function(){var e=this;return e.version+"-"+e.traceId+"-"+e.spanId+"-"+e.traceFlag},t.DEFAULT_TRACE_FLAG="01",t.DEFAULT_VERSION="00",t}()});function Cl(){var t=ot();return!t||x(t.Request)||x(t.Request[Ce])||x(t[Mn])?null:t[Mn]}function Tl(t){var e=!1;if(typeof XMLHttpRequest!==Oe&&!x(XMLHttpRequest)){var r=XMLHttpRequest[Ce];e=!x(r)&&!x(r.open)&&!x(r.send)&&!x(r.abort)}var n=sr();if(n&&n<9&&(e=!1),e)try{var i=new XMLHttpRequest;i[it]={};var a=XMLHttpRequest[Ce].open;XMLHttpRequest[Ce].open=a}catch(o){e=!1,Ln(t,h.FailedMonitorAjaxOpen,"Failed to enable XMLHttpRequest monitoring, extension is not supported",{exception:O(o)})}return e}function bi(t){var e="";try{!x(t)&&!x(t[it])&&!x(t[it].requestUrl)&&(e+="(url: '"+t[it].requestUrl+"')")}catch(r){}return e}function Ln(t,e,r,n,i){t[Rn]()[uc](S.CRITICAL,e,r,n,i)}function wi(t,e,r,n,i){t[Rn]()[uc](S.WARNING,e,r,n,i)}function Fn(t,e,r){return function(n){Ln(t,e,r,{ajaxDiagnosticsMessage:bi(n.inst),exception:O(n.err)})}}function Hr(t,e){return t&&e?t.indexOf(e):-1}var oc,Rn,it,uc,Mn,sc,_n,cc=I(()=>{ne();xe();X();nc();ic();ac();Te();oc="ai.ajxmn.",Rn="diagLog",it="ajaxData",uc="throwInternal",Mn="fetch",sc=0;_n=function(t){z(e,t);function e(){var r=t.call(this)||this;r.identifier=e.identifier,r.priority=120;var n="trackDependencyDataInternal",i=et(),a=!1,o=!1,u=i&&i.host&&i.host.toLowerCase(),s=e.getEmptyConfig(),c=!1,l=0,f,m,C,E,P=!1,p=0,v=!1,y=[],w={},L;return W(e,r,function(k,Q){k.initialize=function(g,b,N,F){if(!k.isInitialized()){Q.initialize(g,b,N,F);var M=k._getTelCtx(),q=e.getDefaultConfig();Y(q,function(We,Sr){s[We]=M.getConfig(e.identifier,We,Sr)});var V=s.distributedTracingMode;if(c=s.enableRequestHeaderTracking,P=s.enableAjaxPerfTracking,p=s.maxAjaxCallsPerView,v=s.enableResponseHeaderTracking,L=s.excludeRequestFromAutoTrackingPatterns,C=V===Ke.AI||V===Ke.AI_AND_W3C,m=V===Ke.AI_AND_W3C||V===Ke.W3C,P){var $=g.instrumentationKey||"unkwn";$.length>5?E=oc+$.substring($.length-5)+".":E=oc+$+"."}if(s.disableAjaxTracking===!1&&Ae(),J(),N.length>0&&N){for(var ce=void 0,Ie=0;!ce&&Ie<N.length;)N[Ie]&&N[Ie].identifier===zt&&(ce=N[Ie]),Ie++;ce&&(f=ce.context)}}},k.teardown=function(){R(y,function(g){g.rm()}),y=[],a=!1,o=!1,k.setInitialized(!1)},k.trackDependencyData=function(g,b){k[n](g,b)},k.includeCorrelationHeaders=function(g,b,N,F){var M=k._currentWindowHost||u;if(b){if(bt.canIncludeCorrelationHeader(s,g.getAbsoluteUrl(),M)){if(N||(N={}),N.headers=new Headers(N.headers||(b instanceof Request?b.headers||{}:{})),C){var q="|"+g.traceID+"."+g.spanID;N.headers.set(te.requestIdHeader,q),c&&(g.requestHeaders[te.requestIdHeader]=q)}var V=s.appId||f&&f.appId();if(V&&(N.headers.set(te.requestContextHeader,te.requestContextAppIdFormat+V),c&&(g.requestHeaders[te.requestContextHeader]=te.requestContextAppIdFormat+V)),m){var $=new lo(g.traceID,g.spanID);N.headers.set(te.traceParentHeader,$.toString()),c&&(g.requestHeaders[te.traceParentHeader]=$.toString())}}return N}else if(F){if(bt.canIncludeCorrelationHeader(s,g.getAbsoluteUrl(),M)){if(C){var q="|"+g.traceID+"."+g.spanID;F.setRequestHeader(te.requestIdHeader,q),c&&(g.requestHeaders[te.requestIdHeader]=q)}var V=s.appId||f&&f.appId();if(V&&(F.setRequestHeader(te.requestContextHeader,te.requestContextAppIdFormat+V),c&&(g.requestHeaders[te.requestContextHeader]=te.requestContextAppIdFormat+V)),m){var $=new lo(g.traceID,g.spanID);F.setRequestHeader(te.traceParentHeader,$.toString()),c&&(g.requestHeaders[te.traceParentHeader]=$.toString())}}return F}},k[n]=function(g,b,N){if(p===-1||l<p){(s.distributedTracingMode===Ke.W3C||s.distributedTracingMode===Ke.AI_AND_W3C)&&typeof g.id=="string"&&g.id[g.id.length-1]!=="."&&(g.id+="."),x(g.startTime)&&(g.startTime=new Date);var F=rt.create(g,je.dataType,je.envelopeType,k[Rn](),b,N);k.core.track(F)}else l===p&&Ln(k,h.MaxAjaxPerPVExceeded,"Maximum ajax per page view limit reached, ajax monitoring is paused until the next trackPageView(). In order to increase the limit set the maxAjaxCallsPerView configuration parameter.",!0);++l};function Se(g){var b=!0;return(g||s.ignoreHeaders)&&R(s.ignoreHeaders,function(N){if(N.toLowerCase()===g.toLowerCase())return b=!1,-1}),b}function J(){var g=Cl();if(!!g){var b=ot(),N=g.polyfill;s.disableFetchTracking===!1?(y.push(cn(b,Mn,{req:function(F,M,q){var V;if(a&&!pt(null,M,q)&&!(N&&o)){var $=F.ctx();V=j(M,q);var ce=k.includeCorrelationHeaders(V,M,q);ce!==q&&F.set(1,ce),$.data=V}},rsp:function(F,M){var q=F.ctx().data;q&&(F.rslt=F.rslt.then(function(V){return ie(F,(V||{}).status,V,q,function(){var $={statusText:V.statusText,headerMap:null,correlationContext:Bt(V)};if(v){var ce={};V.headers.forEach(function(Ie,We){Se(We)&&(ce[We]=Ie)}),$.headerMap=ce}return $}),V}).catch(function(V){throw ie(F,0,M,q,null,{error:V.message}),V}))},hkErr:Fn(k,h.FailedMonitorAjaxOpen,"Failed to monitor Window.fetch, monitoring data for this fetch call may be incorrect.")})),a=!0):N&&y.push(cn(b,Mn,{req:function(F,M,q){pt(null,M,q)}})),N&&(b[Mn].polyfill=N)}}function me(g,b,N){y.push(Pa(g,b,N))}function Ae(){Tl(k)&&!o&&(me(XMLHttpRequest,"open",{req:function(g,b,N,F){var M=g.inst,q=M[it];!pt(M,N)&&at(M,!0)&&(!q||!q.xhrMonitoringState.openDone)&&dt(M,b,N,F)},hkErr:Fn(k,h.FailedMonitorAjaxOpen,"Failed to monitor XMLHttpRequest.open, monitoring data for this ajax call may be incorrect.")}),me(XMLHttpRequest,"send",{req:function(g,b){var N=g.inst,F=N[it];at(N)&&!F.xhrMonitoringState.sendDone&&(H("xhr",F),F.requestSentTime=gr(),k.includeCorrelationHeaders(F,void 0,void 0,N),F.xhrMonitoringState.sendDone=!0)},hkErr:Fn(k,h.FailedMonitorAjaxSend,"Failed to monitor XMLHttpRequest, monitoring data for this ajax call may be incorrect.")}),me(XMLHttpRequest,"abort",{req:function(g){var b=g.inst,N=b[it];at(b)&&!N.xhrMonitoringState.abortDone&&(N.aborted=1,N.xhrMonitoringState.abortDone=!0)},hkErr:Fn(k,h.FailedMonitorAjaxAbort,"Failed to monitor XMLHttpRequest.abort, monitoring data for this ajax call may be incorrect.")}),c&&me(XMLHttpRequest,"setRequestHeader",{req:function(g,b,N){var F=g.inst;at(F)&&Se(b)&&(F[it].requestHeaders[b]=N)},hkErr:Fn(k,h.FailedMonitorAjaxSetRequestHeader,"Failed to monitor XMLHttpRequest.setRequestHeader, monitoring data for this ajax call may be incorrect.")}),o=!0)}function pt(g,b,N){var F=!1,M=((U(b)?b:(b||{}).url||"")||"").toLowerCase();if(R(L,function($){var ce=$;U($)&&(ce=new RegExp($)),F||(F=ce.test(M))}),F)return F;var q=Hr(M,"?"),V=Hr(M,"#");return(q===-1||V!==-1&&V<q)&&(q=V),q!==-1&&(M=M.substring(0,q)),x(g)?x(b)||(F=(typeof b=="object"?b[Et]===!0:!1)||(N?N[Et]===!0:!1)):F=g[Et]===!0||M[Et]===!0,F?w[M]||(w[M]=1):w[M]&&(F=!0),F}function at(g,b){var N=!0,F=o;return x(g)||(N=b===!0||!x(g[it])),F&&N}function dt(g,b,N,F){var M=f&&f.telemetryTrace&&f.telemetryTrace.traceID||ze(),q=ze().substr(0,16),V=new co(M,q,k[Rn]());V.method=b,V.requestUrl=N,V.xhrMonitoringState.openDone=!0,V.requestHeaders={},V.async=F,g[it]=V,d(g)}function d(g){g[it].xhrMonitoringState.stateChangeAttached=Jt.Attach(g,"readystatechange",function(){try{g&&g.readyState===4&&at(g)&&D(g)}catch(N){var b=O(N);(!b||Hr(b.toLowerCase(),"c00c023f")===-1)&&Ln(k,h.FailedMonitorAjaxRSC,"Failed to monitor XMLHttpRequest 'readystatechange' event handler, monitoring data for this ajax call may be incorrect.",{ajaxDiagnosticsMessage:bi(g),exception:b})}})}function T(g){try{var b=g.responseType;if(b===""||b==="text")return g.responseText}catch(N){}return null}function D(g){var b=g[it];b.responseFinishedTime=gr(),b.status=g.status;function N(F,M){var q=M||{};q.ajaxDiagnosticsMessage=bi(g),F&&(q.exception=O(F)),wi(k,h.FailedMonitorAjaxDur,"Failed to calculate the duration of the ajax call, monitoring data for this ajax call won't be sent.",q)}_("xmlhttprequest",b,function(){try{var F=b.CreateTrackItem("Ajax",c,function(){var M={statusText:g.statusText,headerMap:null,correlationContext:A(g),type:g.responseType,responseText:T(g),response:g.response};if(v){var q=g.getAllResponseHeaders();if(q){var V=se(q).split(/[\r\n]+/),$={};R(V,function(ce){var Ie=ce.split(": "),We=Ie.shift(),Sr=Ie.join(": ");Se(We)&&($[We]=Sr)}),M.headerMap=$}}return M});F?k[n](F):N(null,{requestSentTime:b.requestSentTime,responseFinishedTime:b.responseFinishedTime})}finally{try{g[it]=null}catch(M){}}},function(F){N(F,null)})}function A(g){try{var b=g.getAllResponseHeaders();if(b!==null){var N=Hr(b.toLowerCase(),te.requestContextHeaderLowerCase);if(N!==-1){var F=g.getResponseHeader(te.requestContextHeader);return bt.getCorrelationContext(F)}}}catch(M){wi(k,h.FailedMonitorAjaxGetCorrelationHeader,"Failed to get Request-Context correlation header as it may be not included in the response or not accessible.",{ajaxDiagnosticsMessage:bi(g),exception:O(M)})}}function H(g,b){if(b.requestUrl&&E&&P){var N=Qe();if(N&&B(N.mark)){sc++;var F=E+g+"#"+sc;N.mark(F);var M=N.getEntriesByName(F);M&&M.length===1&&(b.perfMark=M[0])}}}function _(g,b,N,F){var M=b.perfMark,q=Qe(),V=s.maxAjaxPerfLookupAttempts,$=s.ajaxPerfLookupDelay,ce=b.requestUrl,Ie=0;(function We(){try{if(q&&M){Ie++;for(var Sr=null,go=q.getEntries(),Ai=go.length-1;Ai>=0;Ai--){var Pt=go[Ai];if(Pt){if(Pt.entryType==="resource")Pt.initiatorType===g&&(Hr(Pt.name,ce)!==-1||Hr(ce,Pt.name)!==-1)&&(Sr=Pt);else if(Pt.entryType==="mark"&&Pt.name===M.name){b.perfTiming=Sr;break}if(Pt.startTime<M.startTime-1e3)break}}}!M||b.perfTiming||Ie>=V||b.async===!1?(M&&B(q.clearMarks)&&q.clearMarks(M.name),b.perfAttempts=Ie,N()):setTimeout(We,$)}catch(yc){F(yc)}})()}function j(g,b){var N=f&&f.telemetryTrace&&f.telemetryTrace.traceID||ze(),F=ze().substr(0,16),M=new co(N,F,k[Rn]());M.requestSentTime=gr(),g instanceof Request?M.requestUrl=g?g.url:"":M.requestUrl=g;var q="GET";b&&b.method?q=b.method:g&&g instanceof Request&&(q=g.method),M.method=q;var V={};if(c){var $=new Headers((b?b.headers:0)||(g instanceof Request?g.headers||{}:{}));$.forEach(function(ce,Ie){Se(Ie)&&(V[Ie]=ce)})}return M.requestHeaders=V,H("fetch",M),M}function Z(g){var b="";try{x(g)||(typeof g=="string"?b+="(url: '"+g+"')":b+="(url: '"+g.url+"')")}catch(N){Ln(k,h.FailedMonitorAjaxOpen,"Failed to grab failed fetch diagnostics message",{exception:O(N)})}return b}function ie(g,b,N,F,M,q){if(!F)return;function V($,ce,Ie){var We=Ie||{};We.fetchDiagnosticsMessage=Z(N),ce&&(We.exception=O(ce)),wi(k,$,"Failed to calculate the duration of the fetch call, monitoring data for this fetch call won't be sent.",We)}F.responseFinishedTime=gr(),F.status=b,_("fetch",F,function(){var $=F.CreateTrackItem("Fetch",c,M);$?k[n]($):V(h.FailedMonitorAjaxDur,null,{requestSentTime:F.requestSentTime,responseFinishedTime:F.responseFinishedTime})},function($){V(h.FailedMonitorAjaxGetCorrelationHeader,$,null)})}function Bt(g){if(g&&g.headers)try{var b=g.headers.get(te.requestContextHeader);return bt.getCorrelationContext(b)}catch(N){wi(k,h.FailedMonitorAjaxGetCorrelationHeader,"Failed to get Request-Context correlation header as it may be not included in the response or not accessible.",{fetchDiagnosticsMessage:Z(g),exception:O(N)})}}}),r}return e.getDefaultConfig=function(){var r={maxAjaxCallsPerView:500,disableAjaxTracking:!1,disableFetchTracking:!0,excludeRequestFromAutoTrackingPatterns:void 0,disableCorrelationHeaders:!1,distributedTracingMode:Ke.AI_AND_W3C,correlationHeaderExcludedDomains:["*.blob.core.windows.net","*.blob.core.chinacloudapi.cn","*.blob.core.cloudapi.de","*.blob.core.usgovcloudapi.net"],correlationHeaderDomains:void 0,correlationHeaderExcludePatterns:void 0,appId:void 0,enableCorsCorrelation:!1,enableRequestHeaderTracking:!1,enableResponseHeaderTracking:!1,enableAjaxErrorStatusText:!1,enableAjaxPerfTracking:!1,maxAjaxPerfLookupAttempts:3,ajaxPerfLookupDelay:25,ignoreHeaders:["Authorization","X-API-Key","WWW-Authenticate"]};return r},e.getEmptyConfig=function(){var r=this.getDefaultConfig();return Y(r,function(n){r[n]=void 0}),r},e.prototype.processTelemetry=function(r,n){this.processNext(r,n)},e.identifier="AjaxDependencyPlugin",e}(tt)});var fo=I(()=>{cc()});var po,lc,El,fc,Pi,mo=I(()=>{X();ro();oo();uo();fo();xe();lc=["snippet","dependencies","properties","_snippetVersion","appInsightsNew","getSKUDefaults"],El={Default:0,Required:1,Array:2,Hidden:4},fc={__proto__:null,PropertiesPluginIdentifier:zt,BreezeChannelIdentifier:zr,AnalyticsPluginIdentifier:Ii,Util:Cn,CorrelationIdHelper:bt,UrlHelper:Ba,DateTimeUtils:Ha,ConnectionStringParser:qa,FieldType:El,RequestHeaders:te,DisabledPropertyName:Et,ProcessLegacy:Ut,SampleRate:fr,HttpMethod:Rr,DEFAULT_BREEZE_ENDPOINT:dn,AIData:En,AIBase:Tn,Envelope:wn,Event:Ve,Exception:he,Metric:qe,PageView:ke,PageViewData:vr,RemoteDependencyData:je,Trace:Ze,PageViewPerformance:$e,Data:xt,SeverityLevel:Ot,ConfigurationManager:$a,ContextTagKeys:xr,DataSanitizer:ka,TelemetryItemCreator:rt,CtxTagKeys:re,Extensions:Ue,DistributedTracingModes:Ke},Pi=function(){function t(e){var r=this;r._snippetVersion=""+(e.sv||e.version||""),e.queue=e.queue||[],e.version=e.version||2;var n=e.config||{};if(n.connectionString){var i=gi(n.connectionString),a=i.ingestionendpoint;n.endpointUrl=a?a+"/v2/track":n.endpointUrl,n.instrumentationKey=i.instrumentationkey||n.instrumentationKey}r.appInsights=new Dn,r.properties=new kn,r.dependencies=new _n,r.core=new rn,r._sender=new Nn,r.snippet=e,r.config=n,r.getSKUDefaults()}return t.prototype.getCookieMgr=function(){return this.appInsights.getCookieMgr()},t.prototype.trackEvent=function(e,r){this.appInsights.trackEvent(e,r)},t.prototype.trackPageView=function(e){var r=e||{};this.appInsights.trackPageView(r)},t.prototype.trackPageViewPerformance=function(e){var r=e||{};this.appInsights.trackPageViewPerformance(r)},t.prototype.trackException=function(e){e&&!e.exception&&e.error&&(e.exception=e.error),this.appInsights.trackException(e)},t.prototype._onerror=function(e){this.appInsights._onerror(e)},t.prototype.trackTrace=function(e,r){this.appInsights.trackTrace(e,r)},t.prototype.trackMetric=function(e,r){this.appInsights.trackMetric(e,r)},t.prototype.startTrackPage=function(e){this.appInsights.startTrackPage(e)},t.prototype.stopTrackPage=function(e,r,n,i){this.appInsights.stopTrackPage(e,r,n,i)},t.prototype.startTrackEvent=function(e){this.appInsights.startTrackEvent(e)},t.prototype.stopTrackEvent=function(e,r,n){this.appInsights.stopTrackEvent(e,r,n)},t.prototype.addTelemetryInitializer=function(e){return this.appInsights.addTelemetryInitializer(e)},t.prototype.setAuthenticatedUserContext=function(e,r,n){n===void 0&&(n=!1),this.properties.context.user.setAuthenticatedUserContext(e,r,n)},t.prototype.clearAuthenticatedUserContext=function(){this.properties.context.user.clearAuthenticatedUserContext()},t.prototype.trackDependencyData=function(e){this.dependencies.trackDependencyData(e)},t.prototype.flush=function(e){var r=this;e===void 0&&(e=!0),ut(this.core,function(){return"AISKU.flush"},function(){R(r.core.getTransmissionControls(),function(n){R(n,function(i){i.flush(e)})})},null,e)},t.prototype.onunloadFlush=function(e){e===void 0&&(e=!0),R(this.core.getTransmissionControls(),function(r){R(r,function(n){n.onunloadFlush?n.onunloadFlush():n.flush(e)})})},t.prototype.loadAppInsights=function(e,r,n){var i=this;e===void 0&&(e=!1);var a=this;function o(u){if(u){var s="";x(a._snippetVersion)||(s+=a._snippetVersion),e&&(s+=".lg"),a.context&&a.context.internal&&(a.context.internal.snippetVer=s||"-"),Y(a,function(c,l){U(c)&&!B(l)&&c&&c[0]!=="_"&&lc.indexOf(c)===-1&&(u[c]=l)})}}return e&&a.config.extensions&&a.config.extensions.length>0&&De("Extensions not allowed in legacy mode"),ut(a.core,function(){return"AISKU.loadAppInsights"},function(){var u=[];u.push(a._sender),u.push(a.properties),u.push(a.dependencies),u.push(a.appInsights),a.core.initialize(a.config,u,r,n),a.context=a.properties.context,po&&a.context&&(a.context.internal.sdkSrc=po),o(a.snippet),a.emptyQueue(),a.pollInternalLogs(),a.addHousekeepingBeforeUnload(i)}),a},t.prototype.updateSnippetDefinitions=function(e){Jr(e,this,function(r){return r&&lc.indexOf(r)===-1})},t.prototype.emptyQueue=function(){var e=this;try{if(Re(e.snippet.queue)){for(var r=e.snippet.queue.length,n=0;n<r;n++){var i=e.snippet.queue[n];i()}e.snippet.queue=void 0,delete e.snippet.queue}}catch(o){var a={};o&&B(o.toString)&&(a.exception=o.toString())}},t.prototype.pollInternalLogs=function(){this.core.pollInternalLogs()},t.prototype.addHousekeepingBeforeUnload=function(e){if(or()||Jn()){var r=function(){e.onunloadFlush(!1),R(e.appInsights.core._extensions,function(i){if(i.identifier===zt)return i&&i.context&&i.context._sessionManager&&i.context._sessionManager.backup(),-1})};if(!e.appInsights.config.disableFlushOnBeforeUnload){var n=Lt("beforeunload",r);n=Lt("unload",r)||n,n=Lt("pagehide",r)||n,n=Lt("visibilitychange",r)||n,!n&&!ra()&&e.appInsights.core.logger.throwInternal(S.CRITICAL,h.FailedToAddHandlerForOnBeforeUnload,"Could not add handler for beforeunload and pagehide")}e.appInsights.config.disableFlushOnUnload||(Lt("pagehide",r),Lt("visibilitychange",r))}},t.prototype.getSender=function(){return this._sender},t.prototype.getSKUDefaults=function(){var e=this;e.config.diagnosticLogInterval=e.config.diagnosticLogInterval&&e.config.diagnosticLogInterval>0?e.config.diagnosticLogInterval:1e4},t}();(function(){var t=null,e=!1,r=["://js.monitor.azure.com/","://az416426.vo.msecnd.net/"];try{var n=(document||{}).currentScript;n&&(t=n.src)}catch(u){}if(t)try{var i=t.toLowerCase();if(i){for(var a="",o=0;o<r.length;o++)if(i.indexOf(r[o])!==-1){a="cdn"+(o+1),i.indexOf("/scripts/")===-1&&(i.indexOf("/next/")!==-1?a+="-next":i.indexOf("/beta/")!==-1&&(a+="-beta")),po=a+(e?".mod":"");break}}}catch(u){}})()});var wl,pc,dc=I(()=>{xe();X();wl=["snippet","getDefaultConfig","_hasLegacyInitializers","_queue","_processLegacyInitializers"],pc=function(){function t(e,r){this._hasLegacyInitializers=!1,this._queue=[],this.config=t.getDefaultConfig(e.config),this.appInsightsNew=r,this.context={addTelemetryInitializer:this.addTelemetryInitializers.bind(this)}}return t.getDefaultConfig=function(e){return e||(e={}),e.endpointUrl=e.endpointUrl||"https://dc.services.visualstudio.com/v2/track",e.sessionRenewalMs=30*60*1e3,e.sessionExpirationMs=24*60*60*1e3,e.maxBatchSizeInBytes=e.maxBatchSizeInBytes>0?e.maxBatchSizeInBytes:102400,e.maxBatchInterval=isNaN(e.maxBatchInterval)?15e3:e.maxBatchInterval,e.enableDebug=ee(e.enableDebug),e.disableExceptionTracking=ee(e.disableExceptionTracking),e.disableTelemetry=ee(e.disableTelemetry),e.verboseLogging=ee(e.verboseLogging),e.emitLineDelimitedJson=ee(e.emitLineDelimitedJson),e.diagnosticLogInterval=e.diagnosticLogInterval||1e4,e.autoTrackPageVisitTime=ee(e.autoTrackPageVisitTime),(isNaN(e.samplingPercentage)||e.samplingPercentage<=0||e.samplingPercentage>=100)&&(e.samplingPercentage=100),e.disableAjaxTracking=ee(e.disableAjaxTracking),e.maxAjaxCallsPerView=isNaN(e.maxAjaxCallsPerView)?500:e.maxAjaxCallsPerView,e.isBeaconApiDisabled=ee(e.isBeaconApiDisabled,!0),e.disableCorrelationHeaders=ee(e.disableCorrelationHeaders),e.correlationHeaderExcludedDomains=e.correlationHeaderExcludedDomains||["*.blob.core.windows.net","*.blob.core.chinacloudapi.cn","*.blob.core.cloudapi.de","*.blob.core.usgovcloudapi.net"],e.disableFlushOnBeforeUnload=ee(e.disableFlushOnBeforeUnload),e.disableFlushOnUnload=ee(e.disableFlushOnUnload,e.disableFlushOnBeforeUnload),e.enableSessionStorageBuffer=ee(e.enableSessionStorageBuffer,!0),e.isRetryDisabled=ee(e.isRetryDisabled),e.isCookieUseDisabled=ee(e.isCookieUseDisabled),e.isStorageUseDisabled=ee(e.isStorageUseDisabled),e.isBrowserLinkTrackingEnabled=ee(e.isBrowserLinkTrackingEnabled),e.enableCorsCorrelation=ee(e.enableCorsCorrelation),e},t.prototype.addTelemetryInitializers=function(e){var r=this;this._hasLegacyInitializers||(this.appInsightsNew.addTelemetryInitializer(function(n){r._processLegacyInitializers(n)}),this._hasLegacyInitializers=!0),this._queue.push(e)},t.prototype.getCookieMgr=function(){return this.appInsightsNew.getCookieMgr()},t.prototype.startTrackPage=function(e){this.appInsightsNew.startTrackPage(e)},t.prototype.stopTrackPage=function(e,r,n,i){this.appInsightsNew.stopTrackPage(e,r,n)},t.prototype.trackPageView=function(e,r,n,i,a){var o={name:e,uri:r,properties:n,measurements:i};this.appInsightsNew.trackPageView(o)},t.prototype.trackEvent=function(e,r,n){this.appInsightsNew.trackEvent({name:e})},t.prototype.trackDependency=function(e,r,n,i,a,o,u){this.appInsightsNew.trackDependencyData({id:e,target:n,type:i,duration:a,properties:{HttpMethod:r},success:o,responseCode:u})},t.prototype.trackException=function(e,r,n,i,a){this.appInsightsNew.trackException({exception:e})},t.prototype.trackMetric=function(e,r,n,i,a,o){this.appInsightsNew.trackMetric({name:e,average:r,sampleCount:n,min:i,max:a})},t.prototype.trackTrace=function(e,r,n){this.appInsightsNew.trackTrace({message:e,severityLevel:n})},t.prototype.flush=function(e){this.appInsightsNew.flush(e)},t.prototype.setAuthenticatedUserContext=function(e,r,n){this.appInsightsNew.context.user.setAuthenticatedUserContext(e,r,n)},t.prototype.clearAuthenticatedUserContext=function(){this.appInsightsNew.context.user.clearAuthenticatedUserContext()},t.prototype._onerror=function(e,r,n,i,a){this.appInsightsNew._onerror({message:e,url:r,lineNumber:n,columnNumber:i,error:a})},t.prototype.startTrackEvent=function(e){this.appInsightsNew.startTrackEvent(e)},t.prototype.stopTrackEvent=function(e,r,n){this.appInsightsNew.stopTrackEvent(e,r,n)},t.prototype.downloadAndSetup=function(e){De("downloadAndSetup not implemented in web SKU")},t.prototype.updateSnippetDefinitions=function(e){Jr(e,this,function(r){return r&&wl.indexOf(r)===-1})},t.prototype.loadAppInsights=function(){var e=this;if(this.config.iKey){var r=this.trackPageView;this.trackPageView=function(a,o,u){r.apply(e,[null,a,o,u])}}var n="logPageView";typeof this.snippet[n]=="function"&&(this[n]=function(a,o,u){e.trackPageView(null,a,o,u)});var i="logEvent";return typeof this.snippet[i]=="function"&&(this[i]=function(a,o,u){e.trackEvent(a,o,u)}),this},t.prototype._processLegacyInitializers=function(e){return e.tags[Ut]=this._queue,e},t}()});var mc,gc=I(()=>{dc();mo();X();mc=function(){function t(){}return t.getAppInsights=function(e,r){var n=new Pi(e),i=r!==2;if(Qt(),r===2)return n.updateSnippetDefinitions(e),n.loadAppInsights(i),n;var a=new pc(e,n);return a.updateSnippetDefinitions(e),n.loadAppInsights(i),a},t}()});var vc={};Cc(vc,{AppInsightsCore:()=>rn,ApplicationAnalytics:()=>Dn,ApplicationInsights:()=>Pi,ApplicationInsightsContainer:()=>mc,BaseCore:()=>en,BaseTelemetryPlugin:()=>tt,CoreUtils:()=>un,DependenciesPlugin:()=>_n,DistributedTracingModes:()=>Ke,Event:()=>Ve,Exception:()=>he,LoggingSeverity:()=>S,Metric:()=>qe,NotificationManager:()=>tn,PageView:()=>ke,PageViewPerformance:()=>$e,PerfEvent:()=>ur,PerfManager:()=>Qr,PropertiesPlugin:()=>kn,RemoteDependencyData:()=>je,Sender:()=>Nn,SeverityLevel:()=>Ot,Telemetry:()=>fc,Trace:()=>Ze,Util:()=>Cn,_InternalMessageId:()=>h,doPerf:()=>ut});var hc=I(()=>{mo();gc();X();xe();oo();ro();uo();fo()});function At(){let t="telemetry",e="enableTelemetry";try{let r=vscode__WEBPACK_IMPORTED_MODULE_0__.env.telemetryConfiguration;return r.isUsageEnabled&&r.isErrorsEnabled&&r.isCrashEnabled?"on":r.isErrorsEnabled&&r.isCrashEnabled?"error":"off"}catch(r){return vscode__WEBPACK_IMPORTED_MODULE_0__.env.isTelemetryEnabled!==void 0?vscode__WEBPACK_IMPORTED_MODULE_0__.env.isTelemetryEnabled?"on":"off":vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.getConfiguration(t).get(e)?"on":"off"}}var Di=class{constructor(e,r){this._isInstantiated=!1;this._eventQueue=[];this._exceptionQueue=[];this._clientFactory=r,this._key=e,At()!=="off"&&this.instantiateAppender()}logEvent(e,r){if(!this._telemetryClient){!this._isInstantiated&&At()==="on"&&this._eventQueue.push({eventName:e,data:r});return}this._telemetryClient.logEvent(e,r)}logException(e,r){if(!this._telemetryClient){!this._isInstantiated&&At()!=="off"&&this._exceptionQueue.push({exception:e,data:r});return}this._telemetryClient.logException(e,r)}flush(){return Vr(this,null,function*(){this._telemetryClient&&(yield this._telemetryClient.flush(),this._telemetryClient=void 0)})}_flushQueues(){this._eventQueue.forEach(({eventName:e,data:r})=>this.logEvent(e,r)),this._eventQueue=[],this._exceptionQueue.forEach(({exception:e,data:r})=>this.logException(e,r)),this._exceptionQueue=[]}instantiateAppender(){this._isInstantiated||this._clientFactory(this._key).then(e=>{this._telemetryClient=e,this._isInstantiated=!0,this._flushQueues()}).catch(e=>{console.error(e)})}};var Ni=class{constructor(e,r,n,i,a){this.extensionId=e;this.extensionVersion=r;this.telemetryAppender=n;this.osShim=i;this.firstParty=!1;this.userOptIn=!1;this.errorOptIn=!1;this.disposables=[];this.firstParty=!!a,this.updateUserOptStatus(),vscode__WEBPACK_IMPORTED_MODULE_0__.env.onDidChangeTelemetryEnabled!==void 0?(this.disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.env.onDidChangeTelemetryEnabled(()=>this.updateUserOptStatus())),this.disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.onDidChangeConfiguration(()=>this.updateUserOptStatus()))):this.disposables.push(vscode__WEBPACK_IMPORTED_MODULE_0__.workspace.onDidChangeConfiguration(()=>this.updateUserOptStatus()))}updateUserOptStatus(){let e=At();this.userOptIn=e==="on",this.errorOptIn=e==="error"||this.userOptIn,(this.userOptIn||this.errorOptIn)&&this.telemetryAppender.instantiateAppender()}cleanRemoteName(e){if(!e)return"none";let r="other";return["ssh-remote","dev-container","attached-container","wsl","codespaces"].forEach(n=>{e.indexOf(`${n}`)===0&&(r=n)}),r}get extension(){return this._extension===void 0&&(this._extension=vscode__WEBPACK_IMPORTED_MODULE_0__.extensions.getExtension(this.extensionId)),this._extension}cloneAndChange(e,r){if(e===null||typeof e!="object"||typeof r!="function")return e;let n={};for(let i in e)n[i]=r(i,e[i]);return n}shouldSendErrorTelemetry(){return this.errorOptIn===!1?!1:this.firstParty?!(vscode__WEBPACK_IMPORTED_MODULE_0__.env.remoteName&&this.cleanRemoteName(vscode__WEBPACK_IMPORTED_MODULE_0__.env.remoteName)==="other"):!0}getCommonProperties(){let e=Object.create(null);if(e["common.os"]=this.osShim.platform,e["common.nodeArch"]=this.osShim.architecture,e["common.platformversion"]=(this.osShim.release||"").replace(/^(\d+)(\.\d+)?(\.\d+)?(.*)/,"$1$2$3"),e["common.extname"]=this.extensionId,e["common.extversion"]=this.extensionVersion,vscode__WEBPACK_IMPORTED_MODULE_0__&&vscode__WEBPACK_IMPORTED_MODULE_0__.env){switch(e["common.vscodemachineid"]=vscode__WEBPACK_IMPORTED_MODULE_0__.env.machineId,e["common.vscodesessionid"]=vscode__WEBPACK_IMPORTED_MODULE_0__.env.sessionId,e["common.vscodeversion"]=vscode__WEBPACK_IMPORTED_MODULE_0__.version,e["common.isnewappinstall"]=vscode__WEBPACK_IMPORTED_MODULE_0__.env.isNewAppInstall?vscode__WEBPACK_IMPORTED_MODULE_0__.env.isNewAppInstall.toString():"false",e["common.product"]=vscode__WEBPACK_IMPORTED_MODULE_0__.env.appHost,vscode__WEBPACK_IMPORTED_MODULE_0__.env.uiKind){case vscode__WEBPACK_IMPORTED_MODULE_0__.UIKind.Web:e["common.uikind"]="web";break;case vscode__WEBPACK_IMPORTED_MODULE_0__.UIKind.Desktop:e["common.uikind"]="desktop";break;default:e["common.uikind"]="unknown"}e["common.remotename"]=this.cleanRemoteName(vscode__WEBPACK_IMPORTED_MODULE_0__.env.remoteName)}return e}anonymizeFilePaths(e,r){let n;if(e==null)return"";let i=[];vscode__WEBPACK_IMPORTED_MODULE_0__.env.appRoot!==""&&i.push(new RegExp(vscode__WEBPACK_IMPORTED_MODULE_0__.env.appRoot.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi")),this.extension&&i.push(new RegExp(this.extension.extensionPath.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"));let a=e;if(r){let o=[];for(let l of i)for(;(n=l.exec(e))&&n;)o.push([n.index,l.lastIndex]);let u=/^[\\/]?(node_modules|node_modules\.asar)[\\/]/,s=/(file:\/\/)?([a-zA-Z]:(\\\\|\\|\/)|(\\\\|\\|\/))?([\w-._]+(\\\\|\\|\/))+[\w-._]*/g,c=0;for(a="";(n=s.exec(e))&&n;)n[0]&&!u.test(n[0])&&o.every(([l,f])=>n.index<l||n.index>=f)&&(a+=e.substring(c,n.index)+"<REDACTED: user-file-path>",c=s.lastIndex);c<e.length&&(a+=e.substr(c))}for(let o of i)a=a.replace(o,"");return a}removePropertiesWithPossibleUserInfo(e){if(typeof e!="object")return;let r=Object.create(null);for(let n of Object.keys(e)){let i=e[n];if(!i)continue;let a=/@[a-zA-Z0-9-.]+/,o=/(key|token|sig|signature|password|passwd|pwd|android:value)[^a-zA-Z0-9]/,u=/xox[pbaors]-[a-zA-Z0-9]+-[a-zA-Z0-9-]+?/;o.test(i.toLowerCase())?r[n]="<REDACTED: secret>":a.test(i)?r[n]="<REDACTED: email>":u.test(i)?r[n]="<REDACTED: token>":r[n]=i}return r}get telemetryLevel(){switch(At()){case"on":return"all";case"error":return"error";case"off":return"off"}}sendTelemetryEvent(e,r,n){if(this.userOptIn&&e!==""){r=Xe(Xe({},r),this.getCommonProperties());let i=this.cloneAndChange(r,(a,o)=>this.anonymizeFilePaths(o,this.firstParty));this.telemetryAppender.logEvent(`${this.extensionId}/${e}`,{properties:this.removePropertiesWithPossibleUserInfo(i),measurements:n})}}sendRawTelemetryEvent(e,r,n){this.userOptIn&&e!==""&&(r=Xe(Xe({},r),this.getCommonProperties()),this.telemetryAppender.logEvent(`${this.extensionId}/${e}`,{properties:r,measurements:n}))}sendTelemetryErrorEvent(e,r,n,i){if(this.errorOptIn&&e!==""){r=Xe(Xe({},r),this.getCommonProperties());let a=this.cloneAndChange(r,(o,u)=>this.shouldSendErrorTelemetry()?this.anonymizeFilePaths(u,this.firstParty):i===void 0||i.indexOf(o)!==-1?"REDACTED":this.anonymizeFilePaths(u,this.firstParty));this.telemetryAppender.logEvent(`${this.extensionId}/${e}`,{properties:this.removePropertiesWithPossibleUserInfo(a),measurements:n})}}sendTelemetryException(e,r,n){if(this.shouldSendErrorTelemetry()&&this.errorOptIn&&e){r=Xe(Xe({},r),this.getCommonProperties());let i=this.cloneAndChange(r,(a,o)=>this.anonymizeFilePaths(o,this.firstParty));e.stack&&(e.stack=this.anonymizeFilePaths(e.stack,this.firstParty)),this.telemetryAppender.logException(e,{properties:this.removePropertiesWithPossibleUserInfo(i),measurements:n})}}dispose(){return this.telemetryAppender.flush(),Promise.all(this.disposables.map(e=>e.dispose()))}};var bl=t=>Vr(void 0,null,function*(){let e;try{let n=yield Promise.resolve().then(()=>(hc(),vc)),i;t&&t.indexOf("AIF-")===0&&(i="https://vortex.data.microsoft.com/collect/v1"),e=new n.ApplicationInsights({config:{instrumentationKey:t,endpointUrl:i,disableAjaxTracking:!0,disableExceptionTracking:!0,disableFetchTracking:!0,disableCorrelationHeaders:!0,disableCookiesUsage:!0,autoTrackPageVisitTime:!1,emitLineDelimitedJson:!0,disableInstrumentationKeyValidation:!0}}),e.loadAppInsights();let a=At();i&&a!=="off"&&fetch(i).catch(()=>e=void 0)}catch(n){return Promise.reject(n)}return{logEvent:(n,i)=>{e==null||e.trackEvent({name:n},Xe(Xe({},i==null?void 0:i.properties),i==null?void 0:i.measurements))},logException:(n,i)=>{e==null||e.trackException({exception:n,properties:Xe(Xe({},i==null?void 0:i.properties),i==null?void 0:i.measurements)})},flush:()=>Vr(void 0,null,function*(){e==null||e.flush()})}}),xc=class extends Ni{constructor(e,r,n,i){let a=new Di(n,bl);n&&n.indexOf("AIF-")===0&&(i=!0);super(e,r,a,{release:navigator.appVersion,platform:"web",architecture:"web"},i)}};
/*!
 * Microsoft Dynamic Proto Utility, 1.1.4
 * Copyright (c) Microsoft and contributors. All rights reserved.
 */


/***/ }),
/* 113 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Log = exports.getLogger = void 0;
const vscode = __importStar(__webpack_require__(1));
const util_1 = __webpack_require__(25);
let loggerMap = new Map();
function getLogger(type) {
    const friendlyName = type === util_1.AuthProviderType.github ? 'GitHub' : 'GitHub Enterprise';
    let logger = loggerMap.get(friendlyName);
    if (!logger) {
        logger = new Log(type);
        loggerMap.set(friendlyName, logger);
    }
    return logger;
}
exports.getLogger = getLogger;
class Log {
    constructor(type) {
        this.type = type;
        const friendlyName = this.type === util_1.AuthProviderType.github ? 'GitHub' : 'GitHub Enterprise';
        this.output = vscode.window.createOutputChannel(`${friendlyName} Authentication`);
    }
    data2String(data) {
        if (data instanceof Error) {
            return data.stack || data.message;
        }
        if (data.success === false && data.message) {
            return data.message;
        }
        return data.toString();
    }
    trace(message, data) {
        this.logLevel('Trace', message, data);
    }
    info(message, data) {
        this.logLevel('Info', message, data);
    }
    error(message, data) {
        this.logLevel('Error', message, data);
    }
    logLevel(level, message, data) {
        this.output.appendLine(`[${level}  - ${this.now()}] ${message}`);
        if (data) {
            this.output.appendLine(this.data2String(data));
        }
    }
    now() {
        const now = new Date();
        return (padLeft(now.getUTCHours() + '', 2, '0') +
            ':' +
            padLeft(now.getMinutes() + '', 2, '0') +
            ':' +
            padLeft(now.getUTCSeconds() + '', 2, '0') +
            '.' +
            now.getMilliseconds());
    }
}
exports.Log = Log;
function padLeft(s, n, pad = ' ') {
    return pad.repeat(Math.max(0, n - s.length)) + s;
}


/***/ }),
/* 114 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.cloudStudioLogin = exports.getCloudStudioSessions = exports.defaultScopes = exports.isCloudStudio = void 0;
const vscode = __importStar(__webpack_require__(1));
const uuid_1 = __webpack_require__(3);
const node_fetch_1 = __importDefault(__webpack_require__(19));
const https_1 = __webpack_require__(115);
const lodash_difference_1 = __importDefault(__webpack_require__(13));
const logger_1 = __webpack_require__(113);
const nls = __importStar(__webpack_require__(16));
const util_1 = __webpack_require__(25);
const utils_1 = __webpack_require__(20);
const commonExtension_1 = __webpack_require__(116);
const localize = nls.loadMessageBundle();
exports.isCloudStudio = commonExtension_1.commonExtension.isCloudStudio;
const apiOrigin = exports.isCloudStudio ? commonExtension_1.commonExtension.origin : 'https://wx.cloudstudio.net/api';
let logger = (0, logger_1.getLogger)(util_1.AuthProviderType.github);
exports.defaultScopes = ['user', 'user:email', 'read:user', 'write:public_key', 'repo', 'workflow'];
let cookieCache;
async function getCookie() {
    if (!cookieCache) {
        const cookie = await vscode.commands.executeCommand('cloudstudio.getCookie');
        if (cookie) {
            const cookieArr = cookie.split(';');
            cookieCache = cookieArr
                .filter((item) => !!item)
                .map((item) => {
                const [key, value] = item.split('=') || [];
                const val = encodeURIComponent(value);
                return `${key}=${val}`;
            })
                .join(';');
        }
    }
    return cookieCache;
}
async function getAccessToken() {
    let baseUrl = new URL(apiOrigin);
    baseUrl.pathname = '/api/integrations/github/access_token';
    return (0, node_fetch_1.default)(baseUrl.toString(), {
        headers: {
            cookie: await getCookie(),
        },
        agent: new https_1.Agent({ rejectUnauthorized: false }),
    })
        .then(async (result) => {
        const json = (await result.json());
        logger.trace(`get accessTokens result: ${baseUrl.toString()}`, JSON.stringify(json));
        if (json.code === 0) {
            json.data.forEach((item) => {
                item.accessToken = item.accessToken.replace('Bearer ', '');
            });
            return json.data;
        }
        logger.error(`get accessTokens error: ${json.msg || json.semanticization}`);
        return [];
    })
        .catch((e) => {
        logger.error(`get accessTokens fail: ${e.message ?? e}`);
        return [];
    });
}
let time;
function getAccessTokenBySign(baseUrl, sign, onDidAuthorize) {
    baseUrl.pathname = `/api/public/oauth/code/access_token/${sign}`;
    time = setTimeout(async () => {
        (0, node_fetch_1.default)(baseUrl.toString(), {
            headers: {
                cookie: await getCookie(),
            },
            agent: new https_1.Agent({ rejectUnauthorized: false }),
        })
            .then(async (result) => {
            const json = (await result.json());
            if (json.code === 0 && json.data) {
                onDidAuthorize.fire(json.data.accessToken.replace('Bearer ', ''));
                return;
            }
            if (json.code !== 0) {
                logger.error(`get accessToken error:${json.semanticization || json.msg}`);
            }
            getAccessTokenBySign(baseUrl, sign, onDidAuthorize);
        })
            .catch((e) => {
            logger.error(`get AccessToken fail: ${e.message ?? e}`);
            getAccessTokenBySign(baseUrl, sign, onDidAuthorize);
        });
    }, 1500);
}
async function getCloudStudioSessions(sessions) {
    if (exports.isCloudStudio && !(await commonExtension_1.commonExtension.getUserInfo()).authenticationUserInfo.trial) {
        let accessTokns = await getAccessToken();
        accessTokns = accessTokns.filter((item) => sessions.findIndex((local) => item.accessToken === local.accessToken) < 0);
        if (accessTokns.length > 0) {
            const serverSession = await Promise.all(accessTokns.map((item) => {
                return {
                    id: (0, uuid_1.v4)(),
                    accessToken: item.accessToken,
                    account: { label: item.team, id: item.providerId },
                    scopes: ['repo', 'workflow', 'user:email', 'read:user'],
                };
            }));
            sessions.splice(0, 0, ...serverSession);
        }
    }
}
exports.getCloudStudioSessions = getCloudStudioSessions;
function getCookieValue(name, cookie) {
    const match = cookie.match('(^|[^;]+)\\s*\\b' + name + '\\b\\s*=\\s*([^;]+)');
    return match ? match.pop() : '';
}
function generateCsrfCode(cookie) {
    // 优先取腾讯云 skey，若没有则取 SaaS 的 cloudstudio-session
    const skey = getCookieValue('skey', cookie) || getCookieValue('cloudstudio-session', cookie);
    if (!skey) {
        return null;
    }
    let hash = 5381;
    for (let i = 0, len = skey.length; i < len; ++i) {
        hash += (hash << 5) + skey.charCodeAt(i);
    }
    const csrfCode = hash & 0x7fffffff;
    return csrfCode;
}
async function cloudStudioLogin(scopes) {
    const sign = (0, uuid_1.v4)();
    scopes.push('user', 'write:public_key');
    let baseUrl = new URL(apiOrigin);
    baseUrl.pathname = `/api/public/github/authorize`;
    const url = new URL(baseUrl.toString());
    url.searchParams.append('scope', scopes.join(','));
    const cookie = (await vscode.commands.executeCommand('cloudstudio.getCookie')) || '';
    const xsrfToken = generateCsrfCode(cookie);
    if (xsrfToken) {
        url.searchParams.append('_csrf', xsrfToken.toString());
    }
    const xsrfTokenPatamStr = xsrfToken ? `?_csrf=${xsrfToken}` : '';
    let redirectUri = apiOrigin;
    logger.trace('difference', (0, lodash_difference_1.default)(scopes, exports.defaultScopes));
    if (exports.isCloudStudio &&
        !(await commonExtension_1.commonExtension.getUserInfo()).authenticationUserInfo.trial &&
        (0, lodash_difference_1.default)(scopes, exports.defaultScopes).length === 0) {
        redirectUri += `/integrations/associate/${sign}${xsrfTokenPatamStr}`;
    }
    else {
        redirectUri += `/public/oauth/code/callback/${sign}${xsrfTokenPatamStr}`;
    }
    url.searchParams.append('redirect_uri', redirectUri);
    // 这里使用 string 作为 openExternal 的入参，是因为转换为 Uri 之后会导致 redirect_uri urlEncode 异常
    vscode.env.openExternal(url.toString());
    const onDidAuthorize = new vscode.EventEmitter();
    getAccessTokenBySign(baseUrl, sign, onDidAuthorize);
    return await doLoginCoding(onDidAuthorize);
}
exports.cloudStudioLogin = cloudStudioLogin;
async function doLoginCoding(onDidAuthorize) {
    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize('signingIn', 'Signing in to github.com...'),
        cancellable: true,
    }, async (_, token) => {
        const codeExchangePromise = (0, utils_1.promiseFromEvent)(onDidAuthorize.event, (result, resolve, reject) => {
            if (result instanceof Error) {
                reject(result);
            }
            else {
                resolve(result);
            }
        });
        let accessToken = '';
        try {
            accessToken = await Promise.race([
                codeExchangePromise.promise,
                new Promise((_, reject) => setTimeout(() => reject('Cancelled'), 60000)),
                (0, utils_1.promiseFromEvent)(token.onCancellationRequested, (_, __, reject) => {
                    reject('User Cancelled');
                }).promise,
            ]);
        }
        finally {
            codeExchangePromise?.cancel.fire();
            clearTimeout(time);
        }
        return accessToken;
    });
}


/***/ }),
/* 115 */
/***/ (() => {

/* (ignored) */

/***/ }),
/* 116 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.commonExtension = void 0;
const vscode = __importStar(__webpack_require__(1));
exports.commonExtension = vscode.extensions.getExtension('CloudStudio.common')?.exports || {};


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	var __webpack_export_target__ = exports;
/******/ 	for(var i in __webpack_exports__) __webpack_export_target__[i] = __webpack_exports__[i];
/******/ 	if(__webpack_exports__.__esModule) Object.defineProperty(__webpack_export_target__, "__esModule", { value: true });
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map