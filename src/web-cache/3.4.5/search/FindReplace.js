define(function(require,exports,module){var CommandManager=require("command/CommandManager"),Commands=require("command/Commands"),MainViewManager=require("view/MainViewManager"),Strings=require("strings"),StringUtils=require("utils/StringUtils"),Editor=require("editor/Editor"),EditorManager=require("editor/EditorManager"),FindBar=require("search/FindBar").FindBar,FindUtils=require("search/FindUtils"),FindInFilesUI=require("search/FindInFilesUI"),ScrollTrackMarkers=require("search/ScrollTrackMarkers"),_=require("thirdparty/lodash"),CodeMirror=require("thirdparty/CodeMirror/lib/codemirror"),FIND_MAX_FILE_SIZE=5e5,FIND_HIGHLIGHT_MAX=2e3,findBar;function SearchState(){this.searchStartPos=null,this.parsedQuery=null,this.queryInfo=null,this.foundAny=!1,this.marked=[],this.resultSet=[],this.matchIndex=-1,this.markedCurrent=null}function getSearchState(cm){return cm._searchState||(cm._searchState=new SearchState),cm._searchState}function getSearchCursor(cm,state,pos){return cm.getSearchCursor(state.parsedQuery,pos,!state.queryInfo.isCaseSensitive)}function parseQuery(queryInfo){findBar&&findBar.showError(null);var parsed=FindUtils.parseQueryInfo(queryInfo);return!0===parsed.empty?"":parsed.valid?parsed.queryExpr:(findBar&&findBar.showError(parsed.error),"")}function setQueryInfo(state,queryInfo){state.queryInfo=queryInfo,state.parsedQuery=queryInfo?parseQuery(queryInfo):null}function _updateFindBarWithMatchInfo(state,matchRange,searchBackwards){state.foundAny&&findBar&&(-1===state.matchIndex?state.matchIndex=_.findIndex(state.resultSet,matchRange):(state.matchIndex=searchBackwards?state.matchIndex-1:state.matchIndex+1,state.matchIndex=(state.matchIndex+state.resultSet.length)%state.resultSet.length,_.isEqual(state.resultSet[state.matchIndex],matchRange)||(state.matchIndex=_.findIndex(state.resultSet,matchRange))),console.assert(-1!==state.matchIndex),-1!==state.matchIndex&&findBar.showFindCount(StringUtils.format(Strings.FIND_MATCH_INDEX,state.matchIndex+1,state.resultSet.length)))}function _getNextMatch(editor,searchBackwards,pos,wrap){var cm=editor._codeMirror,state=getSearchState(cm),cursor=getSearchCursor(cm,state,pos||editor.getCursorPos(!1,searchBackwards?"start":"end"));return state.lastMatch=cursor.find(searchBackwards),state.lastMatch||!1===wrap||(cursor=getSearchCursor(cm,state,searchBackwards?{line:cm.lineCount()-1}:{line:0,ch:0}),state.lastMatch=cursor.find(searchBackwards)),state.lastMatch?{start:cursor.from(),end:cursor.to()}:(cm.setCursor(editor.getCursorPos()),null)}function _selectAndScrollTo(editor,selections,center,preferNoScroll){var primarySelection=_.find(selections,function(sel){return sel.primary})||_.last(selections),resultVisible=editor.isLineVisible(primarySelection.start.line),centerOptions=Editor.BOUNDARY_CHECK_NORMAL;preferNoScroll&&resultVisible&&(centerOptions=Editor.BOUNDARY_IGNORE_TOP);var primary=_.find(selections,function(sel){return sel.primary});primary||(primary=_.last(selections)),editor._codeMirror.scrollIntoView({from:primary.start,to:primary.end}),editor.setSelections(selections,center,centerOptions)}function _getWordAt(editor,pos){for(var cm=editor._codeMirror,start=pos.ch,end=start,line=cm.getLine(pos.line);start&&CodeMirror.isWordChar(line.charAt(start-1));)--start;for(;end<line.length&&CodeMirror.isWordChar(line.charAt(end));)++end;return{start:{line:pos.line,ch:start},end:{line:pos.line,ch:end},text:line.slice(start,end)}}function _selEq(sel1,sel2){return 0===CodeMirror.cmpPos(sel1.start,sel2.start)&&0===CodeMirror.cmpPos(sel1.end,sel2.end)}function _expandWordAndAddNextToSelection(editor,removePrimary){if(editor=editor||EditorManager.getActiveEditor()){var selections=editor.getSelections(),primarySel,primaryIndex,searchText,added=!1;if(_.each(selections,function(sel,index){var isEmpty=0===CodeMirror.cmpPos(sel.start,sel.end);if(sel.primary&&(primarySel=sel,primaryIndex=index,isEmpty||(searchText=editor.document.getRange(primarySel.start,primarySel.end))),isEmpty){var wordInfo=_getWordAt(editor,sel.start);sel.start=wordInfo.start,sel.end=wordInfo.end,sel.primary&&removePrimary&&(searchText=wordInfo.text)}}),searchText&&searchText.length){var state;setQueryInfo(getSearchState(editor._codeMirror),{query:searchText,isCaseSensitive:!1,isRegexp:!1});var searchStart=primarySel.end,nextMatch,isInSelection;do{if((nextMatch=_getNextMatch(editor,!1,searchStart))&&(isInSelection=_.find(selections,_.partial(_selEq,nextMatch)),searchStart=nextMatch.end,0===CodeMirror.cmpPos(searchStart,primarySel.end))){nextMatch=null;break}}while(nextMatch&&isInSelection);nextMatch&&(nextMatch.primary=!0,selections.push(nextMatch),added=!0)}removePrimary&&selections.splice(primaryIndex,1),added?_selectAndScrollTo(editor,selections,!0,!0):_selectAndScrollTo(editor,selections,!1)}}function _skipCurrentMatch(editor){return _expandWordAndAddNextToSelection(editor,!0)}function _findAllAndSelect(editor){if(editor=editor||EditorManager.getActiveEditor()){var sel=editor.getSelection(),newSelections=[];if(0===CodeMirror.cmpPos(sel.start,sel.end)&&(sel=_getWordAt(editor,sel.start)),0!==CodeMirror.cmpPos(sel.start,sel.end)){var searchStart={line:0,ch:0},state,nextMatch;for(setQueryInfo(getSearchState(editor._codeMirror),{query:editor.document.getRange(sel.start,sel.end),isCaseSensitive:!1,isRegexp:!1});null!==(nextMatch=_getNextMatch(editor,!1,searchStart,!1));)_selEq(sel,nextMatch)&&(nextMatch.primary=!0),newSelections.push(nextMatch),searchStart=nextMatch.end;newSelections.length&&editor.setSelections(newSelections,!1)}}}function clearCurrentMatchHighlight(cm,state){state.markedCurrent&&(state.markedCurrent.clear(),ScrollTrackMarkers.markCurrent(-1))}function findNext(editor,searchBackwards,preferNoScroll,pos){var cm=editor._codeMirror;cm.operation(function(){var state=getSearchState(cm);clearCurrentMatchHighlight(cm,state);var nextMatch=_getNextMatch(editor,searchBackwards,pos);if(nextMatch){if(state.resultSet.length&&(_updateFindBarWithMatchInfo(state,{from:nextMatch.start,to:nextMatch.end},searchBackwards),state.marked.length&&ScrollTrackMarkers.markCurrent(state.matchIndex)),_selectAndScrollTo(editor,[nextMatch],!0,preferNoScroll),findBar&&!findBar.isClosed()){var curentMatchClassName=state.marked.length?"searching-current-match":"CodeMirror-searching searching-current-match";state.markedCurrent=cm.markText(nextMatch.start,nextMatch.end,{className:curentMatchClassName,startStyle:"searching-first",endStyle:"searching-last"})}}else cm.setCursor(editor.getCursorPos())})}function clearHighlights(cm,state){cm.operation(function(){state.marked.forEach(function(markedRange){markedRange.clear()}),clearCurrentMatchHighlight(cm,state)}),state.marked.length=0,state.markedCurrent=null,ScrollTrackMarkers.clear(),state.resultSet=[],state.matchIndex=-1}function clearSearch(cm){cm.operation(function(){var state=getSearchState(cm);state.parsedQuery&&(setQueryInfo(state,null),clearHighlights(cm,state))})}function toggleHighlighting(editor,enabled){enabled?$(editor.getRootElement()).addClass("find-highlighting"):$(editor.getRootElement()).removeClass("find-highlighting"),ScrollTrackMarkers.setVisible(editor,enabled)}function updateResultSet(editor){var cm=editor._codeMirror,state=getSearchState(cm);function indicateHasMatches(numResults){findBar.showNoResults(!state.foundAny&&findBar.getQueryInfo().query),findBar.enableNavigation(state.foundAny&&numResults>1),findBar.enableReplace(state.foundAny)}cm.operation(function(){if(state.marked&&clearHighlights(cm,state),!state.parsedQuery)return findBar.showFindCount(""),state.foundAny=!1,void indicateHasMatches();var cursor=getSearchCursor(cm,state);if(cm.getValue().length<=FIND_MAX_FILE_SIZE){for(state.resultSet=[];cursor.findNext();)state.resultSet.push(cursor.pos);if(state.resultSet.length<=FIND_HIGHLIGHT_MAX){toggleHighlighting(editor,!0),state.resultSet.forEach(function(result){state.marked.push(cm.markText(result.from,result.to,{className:"CodeMirror-searching",startStyle:"searching-first",endStyle:"searching-last"}))});var scrollTrackPositions=state.resultSet.map(function(result){return result.from});ScrollTrackMarkers.addTickmarks(editor,scrollTrackPositions)}0===state.resultSet.length&&findBar.showFindCount(Strings.FIND_NO_RESULTS),state.foundAny=state.resultSet.length>0,indicateHasMatches(state.resultSet.length)}else findBar.showFindCount(""),state.foundAny=cursor.findNext(),indicateHasMatches()})}function handleQueryChange(editor,state,initial){setQueryInfo(state,findBar.getQueryInfo()),updateResultSet(editor),state.parsedQuery?findNext(editor,!1,!0,state.searchStartPos):initial||editor._codeMirror.setCursor(state.searchStartPos),editor.lastParsedQuery=state.parsedQuery}function openSearchBar(editor,replace){var cm=editor._codeMirror,state=getSearchState(cm);state.searchStartPos=editor.getCursorPos(!1,"start");var initialQuery=FindBar.getInitialQuery(findBar,editor);""===initialQuery.query&&""!==editor.lastParsedQuery&&(initialQuery.query=editor.lastParsedQuery),findBar&&findBar.close(),(findBar=new FindBar({multifile:!1,replace:replace,initialQuery:initialQuery.query,initialReplaceText:initialQuery.replaceText,queryPlaceholder:Strings.FIND_QUERY_PLACEHOLDER})).open(),findBar.on("queryChange.FindReplace",function(e){handleQueryChange(editor,state)}).on("doFind.FindReplace",function(e,searchBackwards){findNext(editor,searchBackwards)}).on("close.FindReplace",function(e){editor.lastParsedQuery=state.parsedQuery,clearHighlights(cm,state),toggleHighlighting(editor,!1),findBar.off(".FindReplace"),findBar=null}),handleQueryChange(editor,state,!0)}function doSearch(editor,searchBackwards){var state;getSearchState(editor._codeMirror).parsedQuery?findNext(editor,searchBackwards):openSearchBar(editor,!1)}function _handleFileChanged(){findBar&&findBar.close()}function doReplace(editor,all){var cm=editor._codeMirror,state=getSearchState(cm),replaceText=findBar.getReplaceText();cm.options.readOnly||(null===all?(findBar.close(),FindInFilesUI.searchAndReplaceResults(state.queryInfo,editor.document.file,null,replaceText)):all?(findBar.close(),FindInFilesUI.searchAndShowResults(state.queryInfo,editor.document.file,null,replaceText)):(cm.replaceSelection(state.queryInfo.isRegexp?FindUtils.parseDollars(replaceText,state.lastMatch):replaceText),updateResultSet(editor),findNext(editor),state.lastMatch||findBar.close()))}function replace(editor){findBar&&findBar.getOptions().replace&&findBar.isReplaceEnabled()?doReplace(editor,!1):(openSearchBar(editor,!0),findBar.on("doReplace.FindReplace",function(e){doReplace(editor,!1)}).on("doReplaceBatch.FindReplace",function(e){doReplace(editor,!0)}).on("doReplaceAll.FindReplace",function(e){doReplace(editor,null)}))}function _launchFind(){var editor=EditorManager.getActiveEditor();editor&&(clearSearch(editor._codeMirror),doSearch(editor,!1))}function _findNext(){var editor=EditorManager.getActiveEditor();editor&&doSearch(editor)}function _findPrevious(){var editor=EditorManager.getActiveEditor();editor&&doSearch(editor,!0)}function _replace(){var editor=EditorManager.getActiveEditor();editor&&replace(editor)}MainViewManager.on("currentFileChange",_handleFileChanged),CommandManager.register(Strings.CMD_FIND,Commands.CMD_FIND,_launchFind),CommandManager.register(Strings.CMD_FIND_NEXT,Commands.CMD_FIND_NEXT,_findNext),CommandManager.register(Strings.CMD_REPLACE,Commands.CMD_REPLACE,_replace),CommandManager.register(Strings.CMD_FIND_PREVIOUS,Commands.CMD_FIND_PREVIOUS,_findPrevious),CommandManager.register(Strings.CMD_FIND_ALL_AND_SELECT,Commands.CMD_FIND_ALL_AND_SELECT,_findAllAndSelect),CommandManager.register(Strings.CMD_ADD_NEXT_MATCH,Commands.CMD_ADD_NEXT_MATCH,_expandWordAndAddNextToSelection),CommandManager.register(Strings.CMD_SKIP_CURRENT_MATCH,Commands.CMD_SKIP_CURRENT_MATCH,_skipCurrentMatch),exports._getWordAt=_getWordAt,exports._expandWordAndAddNextToSelection=_expandWordAndAddNextToSelection,exports._findAllAndSelect=_findAllAndSelect});
//# sourceMappingURL=FindReplace.js.map
