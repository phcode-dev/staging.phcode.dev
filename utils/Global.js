/*
 * GNU AGPL-3.0 License
 *
 * Copyright (c) 2021 - present core.ai . All rights reserved.
 * Original work Copyright (c) 2012 - 2021 Adobe Systems Incorporated. All rights reserved.
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://opensource.org/licenses/AGPL-3.0.
 *
 */

/**
 * Initializes the global "brackets" variable and it's properties.
 * Modules should not access the global.brackets object until either
 * (a) the module requires this module, i.e. require("utils/Global") or
 * (b) the module receives a "appReady" callback from the utils/AppReady module.
 */
define(function (require, exports, module) {


    var configJSON  = require("text!config.json"),
        UrlParams   = require("utils/UrlParams").UrlParams;

    // Define core brackets namespace if it isn't already defined
    //
    // We can't simply do 'brackets = {}' to define it in the global namespace because
    // we're in "use strict" mode. Most likely, 'window' will always point to the global
    // object when this code is running. However, in case it isn't (e.g. if we're running
    // inside Node for CI testing) we use this trick to get the global object.
    var Fn = Function, global = (new Fn("return this"))();
    if (!global.brackets) {

        // Earlier brackets object was initialized at
        // https://github.com/adobe/brackets-shell/blob/908ed1503995c1b5ae013473c4b181a9aa64fd22/appshell/appshell_extensions.js#L945.
        // With the newer versions of CEF, the initialization was crashing the render process, citing
        // JS eval error. So moved the brackets object initialization from appshell_extensions.js to here.
        if (global.appshell) {
            global.brackets = global.appshell;
        } else {
            global.brackets = {};
        }
    }

    // Parse URL params
    var params = new UrlParams();
    params.parse();

    // Parse src/config.json
    try {
        global.brackets.metadata = JSON.parse(configJSON);
        global.brackets.config = global.brackets.metadata.config;
    } catch (err) {
        console.log(err);
    }

    // Uncomment the following line to force all low level file i/o routines to complete
    // asynchronously. This should only be done for testing/debugging.
    // NOTE: Make sure this line is commented out again before committing!
    //brackets.forceAsyncCallbacks = true;

    // Load native shell when brackets is run in a native shell rather than the browser
    // TODO: (issue #266) load conditionally
    global.brackets.shellAPI = require("utils/ShellAPI");

    // Determine OS/platform
    if (global.navigator.platform === "MacIntel" || global.navigator.platform === "MacPPC") {
        global.brackets.platform = "mac";
    } else if (global.navigator.platform.indexOf("Linux") >= 0) {
        global.brackets.platform = "linux";
    } else {
        global.brackets.platform = "win";
    }

    // Expose platform info for build applicability consumption
    global.brackets.getPlatformInfo = function () {
        var OS = "";

        if (/Windows|Win32|WOW64|Win64/.test(window.navigator.userAgent)) {
            OS = "WIN";
        } else if (/Mac/.test(window.navigator.userAgent)) {
            OS = "OSX";
        } else if (/Linux|X11/.test(window.navigator.userAgent)) {
            OS = "LINUX32";
            if (/x86_64/.test(window.navigator.appVersion + window.navigator.userAgent)) {
                OS = "LINUX64";
            }
        }

        return OS;
    };

    global.brackets.nativeMenus = false;

    // Locale-related APIs
    global.brackets.isLocaleDefault = function () {
        return !global.localStorage.getItem("locale");
    };

    global.brackets.getLocale = function () {
        // By default use the locale that was determined in brackets.js
        return params.get("testEnvironment") ? "en" : (global.localStorage.getItem("locale") || global.require.s.contexts._.config.locale);
    };

    global.brackets.setLocale = function (locale) {
        if (locale) {
            global.localStorage.setItem("locale", locale);
        } else {
            global.localStorage.removeItem("locale");
        }
    };

    // Create empty app namespace if running in-browser
    if (!global.brackets.app) {
        global.brackets.app = global.Phoenix.app;
    }

    // Loading extensions requires creating new require.js contexts, which
    // requires access to the global 'require' object that always gets hidden
    // by the 'require' in the AMD wrapper. We store this in the brackets
    // object here so that the ExtensionLoader doesn't have to have access to
    // the global object.
    global.brackets.libRequire = global.require;

    // Also store our current require.js context (the one that loads brackets
    // core modules) so that extensions can use it.
    // Note: we change the name to "getModule" because this won't do exactly
    // the same thing as 'require' in AMD-wrapped modules. The extension will
    // only be able to load modules that have already been loaded once.
    global.brackets.getModule = require;

    /* API for retrieving the global RequireJS config
     * For internal use only
     */
    global.brackets._getGlobalRequireJSConfig = function () {
        return global.require.s.contexts._.config;
    };

    exports.global = global;
});
