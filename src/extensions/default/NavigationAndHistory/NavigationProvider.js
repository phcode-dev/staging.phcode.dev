define(function(require,exports,module){var Strings=brackets.getModule("strings"),MainViewManager=brackets.getModule("view/MainViewManager"),DocumentManager=brackets.getModule("document/DocumentManager"),EditorManager=brackets.getModule("editor/EditorManager"),ProjectManager=brackets.getModule("project/ProjectManager"),CommandManager=brackets.getModule("command/CommandManager"),Commands=brackets.getModule("command/Commands"),Menus=brackets.getModule("command/Menus"),KeyBindingManager=brackets.getModule("command/KeyBindingManager"),FileSystem=brackets.getModule("filesystem/FileSystem"),Metrics=brackets.getModule("utils/Metrics"),KeyboardPrefs=JSON.parse(require("text!keyboard.json")),NAVIGATION_JUMP_BACK="navigation.jump.back",NAVIGATION_JUMP_FWD="navigation.jump.fwd",MAX_NAV_FRAMES_COUNT=50;let $navback=null,$navForward=null,$searchNav=null,$newProject=null,$showInTree=null;var jumpBackwardStack=[],jumpForwardStack=[],activePosNotSynced=!1,currentEditPos=null,jumpInProgress=!1,commandJumpBack,commandJumpFwd;function _hasNavBackFrames(){return jumpBackwardStack.length>0}function _hasNavForwardFrames(){return jumpForwardStack.length>0}function _setEnableBackNavButton(enabled){enabled?$navback.removeClass("nav-back-btn-disabled").addClass("nav-back-btn"):$navback.removeClass("nav-back-btn").addClass("nav-back-btn-disabled")}function _setEnableForwardNavButton(enabled){enabled?$navForward.removeClass("nav-forward-btn-disabled").addClass("nav-forward-btn"):$navForward.removeClass("nav-forward-btn").addClass("nav-forward-btn-disabled")}function _validateNavigationCmds(){commandJumpBack.setEnabled(_hasNavBackFrames()),commandJumpFwd.setEnabled(_hasNavForwardFrames()),_setEnableBackNavButton(_hasNavBackFrames()),_setEnableForwardNavButton(_hasNavForwardFrames())}function _validateFrame(entry){var deferred=new $.Deferred,fileEntry=FileSystem.getFileForPath(entry.filePath),indexInWS;entry.inMem?-1===MainViewManager.findInWorkingSet(entry.paneId,entry.filePath)?deferred.reject():deferred.resolve():fileEntry.exists(function(err,exists){!err&&exists?fileEntry._hash!==entry._hash?deferred.reject():entry._validateMarkers()?deferred.resolve():deferred.reject():deferred.reject()});return deferred.promise()}function NavigationFrame(editor,selectionObj){this.cm=editor._codeMirror,this.filePath=editor.document.file._path,this.inMem="InMemoryFile"===editor.document.file.constructor.name,this.paneId=editor._paneId,this._hash=editor.document.file._hash,this.uId=(new Date).getTime(),this.selections=selectionObj.ranges||[],this.bookMarkIds=[],this._createMarkers(selectionObj.ranges)}function _recordJumpDef(event,selectionObj,force){if(!(jumpInProgress||event.target&&event.target.document._refreshInProgress))if(jumpForwardStack=[],_validateNavigationCmds(),"+move"===selectionObj.origin||window.event&&"input"===window.event.type)activePosNotSynced=!0;else{let _recordCurrentPos=function(){var navFrame;jumpBackwardStack.length===MAX_NAV_FRAMES_COUNT&&jumpBackwardStack.shift()._clearMarkers();currentEditPos=new NavigationFrame(event.target,selectionObj);let lastBack=jumpBackwardStack.pop();lastBack&&lastBack!==currentEditPos&&jumpBackwardStack.push(lastBack),jumpBackwardStack.push(currentEditPos),_validateNavigationCmds(),activePosNotSynced=!1};(force||event&&"mousedown"===event.type||event&&"beforeSelectionChange"===event.type)&&_recordCurrentPos()}}function _isRangerOverlap(prevStart,prevEnd,curStart,curEnd){if(prevStart>prevEnd){let temp=prevStart;prevStart=prevEnd,prevEnd=temp}if(curStart>curEnd){let temp=curStart;curStart=curEnd,curEnd=temp}return prevStart<=curEnd&&curStart<=prevEnd}function _isSimilarSelection(prev,current){if(_.isEqual(prev,current))return!0;if(prev.length===current.length&&1===current.length){let startPrev=prev[0].anchor||prev[0].start,endPrev=prev[0].head||prev[0].end,startCur=current[0].anchor||current[0].start,endCur=current[0].head||current[0].end,psc=startPrev.ch,psl=startPrev.line,pec=endPrev.ch,pel=endPrev.line,csc=startCur.ch,csl=startCur.line,cec=endCur.ch,cel;if(_isRangerOverlap(psl,pel,csl,endCur.line)&&_isRangerOverlap(psc,pec,csc,cec))return!0}return!1}function _isSimilarBookmarks(prev,current){return 0===current.length&&prev.length>=1||prev.length===current.length}function _navigateBack(skipCurrentFile){let navFrame=jumpBackwardStack.pop();for(currentEditPos=new NavigationFrame(EditorManager.getCurrentFullEditor(),{ranges:EditorManager.getCurrentFullEditor()._codeMirror.listSelections()});navFrame&&navFrame===currentEditPos||navFrame&&navFrame.filePath===currentEditPos.filePath&&_isSimilarSelection(navFrame.selections,currentEditPos.selections)&&_isSimilarBookmarks(navFrame.bookMarkIds,currentEditPos.bookMarkIds)||skipCurrentFile&&navFrame&&navFrame.filePath===currentEditPos.filePath;)navFrame=jumpBackwardStack.pop();navFrame?_validateFrame(navFrame).done(function(){jumpForwardStack.push(currentEditPos),navFrame.goTo(),currentEditPos=navFrame}).fail(function(){CommandManager.execute(NAVIGATION_JUMP_BACK)}).always(function(){_validateNavigationCmds()}):jumpBackwardStack.push(currentEditPos)}function _navigateForward(skipCurrentFile){let navFrame=jumpForwardStack.pop();if(currentEditPos=new NavigationFrame(EditorManager.getCurrentFullEditor(),{ranges:EditorManager.getCurrentFullEditor()._codeMirror.listSelections()}),navFrame){for(;navFrame===currentEditPos||navFrame&&navFrame.filePath===currentEditPos.filePath&&_isSimilarSelection(navFrame.selections,currentEditPos.selections)&&_isSimilarBookmarks(navFrame.bookMarkIds,currentEditPos.bookMarkIds)||skipCurrentFile&&navFrame&&navFrame.filePath===currentEditPos.filePath;)navFrame=jumpForwardStack.pop();navFrame&&_validateFrame(navFrame).done(function(){jumpBackwardStack.push(currentEditPos),navFrame.goTo(),currentEditPos=navFrame}).fail(function(){_validateNavigationCmds(),CommandManager.execute(NAVIGATION_JUMP_FWD)}).always(function(){_validateNavigationCmds()})}}function _initNavigationMenuItems(){var menu=Menus.getMenu(Menus.AppMenuBar.NAVIGATE_MENU);menu.addMenuItem(NAVIGATION_JUMP_BACK,"",Menus.AFTER,Commands.NAVIGATE_PREV_DOC),menu.addMenuItem(NAVIGATION_JUMP_FWD,"",Menus.AFTER,NAVIGATION_JUMP_BACK)}function _initNavigationCommands(){CommandManager.register(Strings.CMD_NAVIGATE_BACKWARD,NAVIGATION_JUMP_BACK,_navigateBack),CommandManager.register(Strings.CMD_NAVIGATE_FORWARD,NAVIGATION_JUMP_FWD,_navigateForward),commandJumpBack=CommandManager.get(NAVIGATION_JUMP_BACK),commandJumpFwd=CommandManager.get(NAVIGATION_JUMP_FWD),commandJumpBack.setEnabled(!1),commandJumpFwd.setEnabled(!1),KeyBindingManager.addBinding(NAVIGATION_JUMP_BACK,KeyboardPrefs[NAVIGATION_JUMP_BACK]),KeyBindingManager.addBinding(NAVIGATION_JUMP_FWD,KeyboardPrefs[NAVIGATION_JUMP_FWD]),_initNavigationMenuItems()}function _backupLiveMarkers(frames,editor){var index,frame;for(index in frames)(frame=frames[index]).cm===editor._codeMirror&&frame._handleEditorDestroy()}function _handleEditorCleanup(event,editor){_backupLiveMarkers(jumpBackwardStack,editor),_backupLiveMarkers(jumpForwardStack,editor)}function _removeBackwardFramesForFile(file){jumpBackwardStack=jumpBackwardStack.filter(function(frame){return frame._validateFileHash(file)})}function _removeForwardFramesForFile(file){jumpForwardStack=jumpForwardStack.filter(function(frame){return frame._validateFileHash(file)})}function _removeFileFromStack(file){file&&(_removeBackwardFramesForFile(file),_removeForwardFramesForFile(file),_validateNavigationCmds())}function _clearStacks(){jumpBackwardStack=[],jumpForwardStack=[]}function _reinstateMarkers(editor,frames){var index,frame;for(index in frames)(frame=frames[index]).cm||frame.filePath!==editor.document.file._path||frame._reinstateMarkers(editor)}function _captureBackFrame(editor){_recordJumpDef({target:editor},{ranges:editor._codeMirror.listSelections()},!0)}function _handleActiveEditorChange(event,current,previous){previous&&previous._paneId&&(previous.off("beforeSelectionChange",_recordJumpDef),_captureBackFrame(previous),_validateNavigationCmds()),current&&current._paneId&&(activePosNotSynced=!0,current.off("beforeSelectionChange",_recordJumpDef),current.on("beforeSelectionChange",_recordJumpDef),current.off("beforeDestroy",_handleEditorCleanup),current.on("beforeDestroy",_handleEditorCleanup))}function _initHandlers(){EditorManager.on("activeEditorChange",_handleActiveEditorChange),ProjectManager.on("projectOpen",_clearStacks),EditorManager.on("_fullEditorCreatedForDocument",function(event,document,editor){_reinstateMarkers(editor,jumpBackwardStack),_reinstateMarkers(editor,jumpForwardStack)}),FileSystem.on("change",function(event,entry){entry&&_removeFileFromStack(entry)})}function _navigateBackClicked(evt){Metrics.countEvent(Metrics.EVENT_TYPE.UI,"fileNavBar","back"),_hasNavBackFrames()&&_navigateBack(evt.shiftKey||"contextmenu"===evt.type),_validateNavigationCmds(),MainViewManager.focusActivePane()}function _navigateForwardClicked(evt){Metrics.countEvent(Metrics.EVENT_TYPE.UI,"fileNavBar","forward"),_hasNavForwardFrames()&&_navigateForward(evt.shiftKey||"contextmenu"===evt.type),_validateNavigationCmds(),MainViewManager.focusActivePane()}function _showInFileTreeClicked(){Metrics.countEvent(Metrics.EVENT_TYPE.UI,"fileNavBar","showInFileTree"),CommandManager.execute(Commands.NAVIGATE_SHOW_IN_FILE_TREE)}function _findInFiles(){Metrics.countEvent(Metrics.EVENT_TYPE.UI,"fileNavBar","search"),CommandManager.execute(Commands.CMD_FIND_IN_FILES)}function _newProjectClicked(){Metrics.countEvent(Metrics.EVENT_TYPE.UI,"fileNavBar","newProject"),CommandManager.execute(Commands.FILE_NEW_PROJECT)}function _getShortcutDisplay(baseStr,commandID){let shortCut=KeyBindingManager.getKeyBindingsDisplay(commandID);return shortCut?`${baseStr} (${shortCut})`:baseStr}function updateTooltips(){$navback.attr("title",_getShortcutDisplay(Strings.CMD_NAVIGATE_BACKWARD,NAVIGATION_JUMP_BACK)),$navForward.attr("title",_getShortcutDisplay(Strings.CMD_NAVIGATE_FORWARD,NAVIGATION_JUMP_FWD)),$showInTree.attr("title",_getShortcutDisplay(Strings.CMD_SHOW_IN_TREE,Commands.NAVIGATE_SHOW_IN_FILE_TREE)),$searchNav.attr("title",_getShortcutDisplay(Strings.CMD_FIND_IN_FILES,Commands.CMD_FIND_IN_FILES)),$newProject.attr("title",Strings.CMD_PROJECT_NEW)}function _setupNavigationButtons(){let $mainNavBarRight=$("#mainNavBarRight"),$mainNavBarLeft=$("#mainNavBarLeft");$showInTree=$mainNavBarRight.find("#showInfileTree"),$navback=$mainNavBarRight.find("#navBackButton"),$navForward=$mainNavBarRight.find("#navForwardButton"),$searchNav=$mainNavBarRight.find("#searchNav"),$newProject=$mainNavBarLeft.find("#newProject"),updateTooltips(),CommandManager.get(NAVIGATION_JUMP_BACK).on(KeyBindingManager.EVENT_KEY_BINDING_ADDED,updateTooltips),CommandManager.get(NAVIGATION_JUMP_FWD).on(KeyBindingManager.EVENT_KEY_BINDING_ADDED,updateTooltips),CommandManager.get(Commands.NAVIGATE_SHOW_IN_FILE_TREE).on(KeyBindingManager.EVENT_KEY_BINDING_ADDED,updateTooltips),CommandManager.get(Commands.CMD_FIND_IN_FILES).on(KeyBindingManager.EVENT_KEY_BINDING_ADDED,updateTooltips),$navback.on("click",_navigateBackClicked),$navForward.on("click",_navigateForwardClicked),$("#navBackButton").contextmenu(_navigateBackClicked),$("#navForwardButton").contextmenu(_navigateForwardClicked),$showInTree.on("click",_showInFileTreeClicked),$searchNav.on("click",_findInFiles),$newProject.on("click",_newProjectClicked)}function init(){_initNavigationCommands(),_initHandlers(),_setupNavigationButtons()}NavigationFrame.prototype._handleEditorDestroy=function(editor){this._backupSelectionRanges(),this._clearMarkers(),this.cm=null,this.bookMarkIds=null},NavigationFrame.prototype._reinstateMarkers=function(editor){this.cm=editor._codeMirror,this.paneId=editor._paneId,this._createMarkers(this.selections)},NavigationFrame.prototype._validateFileHash=function(file){return this.filePath!==file._path||this._hash===file._hash},NavigationFrame.prototype._createMarkers=function(ranges){var range,rangeStart,rangeEnd,index,bookMark;for(index in this.bookMarkIds=[],ranges)rangeStart=(range=ranges[index]).anchor||range.start,rangeEnd=range.head||range.end,rangeStart.line===rangeEnd.line&&rangeStart.ch===rangeEnd.ch?(bookMark=this.cm.setBookmark(rangeStart,rangeEnd),this.bookMarkIds.push(bookMark.id)):this.cm.markText(rangeStart,rangeEnd,{className:this.uId})},NavigationFrame.prototype._backupSelectionRanges=function(){if(this.cm){var marker,selection,index;this.selections=[];var self=this,markers=this.cm.getAllMarks().filter(function(entry){if(entry.className===self.uId||-1!==self.bookMarkIds.indexOf(entry.id))return entry});for(index in markers)selection=(marker=markers[index]).find(),"bookmark"===marker.type?this.selections.push({start:selection,end:selection}):this.selections.push({start:selection.from,end:selection.to})}},NavigationFrame.prototype._clearMarkers=function(){if(this.cm){var self=this;this.cm.getAllMarks().filter(function(entry){entry.className!==self.uId&&-1===self.bookMarkIds.indexOf(entry.id)||entry.clear()})}},NavigationFrame.prototype._validateMarkers=function(){return this._backupSelectionRanges(),this.selections.length},NavigationFrame.prototype.goTo=function(){var self=this;this._backupSelectionRanges(),jumpInProgress=!0;var thisDoc=DocumentManager.getOpenDocumentForPath(this.filePath);thisDoc&&thisDoc._masterEditor&&(this.paneId=thisDoc._masterEditor._paneId),CommandManager.execute(Commands.FILE_OPEN,{fullPath:this.filePath,paneId:this.paneId}).done(function(){EditorManager.getCurrentFullEditor().setSelections(self.selections,!0),_validateNavigationCmds()}).always(function(){jumpInProgress=!1})},exports.init=init});
//# sourceMappingURL=NavigationProvider.js.map
