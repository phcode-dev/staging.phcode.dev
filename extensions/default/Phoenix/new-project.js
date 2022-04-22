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

define(function (require, exports, module) {
    let Dialogs = brackets.getModule("widgets/Dialogs"),
        Mustache = brackets.getModule("thirdparty/mustache/mustache"),
        FeatureGate = brackets.getModule("utils/FeatureGate"),
        newProjectTemplate = require("text!new-project-template.html"),
        Strings = brackets.getModule("strings"),
        EventDispatcher = brackets.getModule("utils/EventDispatcher"),
        EventManager = brackets.getModule("utils/EventManager");

    const FEATURE_NEW_PROJECT_DIALOGUE = 'newProjectDialogue',
        EVENT_HANDLER_NEW_PROJECT = "Extn.Phoenix.newProject",
        EVENT_CLOSE_DIALOGUE = "closeDialogue";

    EventDispatcher.makeEventDispatcher(exports);
    EventManager.registerEventHandler(EVENT_HANDLER_NEW_PROJECT, exports);

    let dialogue;

    // TODO: change default enabled to true to ship this feature.
    FeatureGate.registerFeatureGate(FEATURE_NEW_PROJECT_DIALOGUE, false);

    function _showNewProjectDialogue() {
        var templateVars = {
            Strings: Strings,
            newProjectURL: `${window.location.href}/assets/new-project/code-editor.html`
        };
        dialogue = Dialogs.showModalDialogUsingTemplate(Mustache.render(newProjectTemplate, templateVars), true);
    }

    exports.on(EVENT_CLOSE_DIALOGUE, ()=>{
        dialogue.close();
    });

    exports.init = function () {
        if(!FeatureGate.isFeatureEnabled(FEATURE_NEW_PROJECT_DIALOGUE)){
            return;
        }
        _showNewProjectDialogue();
    };
});
