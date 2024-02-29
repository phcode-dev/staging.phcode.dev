define(function(require,exports,module){const _=require("thirdparty/lodash"),CodeMirror=require("thirdparty/CodeMirror/lib/codemirror"),PreferencesManager=require("preferences/PreferencesManager"),EditorPreferences=require("./EditorPreferences"),SOFT_TABS=EditorPreferences.SOFT_TABS;function _addIndentAtEachSelection(selections){let self=this;var instance=this._codeMirror,usingTabs=instance.getOption("indentWithTabs"),indentUnit=instance.getOption("indentUnit"),edits=[];_.each(selections,function(sel){var indentStr="",i,numSpaces;if(usingTabs)indentStr="\t";else for(numSpaces=indentUnit-sel.start.ch%indentUnit,i=0;i<numSpaces;i++)indentStr+=" ";edits.push({edit:{text:indentStr,start:sel.start}})}),this.document.doMultipleEdits(edits)}function _autoIndentEachSelection(selections){let self=this;var instance=this._codeMirror,lineLengths={};_.each(selections,function(sel){lineLengths[sel.start.line]=instance.getLine(sel.start.line).length}),CodeMirror.commands.indentAuto(instance);var changed=!1,newSelections=this.getSelections();newSelections.length===selections.length?_.each(selections,function(sel,index){var newSel=newSelections[index];if(0!==CodeMirror.cmpPos(sel.start,newSel.start)||0!==CodeMirror.cmpPos(sel.end,newSel.end)||instance.getLine(sel.start.line).length!==lineLengths[sel.start.line])return changed=!0,!1}):changed=!0,changed||CodeMirror.commands.indentMore(instance)}function _handleTabKey(){let self=this;var instance=self._codeMirror,selectionType="indentAuto",selections=self.getSelections();switch(_.each(selections,function(sel){if(sel.start.line!==sel.end.line)return selectionType="indentAtBeginning",!1;sel.end.ch>0&&sel.end.ch>=instance.getLine(sel.end.line).search(/\S/)&&(selectionType="indentAtSelection")}),selectionType){case"indentAtBeginning":CodeMirror.commands.indentMore(instance);break;case"indentAtSelection":self._addIndentAtEachSelection(selections);break;case"indentAuto":self._autoIndentEachSelection(selections)}}function _handleSoftTabNavigation(direction,functionName){let self=this;var instance=self._codeMirror,overallJump=null;if(!instance.getOption("indentWithTabs")&&PreferencesManager.get(SOFT_TABS)){var indentUnit=instance.getOption("indentUnit");_.each(self.getSelections(),function(sel){if(0===CodeMirror.cmpPos(sel.start,sel.end)){var cursor=sel.start,jump=0===indentUnit?1:cursor.ch%indentUnit,line=instance.getLine(cursor.line);if(-1!==line.substr(0,cursor.ch).search(/\S/)?jump=null:1===direction?(indentUnit&&(jump=indentUnit-jump),(cursor.ch+jump>line.length||-1!==line.substr(cursor.ch,jump).search(/\S/))&&(jump=null)):(0===jump&&(jump=indentUnit),jump=cursor.ch-jump<0?null:-jump),null===jump||null!==overallJump&&overallJump!==jump)return overallJump=null,!1;overallJump=jump}})}null===overallJump&&(overallJump=direction),instance[functionName](overallJump,"char")}function addHelpers(Editor){Editor.prototype._addIndentAtEachSelection=_addIndentAtEachSelection,Editor.prototype._autoIndentEachSelection=_autoIndentEachSelection,Editor.prototype._handleTabKey=_handleTabKey,Editor.prototype._handleSoftTabNavigation=_handleSoftTabNavigation}exports.addHelpers=addHelpers});
//# sourceMappingURL=IndentHelper.js.map
