define(function(require,exports,module){const CodeMirror=require("thirdparty/CodeMirror/lib/codemirror"),Menus=require("command/Menus");function _applyChanges(changeList){let self=this;if(!self._visibleRange||null!==self._visibleRange.startLine&&null!==self._visibleRange.endLine){var cm=self._codeMirror;cm.operation(function(){var change,newText,i;for(i=0;i<changeList.length;i++)newText=(change=changeList[i]).text.join("\n"),change.from&&change.to?cm.replaceRange(newText,change.from,change.to,change.origin):((change.from||change.to)&&console.error("Change record received with only one end undefined--replacing entire text"),cm.setValue(newText))}),self._updateHiddenLines()}else self.trigger("lostContent")}function _handleEditorChange(changeList){let self=this;self._duringSync||(self.document._ensureMasterEditor(),self.document._masterEditor!==self&&(self._duringSync=!0,self.document._masterEditor._applyChanges(changeList),self._duringSync=!1,self._updateHiddenLines()),self.trigger("editorChange",self,changeList))}function _handleDocumentChange(event,doc,changeList){let self=this;self._duringSync||self.document._masterEditor!==self&&(self._duringSync=!0,self._applyChanges(changeList),self._duringSync=!1)}function _handleDocumentDeleted(event){self.trigger("lostContent",event)}function _handleDocumentLanguageChanged(event){let self=this;this._codeMirror.setOption("mode",this._getModeFromDocument())}function _installEditorListeners(){let self=this;function _onKeyEvent(instance,event){return self.trigger("keyEvent",self,event),self.trigger(event.type,self,event),event.defaultPrevented}self._codeMirror.on("keydown",_onKeyEvent),self._codeMirror.on("keypress",_onKeyEvent),self._codeMirror.on("keyup",_onKeyEvent),self._codeMirror.on("changes",function(instance,changeList){self.trigger("change",self,changeList)}),self._codeMirror.on("viewportChange",function(instance,from,to){self.trigger("viewportChange",self,from,to)}),self._codeMirror.on("beforeChange",function(instance,changeObj){self.trigger("beforeChange",self,changeObj)}),self._codeMirror.on("cursorActivity",function(instance){self.trigger("cursorActivity",self)}),self._codeMirror.on("beforeSelectionChange",function(instance,selectionObj){self.trigger("beforeSelectionChange",selectionObj,self)}),self._codeMirror.on("scroll",function(instance){self.isFullyVisible()&&Menus.closeAll(),self.trigger("scroll",self)}),self._codeMirror.on("focus",function(){self._focused=!0,self.trigger("focus",self)}),self._codeMirror.on("blur",function(){self._focused=!1,self.trigger("blur",self)}),self._codeMirror.on("update",function(instance){self.trigger("update",self)}),self._codeMirror.on("overwriteToggle",function(instance,newstate){self.trigger("overwriteToggle",self,newstate)}),self._codeMirror.on("drop",function(cm,event){var files=event.dataTransfer.files;files&&files.length&&event.preventDefault()}),self._codeMirror.on("renderLine",function(cm,line,elt){var charWidth=self._codeMirror.defaultCharWidth(),off=CodeMirror.countColumn(line.text,null,cm.getOption("tabSize"))*charWidth;elt.style.textIndent="-"+off+"px",elt.style.paddingLeft=off+"px"})}function addHelpers(Editor){Editor.prototype._applyChanges=_applyChanges,Editor.prototype._handleEditorChange=_handleEditorChange,Editor.prototype._handleDocumentChange=_handleDocumentChange,Editor.prototype._handleDocumentDeleted=_handleDocumentDeleted,Editor.prototype._handleDocumentLanguageChanged=_handleDocumentLanguageChanged,Editor.prototype._installEditorListeners=_installEditorListeners}exports.addHelpers=addHelpers});
//# sourceMappingURL=ChangeHelper.js.map
