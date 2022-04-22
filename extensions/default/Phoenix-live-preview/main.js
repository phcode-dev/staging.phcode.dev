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
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, brackets */
//jshint-ignore:no-start

define(function (require, exports, module) {
    let ExtensionUtils     = brackets.getModule("utils/ExtensionUtils"),
        CommandManager     = brackets.getModule("command/CommandManager"),
        Commands           = brackets.getModule("command/Commands"),
        Menus              = brackets.getModule("command/Menus"),
        WorkspaceManager   = brackets.getModule("view/WorkspaceManager"),
        AppInit            = brackets.getModule("utils/AppInit"),
        ProjectManager     = brackets.getModule("project/ProjectManager"),
        EditorManager      = brackets.getModule("editor/EditorManager"),
        DocumentManager    = brackets.getModule("document/DocumentManager"),
        Strings            = brackets.getModule("strings"),
        Mustache           = brackets.getModule("thirdparty/mustache/mustache"),
        marked = require('thirdparty/marked.min'),
        utils = require('utils');

    // TODO markdown advanced rendering options https://marked.js.org/using_advanced
    marked.setOptions({
        renderer: new marked.Renderer(),
        // highlight: function(code, lang) {
        //     const hljs = require('highlight.js');
        //     const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        //     return hljs.highlight(code, { language }).value;
        // },
        // langPrefix: 'hljs language-', // highlight.js css expects a top-level 'hljs' class.
        pedantic: false,
        gfm: true,
        breaks: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false
    });


    // Templates
    let panelHTML       = require("text!panel.html"),
        markdownHTML = require("text!markdown.html");
    ExtensionUtils.loadStyleSheet(module, "live-preview.css");

    // jQuery objects
    let $icon,
        $iframe,
        $panel,
        $pinUrlBtn,
        $livePreviewPopBtn,
        $reloadBtn;

    // Other vars
    let panel,
        urlPinned,
        tab = null;

    function _setPanelVisibility(isVisible) {
        if (isVisible) {
            $icon.toggleClass("active");
            panel.show();
            _loadPreview(true);
        } else {
            $icon.toggleClass("active");
            panel.hide();
        }
    }

    function _toggleVisibility() {
        let visible = !panel.isVisible();
        _setPanelVisibility(visible);
    }

    function _togglePinUrl() {
        let pinStatus = $pinUrlBtn.hasClass('pin-icon');
        if(pinStatus){
            $pinUrlBtn.removeClass('pin-icon').addClass('unpin-icon');
        } else {
            $pinUrlBtn.removeClass('unpin-icon').addClass('pin-icon');
        }
        urlPinned = !pinStatus;
        _loadPreview();
    }

    function _popoutLivePreview() {
        if(!tab || tab.closed){
            tab = open();
        }
        _loadPreview(true);
    }

    function _setTitle(fileName) {
        let message = Strings.LIVE_DEV_SELECT_FILE_TO_PREVIEW;
        if(fileName){
            message = `${fileName} - ${Strings.LIVE_DEV_STATUS_TIP_OUT_OF_SYNC}`;
        }
        document.getElementById("panel-live-preview-title").textContent = `${message}`;
    }

    async function _createExtensionPanel() {
        let templateVars = {
            Strings: Strings,
            livePreview: Strings.LIVE_DEV_STATUS_TIP_OUT_OF_SYNC,
            clickToReload: Strings.LIVE_DEV_CLICK_TO_RELOAD_PAGE,
            clickToPopout: Strings.LIVE_DEV_CLICK_POPOUT,
            clickToPinUnpin: Strings.LIVE_DEV_CLICK_TO_PIN_UNPIN
        };
        const PANEL_MIN_SIZE = 50;
        const INITIAL_PANEL_SIZE = document.body.clientWidth/2.5;
        $icon = $("#toolbar-go-live");
        $icon.click(_toggleVisibility);
        $panel = $(Mustache.render(panelHTML, templateVars));
        $iframe = $panel.find("#panel-live-preview-frame");
        $pinUrlBtn = $panel.find("#pinURLButton");
        $reloadBtn = $panel.find("#reloadButton");
        $livePreviewPopBtn = $panel.find("#livePreviewPopoutButton");
        $iframe[0].onload = function () {
            $iframe.attr('srcdoc', null);
        };

        panel = WorkspaceManager.createPluginPanel("live-preview-panel", $panel,
            PANEL_MIN_SIZE, $icon, INITIAL_PANEL_SIZE);

        WorkspaceManager.recomputeLayout(false);
        $pinUrlBtn.click(_togglePinUrl);
        $livePreviewPopBtn.click(_popoutLivePreview);
        $reloadBtn.click(()=>{
            _loadPreview(true);
        });
    }

    function _renderMarkdown(fullPath) {
        DocumentManager.getDocumentForPath(fullPath)
            .done(function (doc) {
                let text = doc.getText();
                let markdownHtml = marked.parse(text);
                let templateVars = {
                    markdownContent: markdownHtml
                };
                let html = Mustache.render(markdownHTML, templateVars);
                $iframe.attr('srcdoc', html);
                if(tab && !tab.closed){
                    tab.location = "about:blank";
                    setTimeout(()=>{
                        tab.window.document.write(html);
                    }, 10); // timer hack, location and content cannot be set in a row,
                    // we should move to iframe embedded controls
                }
            })
            .fail(function (err) {
                console.error(`Markdown rendering failed for ${fullPath}: `, err);
            });
    }

    function _renderPreview(previewDetails, newSrc) {
        if(previewDetails.isMarkdownFile){
            let fullPath = previewDetails.fullPath;
            $iframe.attr('src', 'about:blank');
            _renderMarkdown(fullPath);
        } else {
            $iframe.attr('srcdoc', null);
            $iframe.attr('src', newSrc);
            if(tab && !tab.closed){
                tab.location = newSrc;
            }
        }
    }

    let savedScrollPositions = {};
    async function _loadPreview(force) {
        if(panel.isVisible() || (tab && !tab.closed)){
            let scrollX = $iframe[0].contentWindow.scrollX;
            let scrollY = $iframe[0].contentWindow.scrollY;
            let currentSrc = $iframe.src || utils.getNoPreviewURL();
            savedScrollPositions[currentSrc] = {
                scrollX: scrollX,
                scrollY: scrollY
            };
            // panel-live-preview-title
            let previewDetails = await utils.getPreviewDetails();
            let newSrc = currentSrc;
            if (!urlPinned && previewDetails.URL) {
                newSrc = encodeURI(previewDetails.URL);
                _setTitle(previewDetails.filePath);
            }
            $iframe[0].onload = function () {
                if(currentSrc === newSrc){
                    $iframe[0].contentWindow.scrollTo(scrollX, scrollY);
                } else {
                    let savedPositions = savedScrollPositions[newSrc];
                    if(savedPositions){
                        $iframe[0].contentWindow.scrollTo(savedPositions.scrollX, savedPositions.scrollY);
                    }
                }
            };
            if(currentSrc !== newSrc || force){
                $iframe.src = newSrc;
                _renderPreview(previewDetails, newSrc);
            }
        }
    }

    function _projectFileChanges(evt, changedFile) {
        if(changedFile.fullPath !== '/fs/app/state.json'){
            // we are getting this change event somehow.
            // bug, investigate why we get this change event as a project file change.
            _loadPreview(true);
        }
    }

    function _projectOpened() {
        if(urlPinned){
            _togglePinUrl();
        }
        $iframe[0].src = utils.getNoPreviewURL();
        if(tab && !tab.closed){
            tab.location = utils.getNoPreviewURL();
        }
        if(!panel.isVisible()){
            return;
        }
        _loadPreview(true);
    }

    AppInit.appReady(function () {
        _createExtensionPanel();
        ProjectManager.on(ProjectManager.EVENT_PROJECT_OPEN, _loadPreview);
        ProjectManager.on(ProjectManager.EVENT_PROJECT_FILE_CHANGED, _projectFileChanges);
        EditorManager.on("activeEditorChange", _loadPreview);
        ProjectManager.on(ProjectManager.EVENT_PROJECT_OPEN, _projectOpened);
        CommandManager.register(Strings.CMD_LIVE_FILE_PREVIEW,  Commands.FILE_LIVE_FILE_PREVIEW, function () {
            _toggleVisibility();
        });
        let fileMenu = Menus.getMenu(Menus.AppMenuBar.FILE_MENU);
        fileMenu.addMenuItem(Commands.FILE_LIVE_FILE_PREVIEW, "", Menus.BEFORE, Commands.FILE_PROJECT_SETTINGS);
        // We always show the live preview panel on startup if there is a preview file
        setTimeout(async ()=>{
            let previewDetails = await utils.getPreviewDetails();
            if(previewDetails.filePath){
                // only show if there is some file to preview and not the default no-preview preview on startup
                _setPanelVisibility(true);
            }
        }, 1000);
    });
});


