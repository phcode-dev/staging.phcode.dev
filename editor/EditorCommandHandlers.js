define(function(require,exports,module){var Commands=require("command/Commands"),Strings=require("strings"),Editor=require("editor/Editor").Editor,CommandManager=require("command/CommandManager"),EditorManager=require("editor/EditorManager"),StringUtils=require("utils/StringUtils"),TokenUtils=require("utils/TokenUtils"),CodeMirror=require("thirdparty/CodeMirror/lib/codemirror"),_=require("thirdparty/lodash"),DIRECTION_UP=-1,DIRECTION_DOWN=1;function _createSpecialLineExp(lineSyntax,blockSyntax){var i,character,escapedCharacter,subExps=[],prevChars="";for(i=lineSyntax.length;i<blockSyntax.length;i++)character=blockSyntax.charAt(i),escapedCharacter=StringUtils.regexEscape(character),subExps.push(prevChars+"[^"+escapedCharacter+"]"),prevChars&&subExps.push(prevChars+"$"),prevChars+=escapedCharacter;return new RegExp("^\\s*"+StringUtils.regexEscape(lineSyntax)+"($|"+subExps.join("|")+")")}function _createLineExpressions(prefixes,blockPrefix,blockSuffix){var lineExp=[],escapedPrefix,nothingPushed;return prefixes.forEach(function(prefix){escapedPrefix=StringUtils.regexEscape(prefix),nothingPushed=!0,blockPrefix&&0===blockPrefix.indexOf(prefix)&&(lineExp.push(_createSpecialLineExp(prefix,blockPrefix)),nothingPushed=!1),blockSuffix&&blockPrefix!==blockSuffix&&0===blockSuffix.indexOf(prefix)&&(lineExp.push(_createSpecialLineExp(prefix,blockSuffix)),nothingPushed=!1),nothingPushed&&lineExp.push(new RegExp("^\\s*"+escapedPrefix))}),lineExp}function _matchExpressions(string,expressions){return expressions.some(function(exp){return string.match(exp)})}function _getLinePrefix(string,expressions,prefixes){var result=null;return expressions.forEach(function(exp,index){string.match(exp)&&(result&&result.length<prefixes[index].length||!result)&&(result=prefixes[index])}),result}function _containsNotLineComment(editor,startLine,endLine,lineExp){var i,line,containsNotLineComment=!1;for(i=startLine;i<=endLine;i++)if((line=editor.document.getLine(i)).match(/\S/)&&!_matchExpressions(line,lineExp)){containsNotLineComment=!0;break}return containsNotLineComment}function _getLineCommentPrefixEdit(editor,prefixes,blockPrefix,blockSuffix,lineSel){var doc=editor.document,sel=lineSel.selectionForEdit,trackedSels=lineSel.selectionsToTrack,lineExp=_createLineExpressions(prefixes,blockPrefix,blockSuffix),startLine=sel.start.line,endLine=sel.end.line,editGroup=[],i,line,prefix,commentI,containsNotLineComment;if(0===sel.end.ch&&endLine--,_containsNotLineComment(editor,startLine,endLine,lineExp)){var originalCursorPosition=(line=doc.getLine(startLine)).search(/\S|$/),firstCharPosition,cursorPosition=originalCursorPosition;for(i=startLine;i<=endLine;i++)Editor.getIndentLineComment()?(i!==startLine&&(firstCharPosition=(line=doc.getLine(i)).search(/\S|$/)),cursorPosition=firstCharPosition<originalCursorPosition?firstCharPosition:originalCursorPosition,editGroup.push({text:prefixes[0],start:{line:i,ch:cursorPosition}})):editGroup.push({text:prefixes[0],start:{line:i,ch:0}});_.each(trackedSels,function(trackedSel){0===trackedSel.start.ch&&0!==CodeMirror.cmpPos(trackedSel.start,trackedSel.end)?(trackedSel.start={line:trackedSel.start.line,ch:0},trackedSel.end={line:trackedSel.end.line,ch:trackedSel.end.line===endLine?trackedSel.end.ch+prefixes[0].length:0}):trackedSel.isBeforeEdit=!0})}else{for(i=startLine;i<=endLine;i++)(prefix=_getLinePrefix(line=doc.getLine(i),lineExp,prefixes))&&(commentI=line.indexOf(prefix),editGroup.push({text:"",start:{line:i,ch:commentI},end:{line:i,ch:commentI+prefix.length}}));_.each(trackedSels,function(trackedSel){trackedSel.isBeforeEdit=!0})}return{edit:editGroup,selection:trackedSels}}function _isPrevTokenABlockComment(ctx,prefix,suffix,prefixExp,suffixExp,lineExp){for(var result=TokenUtils.moveSkippingWhitespace(TokenUtils.movePrevToken,ctx);result&&_matchExpressions(ctx.token.string,lineExp);)result=TokenUtils.moveSkippingWhitespace(TokenUtils.movePrevToken,ctx);return!(!result||"comment"!==ctx.token.type)&&(!ctx.token.string.match(prefixExp)&&!ctx.token.string.match(suffixExp)||(prefix===suffix&&ctx.token.string.length===prefix.length?!_isPrevTokenABlockComment(ctx,prefix,suffix,prefixExp,suffixExp,lineExp):ctx.token.string.match(prefixExp)))}function _firstNotWs(doc,lineNum){var text=doc.getLine(lineNum);return null==text?0:text.search(/\S|$/)}function _getBlockCommentPrefixSuffixEdit(editor,prefix,suffix,linePrefixes,sel,selectionsToTrack,command){var doc=editor.document,ctx=TokenUtils.getInitialContext(editor._codeMirror,{line:sel.start.line,ch:sel.start.ch}),selEndIndex=editor.indexFromPos(sel.end),lineExp=_createLineExpressions(linePrefixes,prefix,suffix),prefixExp=new RegExp("^"+StringUtils.regexEscape(prefix),"g"),suffixExp=new RegExp(StringUtils.regexEscape(suffix)+"$","g"),prefixPos=null,suffixPos=null,commentAtStart=!0,isBlockComment=!1,canComment=!1,invalidComment=!1,lineUncomment=!1,result=!0,editGroup=[],edit,searchCtx,atSuffix,suffixEnd,initialPos,endLine,indentLineComment=Editor.getIndentLineComment();function isIndentLineCommand(){return indentLineComment&&"line"===command}for(selectionsToTrack||(selectionsToTrack=[_.cloneDeep(sel)]),ctx.token.type||/\S/.test(ctx.token.string)||(result=TokenUtils.moveSkippingWhitespace(TokenUtils.moveNextToken,ctx));result&&"comment"!==ctx.token.type;)result=TokenUtils.moveSkippingWhitespace(TokenUtils.moveNextToken,ctx)&&editor.indexFromPos(ctx.pos)<=selEndIndex,commentAtStart=!1;if(result&&"comment"===ctx.token.type)if(_matchExpressions(ctx.token.string,lineExp)?isBlockComment=!(0!==ctx.token.start||ctx.token.string.match(/^\\s*/)||!commentAtStart)&&_isPrevTokenABlockComment(searchCtx=TokenUtils.getInitialContext(editor._codeMirror,{line:ctx.pos.line,ch:ctx.token.start}),prefix,suffix,prefixExp,suffixExp,lineExp):(isBlockComment=!0,ctx.token.string===prefix&&prefix===suffix&&((atSuffix=_isPrevTokenABlockComment(searchCtx=TokenUtils.getInitialContext(editor._codeMirror,{line:ctx.pos.line,ch:ctx.token.start}),prefix,suffix,prefixExp,suffixExp,lineExp))?TokenUtils.moveSkippingWhitespace(TokenUtils.movePrevToken,ctx):TokenUtils.moveSkippingWhitespace(TokenUtils.moveNextToken,ctx))),isBlockComment){for(initialPos=_.cloneDeep(ctx.pos),result=!0;result&&!ctx.token.string.match(prefixExp);)result=TokenUtils.moveSkippingWhitespace(TokenUtils.movePrevToken,ctx);for(prefixPos=result&&{line:ctx.pos.line,ch:ctx.token.start},ctx.token.string===prefix&&prefix===suffix&&(ctx=TokenUtils.getInitialContext(editor._codeMirror,_.cloneDeep(initialPos)));result&&!ctx.token.string.match(suffixExp);)result=TokenUtils.moveSkippingWhitespace(TokenUtils.moveNextToken,ctx);suffixPos=result&&{line:ctx.pos.line,ch:ctx.token.end-suffix.length};do{result=TokenUtils.moveSkippingWhitespace(TokenUtils.moveNextToken,ctx)&&editor.indexFromPos(ctx.pos)<=selEndIndex}while(result&&!ctx.token.string.match(prefixExp));invalidComment=result&&!!ctx.token.string.match(prefixExp),((suffixEnd=suffixPos&&{line:suffixPos.line,ch:suffixPos.ch+suffix.length})&&CodeMirror.cmpPos(sel.start,suffixEnd)>0||prefixPos&&CodeMirror.cmpPos(sel.end,prefixPos)<0)&&(canComment=!0)}else endLine=sel.end.line,0===sel.end.ch&&editor.hasSelection()&&endLine--,_containsNotLineComment(editor,sel.start.line,endLine,lineExp)?canComment=!0:lineUncomment=!0;else canComment=!0;if(invalidComment)edit={edit:[],selection:selectionsToTrack};else if(lineUncomment)edit=null;else{if(canComment){var completeLineSel=0===sel.start.ch&&0===sel.end.ch&&sel.start.line<sel.end.line,startCh=_firstNotWs(doc,sel.start.line);if(completeLineSel)if(isIndentLineCommand()){var endCh=_firstNotWs(doc,sel.end.line-1),useTabChar,indentChar=Editor.getUseTabChar(editor.document.file.fullPath)?"\t":" ";editGroup.push({text:_.repeat(indentChar,endCh)+suffix+"\n",start:{line:sel.end.line,ch:0}}),editGroup.push({text:prefix+"\n"+_.repeat(indentChar,startCh),start:{line:sel.start.line,ch:startCh}})}else editGroup.push({text:suffix+"\n",start:sel.end}),editGroup.push({text:prefix+"\n",start:sel.start});else editGroup.push({text:suffix,start:sel.end}),isIndentLineCommand()?editGroup.push({text:prefix,start:{line:sel.start.line,ch:startCh}}):editGroup.push({text:prefix,start:sel.start});_.each(selectionsToTrack,function(trackedSel){function updatePosForEdit(pos){CodeMirror.cmpPos(pos,sel.end)>0&&(completeLineSel?pos.line++:pos.line===sel.end.line&&(pos.ch+=suffix.length)),CodeMirror.cmpPos(pos,sel.start)>=0&&(completeLineSel?pos.line++:pos.line!==sel.start.line||isIndentLineCommand()&&pos.ch<startCh||(pos.ch+=prefix.length))}updatePosForEdit(trackedSel.start),updatePosForEdit(trackedSel.end)})}else{var line=doc.getLine(prefixPos.line).trim(),prefixAtStart=0===prefixPos.ch&&prefix.length===line.length,prefixIndented=indentLineComment&&prefix.length===line.length,suffixAtStart=!1,suffixIndented=!1;suffixPos&&(line=doc.getLine(suffixPos.line).trim(),suffixAtStart=0===suffixPos.ch&&suffix.length===line.length,suffixIndented=indentLineComment&&suffix.length===line.length),suffixPos&&(suffixIndented?editGroup.push({text:"",start:{line:suffixPos.line,ch:0},end:{line:suffixPos.line+1,ch:0}}):prefixAtStart&&suffixAtStart?editGroup.push({text:"",start:suffixPos,end:{line:suffixPos.line+1,ch:0}}):editGroup.push({text:"",start:suffixPos,end:{line:suffixPos.line,ch:suffixPos.ch+suffix.length}})),prefixIndented?editGroup.push({text:"",start:{line:prefixPos.line,ch:0},end:{line:prefixPos.line+1,ch:0}}):prefixAtStart&&suffixAtStart?editGroup.push({text:"",start:prefixPos,end:{line:prefixPos.line+1,ch:0}}):editGroup.push({text:"",start:prefixPos,end:{line:prefixPos.line,ch:prefixPos.ch+prefix.length}}),_.each(selectionsToTrack,function(trackedSel){trackedSel.isBeforeEdit=!0})}edit={edit:editGroup,selection:selectionsToTrack}}return edit}function _getLineCommentPrefixSuffixEdit(editor,prefix,suffix,lineSel,command){var sel=lineSel.selectionForEdit;return sel.end.line===sel.start.line+1&&0===sel.end.ch&&(sel.end={line:sel.start.line,ch:editor.document.getLine(sel.start.line).length}),_getBlockCommentPrefixSuffixEdit(editor,prefix,suffix,[],sel,lineSel.selectionsToTrack,command)}function _getLineCommentEdits(editor,selections,command){var lineSelections=editor.convertToLineSelections(selections,{mergeAdjacent:!1}),edits=[];return _.each(lineSelections,function(lineSel){var sel=lineSel.selectionForEdit,mode=editor.getModeForRange(sel.start,sel.end),edit;if(mode){var language=editor.document.getLanguage().getLanguageForMode(mode.name||mode);language.hasLineCommentSyntax()?edit=_getLineCommentPrefixEdit(editor,language.getLineCommentPrefixes(),language.getBlockCommentPrefix(),language.getBlockCommentSuffix(),lineSel):language.hasBlockCommentSyntax()&&(edit=_getLineCommentPrefixSuffixEdit(editor,language.getBlockCommentPrefix(),language.getBlockCommentSuffix(),lineSel,command))}edit||(edit={selection:lineSel.selectionsToTrack}),edits.push(edit)}),edits}function lineComment(editor){(editor=editor||EditorManager.getFocusedEditor())&&editor.setSelections(editor.document.doMultipleEdits(_getLineCommentEdits(editor,editor.getSelections(),"line")))}function blockComment(editor){if(editor=editor||EditorManager.getFocusedEditor()){var edits=[],lineCommentSels=[];_.each(editor.getSelections(),function(sel){var mode=editor.getModeForRange(sel.start,sel.end),edit={edit:[],selection:[sel]};if(mode){var language=editor.document.getLanguage().getLanguageForMode(mode.name||mode);language.hasBlockCommentSyntax()&&((edit=_getBlockCommentPrefixSuffixEdit(editor,language.getBlockCommentPrefix(),language.getBlockCommentSuffix(),language.getLineCommentPrefixes(),sel))||lineCommentSels.push(sel))}edit&&edits.push(edit)}),edits.push.apply(edits,_getLineCommentEdits(editor,lineCommentSels,"block")),editor.setSelections(editor.document.doMultipleEdits(edits))}}function duplicateText(editor){if(editor=editor||EditorManager.getFocusedEditor()){var selections=editor.getSelections(),delimiter="",edits=[],rangeSels=[],cursorSels=[],doc=editor.document;_.each(selections,function(sel){0===CodeMirror.cmpPos(sel.start,sel.end)?cursorSels.push(sel):rangeSels.push(sel)});var cursorLineSels=editor.convertToLineSelections(cursorSels);_.each(cursorLineSels,function(lineSel,index){var sel=lineSel.selectionForEdit;sel.end.line===editor.lineCount()&&(delimiter="\n"),edits.push({edit:{text:doc.getRange(sel.start,sel.end)+delimiter,start:sel.start}})}),_.each(rangeSels,function(sel){edits.push({edit:{text:doc.getRange(sel.start,sel.end),start:sel.start}})}),doc.doMultipleEdits(edits)}}function deleteCurrentLines(editor){if(editor=editor||EditorManager.getFocusedEditor()){var doc=editor.document,from,to,lineSelections=editor.convertToLineSelections(editor.getSelections()),edits=[];_.each(lineSelections,function(lineSel,index){var sel=lineSel.selectionForEdit;from=sel.start,(to=sel.end).line===editor.getLastVisibleLine()+1&&(from.line>editor.getFirstVisibleLine()&&(from.line-=1,from.ch=doc.getLine(from.line).length),to.line-=1,to.ch=doc.getLine(to.line).length),edits.push({edit:{text:"",start:from,end:to}})}),doc.doMultipleEdits(edits)}}function moveLine(editor,direction){if(editor=editor||EditorManager.getFocusedEditor()){var doc=editor.document,lineSelections=editor.convertToLineSelections(editor.getSelections()),isInlineWidget=!!EditorManager.getFocusedInlineWidget(),firstLine=editor.getFirstVisibleLine(),lastLine=editor.getLastVisibleLine(),totalLines=editor.lineCount(),lineLength=0,edits=[],newSels=[],pos={};_.each(lineSelections,function(lineSel){var sel=lineSel.selectionForEdit,editGroup=[];switch(direction){case DIRECTION_UP:if(sel.start.line!==firstLine){var prevText=doc.getRange({line:sel.start.line-1,ch:0},sel.start);sel.end.line===lastLine+1&&(isInlineWidget?(prevText=prevText.substring(0,prevText.length-1),lineLength=doc.getLine(sel.end.line-1).length,editGroup.push({text:"\n",start:{line:sel.end.line-1,ch:lineLength}})):prevText="\n"+prevText.substring(0,prevText.length-1)),editGroup.push({text:"",start:{line:sel.start.line-1,ch:0},end:sel.start}),editGroup.push({text:prevText,start:{line:sel.end.line-1,ch:0}}),_.each(lineSel.selectionsToTrack,function(originalSel){originalSel.start.line--,originalSel.end.line--}),edits.push({edit:editGroup,selection:lineSel.selectionsToTrack})}break;case DIRECTION_DOWN:if(sel.end.line<=lastLine){var nextText=doc.getRange(sel.end,{line:sel.end.line+1,ch:0}),deletionStart=sel.end;sel.end.line===lastLine&&(isInlineWidget?(sel.end.line===totalLines-1&&(nextText+="\n"),lineLength=doc.getLine(sel.end.line-1).length,editGroup.push({text:"\n",start:{line:sel.end.line,ch:doc.getLine(sel.end.line).length}})):(nextText+="\n",deletionStart={line:sel.end.line-1,ch:doc.getLine(sel.end.line-1).length})),editGroup.push({text:"",start:deletionStart,end:{line:sel.end.line+1,ch:0}}),lineLength&&editGroup.push({text:"",start:{line:sel.end.line-1,ch:lineLength},end:{line:sel.end.line,ch:0}}),editGroup.push({text:nextText,start:{line:sel.start.line,ch:0}}),edits.push({edit:editGroup})}}}),edits.length&&(newSels=doc.doMultipleEdits(edits),pos.ch=0,direction===DIRECTION_UP?(editor.setSelections(newSels),pos.line=editor.getSelection().start.line):direction===DIRECTION_DOWN?pos.line=editor.getSelection().end.line:(console.error("EditorCommandHandler.moveLine() called with invalid argument 'direction' = %d",direction),pos=null),editor._codeMirror.scrollIntoView(pos))}}function moveLineUp(editor){moveLine(editor,DIRECTION_UP)}function moveLineDown(editor){moveLine(editor,DIRECTION_DOWN)}function openLine(editor,direction){if(editor=editor||EditorManager.getFocusedEditor()){var selections=editor.getSelections(),isInlineWidget=!!EditorManager.getFocusedInlineWidget(),lastLine=editor.getLastVisibleLine(),doc=editor.document,edits=[],newSelections,line;doc.batchOperation(function(){_.each(selections,function(sel,index){if(0===index||direction===DIRECTION_UP&&sel.start.line>selections[index-1].start.line||direction===DIRECTION_DOWN&&sel.end.line>selections[index-1].end.line){switch(direction){case DIRECTION_UP:line=sel.start.line;break;case DIRECTION_DOWN:line=sel.end.line,0!==CodeMirror.cmpPos(sel.start,sel.end)&&0===sel.end.ch||line++}var insertPos;insertPos=line>lastLine&&isInlineWidget?{line:line-1,ch:doc.getLine(line-1).length}:{line:line,ch:0},edits.push({edit:{text:"\n",start:insertPos},selection:{start:insertPos,end:insertPos,primary:sel.primary}})}else sel.primary&&(edits[edits.length-1].selections[0].primary=!0)}),newSelections=doc.doMultipleEdits(edits,"+input"),_.each(newSelections,function(sel){doc._masterEditor._codeMirror.indentLine(sel.start.line,"smart",!0),sel.start.ch=null,sel.end=sel.start})}),editor.setSelections(newSelections)}}function openLineAbove(editor){openLine(editor,DIRECTION_UP)}function openLineBelow(editor){openLine(editor,DIRECTION_DOWN)}function indentText(){var editor=EditorManager.getFocusedEditor();editor&&editor._codeMirror.execCommand("indentMore")}function unindentText(){var editor=EditorManager.getFocusedEditor();editor&&editor._codeMirror.execCommand("indentLess")}function selectLine(editor){(editor=editor||EditorManager.getFocusedEditor())&&editor.setSelections(_.pluck(editor.convertToLineSelections(editor.getSelections(),{expandEndAtStartOfLine:!0}),"selectionForEdit"))}function splitSelIntoLines(editor){(editor=editor||EditorManager.getFocusedEditor())&&editor._codeMirror.execCommand("splitSelectionByLine")}function addCursorToSelection(editor,dir){if(editor=editor||EditorManager.getFocusedEditor()){var origSels=editor.getSelections(),newSels=[];_.each(origSels,function(sel){var pos,colOffset;(-1===dir&&sel.start.line>editor.getFirstVisibleLine()||1===dir&&sel.end.line<editor.getLastVisibleLine())&&(pos=_.clone(-1===dir?sel.start:sel.end),colOffset=editor.getColOffset(pos),pos.line+=dir,pos.ch=editor.getCharIndexForColumn(pos.line,colOffset),newSels.push({start:pos,end:pos,primary:sel.primary}),sel.primary=!1)}),editor.setSelections(origSels.concat(newSels))}}function addCursorToPrevLine(editor){addCursorToSelection(editor,-1)}function addCursorToNextLine(editor){addCursorToSelection(editor,1)}function handleUndoRedo(operation){var editor=EditorManager.getFocusedEditor(),result=new $.Deferred;return editor?(editor[operation](),result.resolve()):result.reject(),result.promise()}function handleUndo(){return handleUndoRedo("undo")}function handleRedo(){return handleUndoRedo("redo")}function _handleSelectAll(){var result=new $.Deferred,editor=EditorManager.getFocusedEditor();return editor?(editor.selectAllNoScroll(),result.resolve()):result.reject(),result.promise()}function _execCommand(cmd){window.document.execCommand(cmd)}function _execCommandCut(){_execCommand("cut")}function _execCommandCopy(){_execCommand("copy")}function _applyPaste(text){var editor=EditorManager.getFocusedEditor();if(editor){var doc=editor._codeMirror.getDoc(),selection=doc.getSelection(),cursor=doc.getCursor();selection?doc.replaceSelection(text):doc.replaceRange(text,cursor)}}function _execCommandPaste(){const result=new $.Deferred;return Phoenix.app.clipboardReadText().then(_applyPaste).catch(err=>{console.error(err),_execCommand("paste")}).finally(()=>{result.resolve()}),result.promise()}CommandManager.register(Strings.CMD_INDENT,Commands.EDIT_INDENT,indentText),CommandManager.register(Strings.CMD_UNINDENT,Commands.EDIT_UNINDENT,unindentText),CommandManager.register(Strings.CMD_COMMENT,Commands.EDIT_LINE_COMMENT,lineComment),CommandManager.register(Strings.CMD_BLOCK_COMMENT,Commands.EDIT_BLOCK_COMMENT,blockComment),CommandManager.register(Strings.CMD_DUPLICATE,Commands.EDIT_DUPLICATE,duplicateText),CommandManager.register(Strings.CMD_DELETE_LINES,Commands.EDIT_DELETE_LINES,deleteCurrentLines),CommandManager.register(Strings.CMD_LINE_UP,Commands.EDIT_LINE_UP,moveLineUp),CommandManager.register(Strings.CMD_LINE_DOWN,Commands.EDIT_LINE_DOWN,moveLineDown),CommandManager.register(Strings.CMD_OPEN_LINE_ABOVE,Commands.EDIT_OPEN_LINE_ABOVE,openLineAbove),CommandManager.register(Strings.CMD_OPEN_LINE_BELOW,Commands.EDIT_OPEN_LINE_BELOW,openLineBelow),CommandManager.register(Strings.CMD_SELECT_LINE,Commands.EDIT_SELECT_LINE,selectLine),CommandManager.register(Strings.CMD_SPLIT_SEL_INTO_LINES,Commands.EDIT_SPLIT_SEL_INTO_LINES,splitSelIntoLines),CommandManager.register(Strings.CMD_ADD_CUR_TO_NEXT_LINE,Commands.EDIT_ADD_CUR_TO_NEXT_LINE,addCursorToNextLine),CommandManager.register(Strings.CMD_ADD_CUR_TO_PREV_LINE,Commands.EDIT_ADD_CUR_TO_PREV_LINE,addCursorToPrevLine),CommandManager.register(Strings.CMD_UNDO,Commands.EDIT_UNDO,handleUndo),CommandManager.register(Strings.CMD_REDO,Commands.EDIT_REDO,handleRedo),CommandManager.register(Strings.CMD_CUT,Commands.EDIT_CUT,_execCommandCut),CommandManager.register(Strings.CMD_COPY,Commands.EDIT_COPY,_execCommandCopy),CommandManager.register(Strings.CMD_PASTE,Commands.EDIT_PASTE,_execCommandPaste),CommandManager.register(Strings.CMD_SELECT_ALL,Commands.EDIT_SELECT_ALL,_handleSelectAll)});
//# sourceMappingURL=EditorCommandHandlers.js.map
