/*
 * GNU AGPL-3.0 License
 *
 * Copyright (c) 2021 - present core.ai . All rights reserved.
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

/*global Phoenix*/
/*eslint no-console: 0*/
/*eslint strict: ["error", "global"]*/
/* jshint ignore:start */

define(function (require, exports, module) {
    let Survey       = require("survey"),
        serverSync   = require("serverSync"),
        newProject   = require("new-project"),
        startupProject   = require("startup-project"),
        newFeature   = require("newly-added-features"),
        AppInit      = brackets.getModule("utils/AppInit"),
        Strings      = brackets.getModule("strings"),
        Dialogs     = brackets.getModule("widgets/Dialogs"),
        Mustache           = brackets.getModule("thirdparty/mustache/mustache"),
        unSupportedBrowserTemplate     = require("text!unsupported-browser.html");

    let $icon;

    function _addToolbarIcon() {
        const helpButtonID = "help-button";
        $icon = $("<a>")
            .attr({
                id: helpButtonID,
                href: "#",
                class: "help",
                title: Strings.CMD_SUPPORT
            })
            .appendTo($("#main-toolbar .bottom-buttons"));
        $icon.on('click', ()=>{
            window.open(brackets.config.support_url);
        });
    }
    function _showUnSupportedBrowserDialogue() {
        var templateVars = {
            Strings: Strings,
            surveyURL: "https://s.surveyplanet.com/6208d1eccd51c561fc8e59ca"
        };
        Dialogs.showModalDialogUsingTemplate(Mustache.render(unSupportedBrowserTemplate, templateVars));
    }

    function _detectUnSupportedBrowser() {
        let supportedBrowser = Phoenix.browser.isDeskTop && (Phoenix.browser.desktop.isChrome ||
            Phoenix.browser.desktop.isEdgeChromium || Phoenix.browser.desktop.isOperaChromium);
        if(!supportedBrowser){
            _showUnSupportedBrowserDialogue();
        }
    }

    AppInit.appReady(function () {
        _addToolbarIcon();
        Survey.init();
        serverSync.init();
        startupProject.init();
        newProject.init();
        newFeature.init();
        _detectUnSupportedBrowser();
    });
});
