define(function(require,exports,module){let CommandManager=require("command/CommandManager"),Commands=require("command/Commands"),CodeMirror=require("thirdparty/CodeMirror/lib/codemirror"),LanguageManager=require("language/LanguageManager"),EventDispatcher=require("utils/EventDispatcher"),PerfUtils=require("utils/PerfUtils"),PreferencesManager=require("preferences/PreferencesManager"),TextRange=require("document/TextRange").TextRange,TokenUtils=require("utils/TokenUtils"),HTMLUtils=require("language/HTMLUtils"),MainViewManager=require("view/MainViewManager"),_=require("thirdparty/lodash"),IndentHelper=require("./EditorHelper/IndentHelper"),EditorPreferences=require("./EditorHelper/EditorPreferences"),ChangeHelper=require("./EditorHelper/ChangeHelper"),ErrorPopupHelper=require("./EditorHelper/ErrorPopupHelper"),InlineWidgetHelper=require("./EditorHelper/InlineWidgetHelper"),registeredGutters=[],cmOptions={};EditorPreferences.init(cmOptions);const CLOSE_BRACKETS=EditorPreferences.CLOSE_BRACKETS,CLOSE_TAGS=EditorPreferences.CLOSE_TAGS,DRAG_DROP=EditorPreferences.DRAG_DROP,HIGHLIGHT_MATCHES=EditorPreferences.HIGHLIGHT_MATCHES,LINEWISE_COPY_CUT=EditorPreferences.LINEWISE_COPY_CUT,SCROLL_PAST_END=EditorPreferences.SCROLL_PAST_END,SHOW_CURSOR_SELECT=EditorPreferences.SHOW_CURSOR_SELECT,SHOW_LINE_NUMBERS=EditorPreferences.SHOW_LINE_NUMBERS,SMART_INDENT=EditorPreferences.SMART_INDENT,SPACE_UNITS=EditorPreferences.SPACE_UNITS,STYLE_ACTIVE_LINE=EditorPreferences.STYLE_ACTIVE_LINE,TAB_SIZE=EditorPreferences.TAB_SIZE,USE_TAB_CHAR=EditorPreferences.USE_TAB_CHAR,WORD_WRAP=EditorPreferences.WORD_WRAP,INDENT_LINE_COMMENT=EditorPreferences.INDENT_LINE_COMMENT,INPUT_STYLE=EditorPreferences.INPUT_STYLE,LINE_NUMBER_GUTTER=EditorPreferences.LINE_NUMBER_GUTTER,LINE_NUMBER_GUTTER_PRIORITY=EditorPreferences.LINE_NUMBER_GUTTER_PRIORITY,CODE_FOLDING_GUTTER_PRIORITY=EditorPreferences.CODE_FOLDING_GUTTER_PRIORITY;let editorOptions=Object.keys(cmOptions);var _duringFocus=!1,BOUNDARY_CHECK_NORMAL=0,BOUNDARY_IGNORE_TOP=1,BOUNDARY_BULLSEYE=2;function _copyPos(pos){return new CodeMirror.Pos(pos.line,pos.ch)}function _checkTopBoundary(options){return options!==BOUNDARY_IGNORE_TOP}function _checkBottomBoundary(options){return!0}function _buildPreferencesContext(fullPath){return PreferencesManager._buildContext(fullPath,fullPath?LanguageManager.getLanguageForPath(fullPath).getId():void 0)}var _instances=[];function Editor(document,makeMasterEditor,container,range,options){var self=this,isReadOnly=options&&options.isReadOnly||!document.editable;_instances.push(this),this.document=document,document.addRef(),container.jquery&&(container=container.get(0));let $container=$(container);$container.addClass("editor-holder"),range&&(this._visibleRange=new TextRange(document,range.startLine,range.endLine)),this._handleDocumentChange=this._handleDocumentChange.bind(this),this._handleDocumentDeleted=this._handleDocumentDeleted.bind(this),this._handleDocumentLanguageChanged=this._handleDocumentLanguageChanged.bind(this),this._doWorkingSetSync=this._doWorkingSetSync.bind(this),document.on("change",this._handleDocumentChange),document.on("deleted",this._handleDocumentDeleted),document.on("languageChanged",this._handleDocumentLanguageChanged),document.on("_dirtyFlagChange",this._doWorkingSetSync);var mode=this._getModeFromDocument();this._inlineWidgets=[],this._inlineWidgetQueues={},this._hideMarks=[],this._lastEditorWidth=null,this._escapeKeyConsumers=[],this._markTypesMap={},this._$messagePopover=null,this._paneId=null,this._hostEditor=null;var codeMirrorKeyMap={Tab:function(){self._handleTabKey()},"Shift-Tab":"indentLess",Left:function(instance){self._handleSoftTabNavigation(-1,"moveH")},Right:function(instance){self._handleSoftTabNavigation(1,"moveH")},Backspace:function(instance){self._handleSoftTabNavigation(-1,"deleteH")},Delete:function(instance){self._handleSoftTabNavigation(1,"deleteH")},Esc:function(_instance){self.canConsumeEscapeKeyEvent()&&(self.getSelections().length>1?self.clearSelection():self.hasSelection()?self.clearSelection():self.removeAllInlineWidgets())},Home:"goLineLeftSmart","Cmd-Left":"goLineLeftSmart",End:"goLineRight","Cmd-Right":"goLineRight"},currentOptions=this._currentOptions=_.zipObject(editorOptions,_.map(editorOptions,function(prefName){return self._getOption(prefName)}));function _mouseHandlerOverride(_cm,_repeat,event){return(event.ctrlKey||event.metaKey)&&setTimeout(()=>{CommandManager.execute(Commands.NAVIGATE_JUMPTO_DEFINITION)},100),{addNew:event.altKey}}$container.toggleClass("show-line-padding",Boolean(!this._getOption("showLineNumbers"))),this._codeMirror=new CodeMirror(container,{autoCloseBrackets:currentOptions[CLOSE_BRACKETS],autoCloseTags:currentOptions[CLOSE_TAGS],coverGutterNextToScrollbar:!0,continueComments:!0,cursorScrollMargin:3,dragDrop:currentOptions[DRAG_DROP],electricChars:!0,configureMouse:_mouseHandlerOverride,extraKeys:codeMirrorKeyMap,highlightSelectionMatches:currentOptions[HIGHLIGHT_MATCHES],indentUnit:currentOptions[USE_TAB_CHAR]?currentOptions[TAB_SIZE]:currentOptions[SPACE_UNITS],indentWithTabs:currentOptions[USE_TAB_CHAR],inputStyle:currentOptions[INPUT_STYLE],lineNumbers:currentOptions[SHOW_LINE_NUMBERS],lineWiseCopyCut:currentOptions[LINEWISE_COPY_CUT],lineWrapping:currentOptions[WORD_WRAP],matchBrackets:{maxScanLineLength:5e4,maxScanLines:1e3},matchTags:{bothTags:!0},scrollPastEnd:!range&&currentOptions[SCROLL_PAST_END],showCursorWhenSelecting:currentOptions[SHOW_CURSOR_SELECT],smartIndent:currentOptions[SMART_INDENT],styleActiveLine:currentOptions[STYLE_ACTIVE_LINE],tabSize:currentOptions[TAB_SIZE],readOnly:isReadOnly}),this._focused=!1,this._installEditorListeners(),this._renderGutters(),this.on("cursorActivity",function(event,editor){self._handleCursorActivity(event)}),this.on("keypress",function(event,editor,domEvent){self._handleKeypressEvents(domEvent)}),this.on("change",function(event,editor,changeList){self._handleEditorChange(changeList)}),this.on("focus",function(event,editor){self._hostEditor?self._hostEditor.document._toggleMasterEditor(self._hostEditor):self.document._toggleMasterEditor(self)}),this._codeMirror.setOption("mode",mode),this._duringSync=!0,this._resetText(document.getText()),this._duringSync=!1,range&&(this._updateHiddenLines(),this.setCursorPos(range.startLine,0)),makeMasterEditor&&document._makeEditable(this),Object.defineProperty(this,"scrollTop",{get:function(){return this._codeMirror.getScrollInfo().top}}),Object.defineProperty(this,"$el",{get:function(){return $(this.getRootElement())}})}EventDispatcher.makeEventDispatcher(Editor.prototype),EventDispatcher.markDeprecated(Editor.prototype,"keyEvent","'keydown/press/up'"),IndentHelper.addHelpers(Editor),ChangeHelper.addHelpers(Editor),InlineWidgetHelper.addHelpers(Editor),Editor.prototype.markPaneId=function(paneId){this._paneId=paneId,this.document._associateEditor(this),this._doWorkingSetSync(null,this.document)},Editor.prototype.getInlineWidgetsBelowCursor=function(){let self=this,cursor,line=this.getCursorPos().line;return this.getAllInlineWidgetsForLine(line)},Editor.prototype.setCanConsumeEscapeKeyEvent=function(consumerName,consume){if(consume&&!this._escapeKeyConsumers.includes(consumerName)&&this._escapeKeyConsumers.push(consumerName),!consume){const index=this._escapeKeyConsumers.indexOf(consumerName);index>-1&&this._escapeKeyConsumers.splice(index,1)}},Editor.prototype.canConsumeEscapeKeyEvent=function(){let self=this;return this._escapeKeyConsumers.length||this.getSelections().length>1||this.hasSelection()||this.getInlineWidgetsBelowCursor()||this.getFocusedInlineWidget()},Editor.prototype._doWorkingSetSync=function(event,doc){doc===this.document&&this._paneId&&this.document.isDirty&&MainViewManager.addToWorkingSet(this._paneId,this.document.file,-1,!1)},Editor.prototype.destroy=function(){this.trigger("beforeDestroy",this),$(this.getRootElement()).remove(),_instances.splice(_instances.indexOf(this),1),this.document.releaseRef(),this.document.off("change",this._handleDocumentChange),this.document.off("deleted",this._handleDocumentDeleted),this.document.off("languageChanged",this._handleDocumentLanguageChanged),this.document.off("_dirtyFlagChange",this._doWorkingSetSync),this._visibleRange&&this._visibleRange.dispose(),this.document._masterEditor===this?this.document._makeNonEditable():this.document._disassociateEditor(this);var self=this;this._inlineWidgets.forEach(function(inlineWidget){self._removeInlineWidgetInternal(inlineWidget)})},Editor.prototype._handleCursorActivity=function(event){this._updateStyleActiveLine()},Editor.prototype._handleWhitespaceForElectricChars=function(){var self=this,instance=this._codeMirror,selections,lineStr;selections=this.getSelections().map(function(sel){return(lineStr=instance.getLine(sel.end.line))&&!/\S/.test(lineStr)&&(sel.end.ch=self.document.getLine(sel.end.line).length),sel}),this.setSelections(selections)},Editor.prototype._handleKeypressEvents=function(event){var keyStr=String.fromCharCode(event.which||event.keyCode);/[\]\{\}\)]/.test(keyStr)&&this._handleWhitespaceForElectricChars()},Editor.prototype._getModeFromDocument=function(){return this.document.getLanguage().getMode()||"text/plain"},Editor.prototype.selectAllNoScroll=function(){var cm=this._codeMirror,info=this._codeMirror.getScrollInfo();cm.operation(function(){cm.scrollTo(info.left,info.top),cm.execCommand("selectAll")})},Editor.prototype.isTextSubset=function(){return Boolean(this._visibleRange)},Editor.prototype._updateHiddenLines=function(){if(this._visibleRange){var cm=this._codeMirror,self=this;cm.operation(function(){self._hideMarks.forEach(function(mark){mark&&mark.clear()}),self._hideMarks=[],self._hideMarks.push(self._hideLines(0,self._visibleRange.startLine)),self._hideMarks.push(self._hideLines(self._visibleRange.endLine+1,self.lineCount()))})}},Editor.prototype._resetText=function(text){var currentText=this._codeMirror.getValue(),textLF,currentTextLF;if((text?text.replace(/(\r\n|\r|\n)/g,"\n"):null)!==(currentText?currentText.replace(/(\r\n|\r|\n)/g,"\n"):null)){var perfTimerName=PerfUtils.markStart("Editor._resetText()\t"+(!this.document||this.document.file.fullPath)),cursorPos=this.getCursorPos(),scrollPos=this.getScrollPos();this._codeMirror.setValue(text),this._codeMirror.refresh(),this._codeMirror.clearHistory(),this._codeMirror.markClean(),this.setCursorPos(cursorPos),this.setScrollPos(scrollPos.x,scrollPos.y),PerfUtils.addMeasurement(perfTimerName)}},Editor.prototype.getFile=function(){return this.document.file},Editor.prototype.getCursorPos=function(expandTabs,which){"start"===which?which="from":"end"===which&&(which="to");var cursor=_copyPos(this._codeMirror.getCursor(which));return expandTabs&&(cursor.ch=this.getColOffset(cursor)),cursor},Editor.prototype.getColOffset=function(pos){var line=this._codeMirror.getRange({line:pos.line,ch:0},pos),tabSize=null,column=0,i;for(i=0;i<line.length;i++)"\t"===line[i]?(null===tabSize&&(tabSize=Editor.getTabSize()),tabSize>0&&(column+=tabSize-column%tabSize)):column++;return column},Editor.prototype.getCharIndexForColumn=function(lineNum,column){var line=this._codeMirror.getLine(lineNum),tabSize=null,iCol=0,i;for(i=0;iCol<column;i++)"\t"===line[i]?(null===tabSize&&(tabSize=Editor.getTabSize()),tabSize>0&&(iCol+=tabSize-iCol%tabSize)):iCol++;return i},Editor.prototype.setCursorPos=function(line,ch,center,expandTabs){expandTabs&&(ch=this.getColOffset({line:line,ch:ch})),this._codeMirror.setCursor(line,ch),center&&this.centerOnCursor()},Editor.prototype.setSize=function(width,height){this._codeMirror.setSize(width,height)},Editor.prototype.getViewport=function(){return this._codeMirror.getViewport()};var CENTERING_MARGIN=.15;function _normalizeRange(anchorPos,headPos){return headPos.line<anchorPos.line||headPos.line===anchorPos.line&&headPos.ch<anchorPos.ch?{start:_copyPos(headPos),end:_copyPos(anchorPos),reversed:!0}:{start:_copyPos(anchorPos),end:_copyPos(headPos),reversed:!1}}Editor.prototype.centerOnCursor=function(centerOptions){let $scrollerElement,editorHeight=$(this.getScrollerElement()).height(),statusBarHeight=$("#status-bar").height(),documentCursorPosition=this._codeMirror.cursorCoords(null,"local").bottom,screenCursorPosition=this._codeMirror.cursorCoords(null,"page").bottom;if(2!==centerOptions){if(_checkTopBoundary(centerOptions)&&screenCursorPosition<.15*editorHeight||screenCursorPosition>.85*editorHeight){var pos=documentCursorPosition-editorHeight/2+statusBarHeight,info=this._codeMirror.getScrollInfo();pos=Math.min(Math.max(pos,0),info.height-info.clientHeight),this.setScrollPos(null,pos)}}else{let pos=documentCursorPosition-editorHeight/2+statusBarHeight;this.setScrollPos(null,pos)}},Editor.prototype.indexFromPos=function(coords){return this._codeMirror.indexFromPos(coords)},Editor.prototype.posFromIndex=function(index){return this._codeMirror.posFromIndex(index)},Editor.prototype.posWithinRange=function(pos,start,end,endInclusive){return start.line<=pos.line&&end.line>=pos.line&&(endInclusive?(start.line<pos.line||start.ch<=pos.ch)&&(end.line>pos.line||end.ch>=pos.ch):(start.line<pos.line||start.ch<=pos.ch)&&(end.line>pos.line||end.ch>pos.ch))},Editor.prototype.hasSelection=function(){return this._codeMirror.somethingSelected()},Editor.prototype.getSelection=function(){return _normalizeRange(this.getCursorPos(!1,"anchor"),this.getCursorPos(!1,"head"))},Editor.prototype.getSelections=function(){var primarySel=this.getSelection();return _.map(this._codeMirror.listSelections(),function(sel){var result=_normalizeRange(sel.anchor,sel.head);return result.start.line===primarySel.start.line&&result.start.ch===primarySel.start.ch&&result.end.line===primarySel.end.line&&result.end.ch===primarySel.end.ch?result.primary=!0:result.primary=!1,result})},Editor.prototype.convertToLineSelections=function(selections,options){var self=this;options=options||{},_.defaults(options,{expandEndAtStartOfLine:!1,mergeAdjacent:!0});var combinedSelections=[],prevSel;return _.each(selections,function(sel){var newSel=_.cloneDeep(sel);newSel.start.ch=0;var hasSelection=newSel.start.line!==newSel.end.line||newSel.start.ch!==newSel.end.ch;!options.expandEndAtStartOfLine&&hasSelection&&0===newSel.end.ch||(newSel.end={line:newSel.end.line+1,ch:0}),prevSel&&self.posWithinRange(newSel.start,prevSel.selectionForEdit.start,prevSel.selectionForEdit.end,options.mergeAdjacent)?(prevSel.selectionForEdit.end.line=newSel.end.line,prevSel.selectionsToTrack.push(sel)):(prevSel={selectionForEdit:newSel,selectionsToTrack:[sel]},combinedSelections.push(prevSel))}),combinedSelections},Editor.prototype.getSelectedText=function(allSelections){if(allSelections)return this._codeMirror.getSelection();var sel=this.getSelection();return this.document.getRange(sel.start,sel.end)},Editor.prototype.coordsChar=function(coordinates,mode){return this._codeMirror.coordsChar(coordinates,mode)},Editor.prototype.charCoords=function(pos,mode){return this._codeMirror.charCoords(pos,mode)},Editor.prototype.getToken=function(cursor,precise){let cm=this._codeMirror;return cursor?TokenUtils.getTokenAt(cm,cursor,precise):TokenUtils.getTokenAt(cm,this.getCursorPos(),precise)},Editor.prototype.getNextToken=function(cursor,skipWhitespace=!0,precise){cursor=cursor||this.getCursorPos();let token,next=this.getToken(cursor,precise),doc=this.document;do{if(next.end<doc.getLine(cursor.line).length)cursor.ch=next.end+1;else{if(!doc.getLine(cursor.line+1)){next=null;break}cursor.ch=0,cursor.line++}next=this.getToken(cursor,precise)}while(skipWhitespace&&!/\S/.test(next.string));return next},Editor.prototype.getPreviousToken=function(cursor,skipWhitespace=!0,precise){cursor=cursor||this.getCursorPos();let token,prev=this.getToken(cursor,precise),doc=this.document;do{if(prev.start<cursor.ch)cursor.ch=prev.start;else{if(!(cursor.line>0))break;cursor.ch=doc.getLine(cursor.line-1).length,cursor.line--}prev=this.getToken(cursor,precise)}while(skipWhitespace&&!/\S/.test(prev.string));return prev},Editor.prototype.operation=function(execFn){return this._codeMirror.operation(execFn)};const MARK_OPTION_UNDERLINE_ERROR={className:"editor-text-fragment-error"},MARK_OPTION_UNDERLINE_WARN={className:"editor-text-fragment-warn"},MARK_OPTION_UNDERLINE_INFO={className:"editor-text-fragment-info"},MARK_OPTION_UNDERLINE_SPELLCHECK={className:"editor-text-fragment-spell-error"},MARK_OPTION_HYPERLINK_TEXT={className:"editor-text-fragment-hover"},MARK_OPTION_MATCHING_REFS={className:"editor-text-fragment-matching-refs"};Editor.prototype.markText=function(markType,cursorFrom,cursorTo,options){let newMark=this._codeMirror.markText(cursorFrom,cursorTo,options);return newMark.markType=markType,newMark},Editor.prototype.markToken=function(markType,cursor,options){let token=this.getToken(cursor);return this.markText(markType,{line:cursor.line,ch:token.start},{line:cursor.line,ch:token.end},options)},Editor.prototype.setBookmark=function(markType,cursorPos,options){let newMark=this._codeMirror.setBookmark(cursorPos,options);return newMark.markType=markType,newMark},Editor.prototype.findMarks=function(cursorFrom,cursorTo,markType){let marks;return(this._codeMirror.findMarks(cursorFrom,cursorTo)||[]).filter(function(mark){return!markType||mark.markType===markType})},Editor.prototype.findMarksAt=function(cursorPos,markType){let marks;return(this._codeMirror.findMarksAt(cursorPos)||[]).filter(function(mark){return!markType||mark.markType===markType})},Editor.prototype.getAllMarks=function(markType){let marks;return(this._codeMirror.getAllMarks()||[]).filter(function(mark){return!markType||mark.markType===markType})},Editor.prototype.clearAllMarks=function(markType){let marks=this.getAllMarks(markType);for(let mark of marks)mark.clear()},Editor.prototype.setSelection=function(start,end,center,centerOptions,origin){this.setSelections([{start:start,end:end||start}],center,centerOptions,origin)},Editor.prototype.clearSelection=function(){let pos=this.getCursorPos();this.setCursorPos(pos.line,pos.ch)},Editor.prototype.setSelections=function(selections,center,centerOptions,origin){var primIndex=selections.length-1,options;origin&&(options={origin:origin}),this._codeMirror.setSelections(_.map(selections,function(sel,index){return sel.primary&&(primIndex=index),{anchor:sel.reversed?sel.end:sel.start,head:sel.reversed?sel.start:sel.end}}),primIndex,options),center&&this.centerOnCursor(centerOptions)},Editor.prototype.toggleOverwrite=function(state){this._codeMirror.toggleOverwrite(state)},Editor.prototype.selectWordAt=function(pos){var word=this._codeMirror.findWordAt(pos);this.setSelection(word.anchor,word.head)},Editor.prototype.lineCount=function(){return this._codeMirror.lineCount()},Editor.prototype.isLineVisible=function(line){var coords=this._codeMirror.charCoords({line:line,ch:0},"local"),scrollInfo=this._codeMirror.getScrollInfo(),top=scrollInfo.top,bottom=scrollInfo.top+scrollInfo.clientHeight;return coords.top>=top&&coords.bottom<=bottom},Editor.prototype.getFirstVisibleLine=function(){return this._visibleRange?this._visibleRange.startLine:0},Editor.prototype.getLastVisibleLine=function(){return this._visibleRange?this._visibleRange.endLine:this.lineCount()-1},Editor.prototype._hideLines=function(from,to){var value;if(!(to<=from))return this._codeMirror.markText({line:from,ch:0},{line:to-1,ch:this._codeMirror.getLine(to-1).length},{collapsed:!0,inclusiveLeft:!0,inclusiveRight:!0,clearWhenEmpty:!1})},Editor.prototype.totalHeight=function(){return this.getScrollerElement().scrollHeight},Editor.prototype.getScrollerElement=function(){return this._codeMirror.getScrollerElement()},Editor.prototype.getRootElement=function(){return this._codeMirror.getWrapperElement()},Editor.prototype._getLineSpaceElement=function(){return $(".CodeMirror-lines",this.getScrollerElement()).children().get(0)},Editor.prototype.getScrollPos=function(){var scrollInfo=this._codeMirror.getScrollInfo();return{x:scrollInfo.left,y:scrollInfo.top}},Editor.prototype.adjustScrollPos=function(scrollPos,heightDelta){this._codeMirror.scrollTo(scrollPos.x,scrollPos.y+heightDelta)},Editor.prototype.setScrollPos=function(x,y){this._codeMirror.scrollTo(x,y)},Editor.prototype.getTextHeight=function(){return this._codeMirror.defaultTextHeight()},Editor.prototype.addInlineWidget=InlineWidgetHelper.addInlineWidget,Editor.prototype.removeAllInlineWidgets=InlineWidgetHelper.removeAllInlineWidgets,Editor.prototype.removeInlineWidget=InlineWidgetHelper.removeInlineWidget,Editor.prototype.removeAllInlineWidgetsForLine=InlineWidgetHelper.removeAllInlineWidgetsForLine,Editor.prototype.getAllInlineWidgetsForLine=InlineWidgetHelper.getAllInlineWidgetsForLine,Editor.prototype.getInlineWidgets=InlineWidgetHelper.getInlineWidgets,Editor.prototype.getFocusedInlineWidget=InlineWidgetHelper.getFocusedInlineWidget,Editor.prototype.setInlineWidgetHeight=InlineWidgetHelper.setInlineWidgetHeight,Editor.prototype.displayErrorMessageAtCursor=ErrorPopupHelper.displayErrorMessageAtCursor,Editor.prototype.getVirtualScrollAreaTop=function(){var topPadding=this._getLineSpaceElement().offsetTop,scroller=this.getScrollerElement();return $(scroller).offset().top-scroller.scrollTop+topPadding},Editor.prototype.focus=function(){if(!_duringFocus){_duringFocus=!0;try{this._codeMirror.focus()}finally{_duringFocus=!1}}},Editor.prototype.hasFocus=function(){return this._focused},Editor.prototype.getViewState=function(){return{selections:this.getSelections(),scrollPos:this.getScrollPos()}},Editor.prototype.restoreViewState=function(viewState){viewState.selection&&this.setSelection(viewState.selection.start,viewState.selection.end),viewState.selections&&this.setSelections(viewState.selections),viewState.scrollPos&&this.setScrollPos(viewState.scrollPos.x,viewState.scrollPos.y)},Editor.prototype.refresh=function(handleResize){var focusedItem=window.document.activeElement,restoreFocus=$.contains(this._codeMirror.getScrollerElement(),focusedItem);this._codeMirror.refresh(),restoreFocus&&focusedItem.focus()},Editor.prototype.refreshAll=function(handleResize){this.refresh(handleResize),this.getInlineWidgets().forEach(function(inlineWidget){inlineWidget.refresh()})},Editor.prototype.undo=function(){this._codeMirror.undo()},Editor.prototype.redo=function(){this._codeMirror.redo()},Editor.prototype.notifyVisibilityChange=function(show,refresh){show&&(refresh||void 0===refresh)&&this.refresh(),show&&this._inlineWidgets.forEach(function(inlineWidget){inlineWidget.onParentShown()})},Editor.prototype.setVisible=function(show,refresh){this.$el.css("display",show?"":"none"),this.notifyVisibilityChange(show,refresh)},Editor.prototype.isFullyVisible=function(){return $(this.getRootElement()).is(":visible")},Editor.prototype.getModeForRange=function(start,end,knownMixed){var outerMode=this._codeMirror.getMode(),startMode=TokenUtils.getModeAt(this._codeMirror,start),endMode=TokenUtils.getModeAt(this._codeMirror,end);return knownMixed||outerMode.name!==startMode.name?startMode&&endMode&&startMode.name===endMode.name?startMode:null:this._codeMirror.getOption("mode")},Editor.prototype.getModeForSelection=function(){var self=this,sels=this.getSelections(),primarySel=this.getSelection(),outerMode=this._codeMirror.getMode(),startMode=TokenUtils.getModeAt(this._codeMirror,primarySel.start),isMixed;if(outerMode.name!==startMode.name){if("htmlmixed"===outerMode.name&&primarySel.start.line===primarySel.end.line&&primarySel.start.ch===primarySel.end.ch){var tagInfo=HTMLUtils.getTagInfo(this,primarySel.start,!0),tokenType;if(tagInfo.position.tokenType===HTMLUtils.ATTR_VALUE&&"style"===tagInfo.attr.name.toLowerCase())return"css"}if(primarySel.start.line!==primarySel.end.line||primarySel.start.ch!==primarySel.end.ch){var endMode=TokenUtils.getModeAt(this._codeMirror,primarySel.end);if(startMode.name!==endMode.name)return null}var hasMixedSel;return _.some(sels,function(sel){if(sels===primarySel)return!1;var rangeMode=self.getModeForRange(sel.start,sel.end,!0);return!rangeMode||rangeMode.name!==startMode.name})?null:startMode.name}return this._codeMirror.getOption("mode")},Editor.prototype.getLanguageForSelection=function(){return this.document.getLanguage().getLanguageForMode(this.getModeForSelection())},Editor.prototype.getModeForDocument=function(){return this._codeMirror.getOption("mode")},Editor.prototype.document=null,Editor.prototype._lastEditorWidth=null,Editor.prototype._duringSync=!1,Editor.prototype._codeMirror=null,Editor.prototype._inlineWidgets=null,Editor.prototype._visibleRange=null,Editor.prototype._inlineWidgetQueues=null,Editor.prototype._hideMarks=null,Editor.prototype._getOption=function(prefName){return PreferencesManager.get(prefName,PreferencesManager._buildContext(this.document.file.fullPath,this.document.getLanguage().getId()))},Editor.prototype._updateOption=function(prefName){var oldValue=this._currentOptions[prefName],newValue=this._getOption(prefName);if(oldValue!==newValue){if(this._currentOptions[prefName]=newValue,prefName===USE_TAB_CHAR)this._codeMirror.setOption(cmOptions[prefName],newValue),this._codeMirror.setOption("indentUnit",!0===newValue?this._currentOptions[TAB_SIZE]:this._currentOptions[SPACE_UNITS]);else if(prefName===STYLE_ACTIVE_LINE)this._updateStyleActiveLine();else{if(prefName===SCROLL_PAST_END&&this._visibleRange)return;prefName===SHOW_LINE_NUMBERS?(Editor._toggleLinePadding(!newValue),this._codeMirror.setOption(cmOptions[SHOW_LINE_NUMBERS],newValue),newValue?Editor.registerGutter(LINE_NUMBER_GUTTER,LINE_NUMBER_GUTTER_PRIORITY):Editor.unregisterGutter(LINE_NUMBER_GUTTER),this.refreshAll()):this._codeMirror.setOption(cmOptions[prefName],newValue)}this.trigger("optionChange",prefName,newValue)}},Editor.prototype._updateStyleActiveLine=function(){this.hasSelection()?this._codeMirror.getOption("styleActiveLine")&&this._codeMirror.setOption("styleActiveLine",!1):this._codeMirror.setOption("styleActiveLine",this._currentOptions[STYLE_ACTIVE_LINE])},Editor.prototype.updateLayout=function(forceRefresh){var curRoot=this.getRootElement(),curWidth=$(curRoot).width(),$editorHolder,editorAreaHt=this.$el.parent().height();curRoot.style.height&&$(curRoot).height()===editorAreaHt?curWidth!==this._lastEditorWidth&&void 0===forceRefresh&&(forceRefresh=!0):(this.setSize(null,editorAreaHt),void 0===forceRefresh&&(forceRefresh=!0)),this._lastEditorWidth=curWidth,forceRefresh&&this.refreshAll(forceRefresh)},Editor.prototype._renderGutters=function(){var languageId=this.document.getLanguage().getId();function _filterByLanguages(gutter){return!gutter.languages||gutter.languages.indexOf(languageId)>-1}function _sortByPriority(a,b){return a.priority-b.priority}function _getName(gutter){return gutter.name}var gutters=registeredGutters.map(_getName),rootElement=this.getRootElement();gutters.indexOf(LINE_NUMBER_GUTTER)<0&&this._codeMirror.getOption(cmOptions[SHOW_LINE_NUMBERS])&&registeredGutters.push({name:LINE_NUMBER_GUTTER,priority:LINE_NUMBER_GUTTER_PRIORITY}),gutters=registeredGutters.sort(_sortByPriority).filter(_filterByLanguages).map(_getName),this._codeMirror.setOption("gutters",gutters),this._codeMirror.refresh(),gutters.indexOf(LINE_NUMBER_GUTTER)<0?$(rootElement).addClass("linenumber-disabled"):$(rootElement).removeClass("linenumber-disabled")},Editor.prototype.setGutterMarker=function(lineNumber,gutterName,marker){Editor.isGutterRegistered(gutterName)?this._codeMirror.setGutterMarker(lineNumber,gutterName,marker):console.warn("Gutter name must be registered before calling editor.setGutterMarker")},Editor.prototype.getGutterMarker=function(lineNumber,gutterName){if(!Editor.isGutterRegistered(gutterName))return void console.warn("Gutter name must be registered before calling editor.getGutterMarker");let lineInfo=this._codeMirror.lineInfo(lineNumber),gutterMarkers;return(lineInfo&&lineInfo.gutterMarkers||{})[gutterName]},Editor.prototype.clearGutterMarker=function(lineNumber,gutterName){this.setGutterMarker(lineNumber,gutterName,null)},Editor.prototype.clearGutter=function(gutterName){Editor.isGutterRegistered(gutterName)?this._codeMirror.clearGutter(gutterName):console.warn("Gutter name must be registered before calling editor.clearGutter")},Editor.getRegisteredGutters=function(){return registeredGutters},Editor.isGutterRegistered=function(gutterName){return registeredGutters.some(function(gutter){return gutter.name===gutterName})},Editor.registerGutter=function(name,priority,languageIds){if(isNaN(priority)&&(console.warn("A non-numeric priority value was passed to registerGutter. The value will default to 0."),priority=0),name&&"string"==typeof name){var gutter={name:name,priority:priority,languages:languageIds},gutterExists;registeredGutters.some(function(gutter){return gutter.name===name})||registeredGutters.push(gutter),Editor.forEveryEditor(function(editor){editor._renderGutters()})}else console.error("The name of the registered gutter must be a string.")},Editor.unregisterGutter=function(name){var i,gutter;registeredGutters=registeredGutters.filter(function(gutter){return gutter.name!==name}),Editor.forEveryEditor(function(editor){editor._renderGutters()})},Editor.setUseTabChar=function(value,fullPath){var options=fullPath&&{context:fullPath};return PreferencesManager.set(USE_TAB_CHAR,value,options)},Editor.getUseTabChar=function(fullPath){return PreferencesManager.get(USE_TAB_CHAR,_buildPreferencesContext(fullPath))},Editor.setTabSize=function(value,fullPath){var options=fullPath&&{context:fullPath};return PreferencesManager.set(TAB_SIZE,value,options)},Editor.getTabSize=function(fullPath){return PreferencesManager.get(TAB_SIZE,_buildPreferencesContext(fullPath))},Editor.setSpaceUnits=function(value,fullPath){var options=fullPath&&{context:fullPath};return PreferencesManager.set(SPACE_UNITS,value,options)},Editor.getSpaceUnits=function(fullPath){return PreferencesManager.get(SPACE_UNITS,_buildPreferencesContext(fullPath))},Editor.setCloseBrackets=function(value,fullPath){var options=fullPath&&{context:fullPath};return PreferencesManager.set(CLOSE_BRACKETS,value,options)},Editor.getCloseBrackets=function(fullPath){return PreferencesManager.get(CLOSE_BRACKETS,_buildPreferencesContext(fullPath))},Editor.setShowLineNumbers=function(value,fullPath){var options=fullPath&&{context:fullPath};return PreferencesManager.set(SHOW_LINE_NUMBERS,value,options)},Editor.getShowLineNumbers=function(fullPath){return PreferencesManager.get(SHOW_LINE_NUMBERS,_buildPreferencesContext(fullPath))},Editor.setShowActiveLine=function(value,fullPath){return PreferencesManager.set(STYLE_ACTIVE_LINE,value)},Editor.getShowActiveLine=function(fullPath){return PreferencesManager.get(STYLE_ACTIVE_LINE,_buildPreferencesContext(fullPath))},Editor.setWordWrap=function(value,fullPath){var options=fullPath&&{context:fullPath};return PreferencesManager.set(WORD_WRAP,value,options)},Editor.getWordWrap=function(fullPath){return PreferencesManager.get(WORD_WRAP,_buildPreferencesContext(fullPath))},Editor.setIndentLineComment=function(value,fullPath){var options=fullPath&&{context:fullPath};return PreferencesManager.set(INDENT_LINE_COMMENT,value,options)},Editor.getIndentLineComment=function(fullPath){return PreferencesManager.get(INDENT_LINE_COMMENT,_buildPreferencesContext(fullPath))},Editor.forEveryEditor=function(callback){_instances.forEach(callback)},Editor._toggleLinePadding=function(showLinePadding){var $holders=[];_instances.forEach(function(editor){var $editorHolder=editor.$el.parent();-1===$holders.indexOf($editorHolder)&&$holders.push($editorHolder)}),_.each($holders,function($holder){$holder.toggleClass("show-line-padding",Boolean(showLinePadding))})},Editor.LINE_NUMBER_GUTTER_PRIORITY=LINE_NUMBER_GUTTER_PRIORITY,Editor.CODE_FOLDING_GUTTER_PRIORITY=CODE_FOLDING_GUTTER_PRIORITY,Editor.MARK_OPTION_UNDERLINE_ERROR=MARK_OPTION_UNDERLINE_ERROR,Editor.MARK_OPTION_UNDERLINE_WARN=MARK_OPTION_UNDERLINE_WARN,Editor.MARK_OPTION_UNDERLINE_INFO=MARK_OPTION_UNDERLINE_INFO,Editor.MARK_OPTION_UNDERLINE_SPELLCHECK=MARK_OPTION_UNDERLINE_SPELLCHECK,Editor.MARK_OPTION_HYPERLINK_TEXT=MARK_OPTION_HYPERLINK_TEXT,Editor.MARK_OPTION_MATCHING_REFS=MARK_OPTION_MATCHING_REFS,editorOptions.forEach(function(prefName){PreferencesManager.on("change",prefName,function(){_instances.forEach(function(editor){editor._updateOption(prefName)})})}),exports.Editor=Editor,exports.BOUNDARY_CHECK_NORMAL=0,exports.BOUNDARY_IGNORE_TOP=BOUNDARY_IGNORE_TOP,exports.BOUNDARY_BULLSEYE=2});
//# sourceMappingURL=Editor.js.map
