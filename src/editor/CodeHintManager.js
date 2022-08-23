define(function(require,exports,module){var Commands=require("command/Commands"),CommandManager=require("command/CommandManager"),EditorManager=require("editor/EditorManager"),Strings=require("strings"),KeyEvent=require("utils/KeyEvent"),CodeHintList=require("editor/CodeHintList").CodeHintList,PreferencesManager=require("preferences/PreferencesManager"),hintProviders={all:[]},lastChar=null,sessionProvider=null,sessionEditor=null,hintList=null,deferredHints=null,keyDownEditor=null,codeHintsEnabled=!0,codeHintOpened=!1,_beginSession;function _providerSort(a,b){return b.priority-a.priority}function registerHintProvider(providerInfo,languageIds,priority){var providerObj={provider:providerInfo,priority:priority||0},languageId;if(-1!==languageIds.indexOf("all"))for(languageId in hintProviders)hintProviders.hasOwnProperty(languageId)&&(hintProviders[languageId].push(providerObj),hintProviders[languageId].sort(_providerSort));else languageIds.forEach(function(languageId){hintProviders[languageId]||(hintProviders[languageId]=Array.prototype.concat(hintProviders.all)),hintProviders[languageId].push(providerObj),hintProviders[languageId].sort(_providerSort)})}function _removeHintProvider(provider,targetLanguageId){var index,providers,targetLanguageIdArr;(targetLanguageIdArr=Array.isArray(targetLanguageId)?targetLanguageId:targetLanguageId?[targetLanguageId]:Object.keys(hintProviders)).forEach(function(languageId){for(providers=hintProviders[languageId],index=0;index<providers.length;index++)if(providers[index].provider===provider){providers.splice(index,1);break}})}function _getProvidersForLanguageId(languageId){var providers;return(hintProviders[languageId]||hintProviders.all).filter(function(provider){var prefKey="codehint."+provider.provider.constructor.name;return!1!==PreferencesManager.get(prefKey)})}function _endSession(){hintList&&(hintList.close(),hintList=null,codeHintOpened=!1,keyDownEditor=null,sessionProvider=null,sessionEditor=null,deferredHints&&(deferredHints.reject(),deferredHints=null))}function _inSession(editor){if(sessionEditor){if(sessionEditor===editor&&(hintList.isOpen()||deferredHints&&"pending"===deferredHints.state()))return!0;_endSession()}return!1}function _updateHintList(callMoveUpEvent){if(callMoveUpEvent=void 0!==callMoveUpEvent&&callMoveUpEvent,deferredHints&&(deferredHints.reject(),deferredHints=null),callMoveUpEvent)return hintList.callMoveUp(callMoveUpEvent);var response=sessionProvider.getHints(lastChar);if(lastChar=null,response)if(!0===response){var previousEditor=sessionEditor;_endSession(),_beginSession(previousEditor)}else response.hasOwnProperty("hints")?hintList.isOpen()?hintList.update(response):hintList.open(response):(deferredHints=response,response.done(function(hints){hintList&&(hintList.isOpen()?hintList.update(hints):hintList.open(hints))}));else _endSession()}function _handleKeydownEvent(jqEvent,editor,event){keyDownEditor=editor,event.ctrlKey||event.altKey||event.metaKey||event.keyCode!==KeyEvent.DOM_VK_ENTER&&event.keyCode!==KeyEvent.DOM_VK_RETURN&&event.keyCode!==KeyEvent.DOM_VK_TAB||(lastChar=String.fromCharCode(event.keyCode))}function _handleKeypressEvent(jqEvent,editor,event){keyDownEditor=editor,lastChar=String.fromCharCode(event.charCode),hintList&&hintList.addPendingText(lastChar)}function _handleKeyupEvent(jqEvent,editor,event){keyDownEditor=editor,_inSession(editor)&&(event.keyCode===KeyEvent.DOM_VK_HOME||event.keyCode===KeyEvent.DOM_VK_END?_endSession():event.keyCode===KeyEvent.DOM_VK_LEFT||event.keyCode===KeyEvent.DOM_VK_RIGHT||event.keyCode===KeyEvent.DOM_VK_BACK_SPACE?_updateHintList():event.ctrlKey&&event.keyCode===KeyEvent.DOM_VK_SPACE&&_updateHintList(event))}function _handleCursorActivity(event,editor){_inSession(editor)&&editor.getSelections().length>1&&_endSession()}function _handleChange(event,editor,changeList){if(lastChar&&editor===keyDownEditor){if(keyDownEditor=null,_inSession(editor)){var charToRetest=lastChar;_updateHintList(),_inSession(editor)||(lastChar=charToRetest,_beginSession(editor))}else _beginSession(editor);if(hintList&&changeList[0]&&changeList[0].text.length&&changeList[0].text[0].length){var expectedLength=editor.getCursorPos().ch-changeList[0].from.ch,newText=changeList[0].text[0];newText.length>expectedLength&&(newText=newText.substr(0,expectedLength)),hintList.removePendingText(newText)}}}function hasValidExclusion(exclusion,textAfterCursor){return exclusion&&exclusion===textAfterCursor}function isOpen(){return hintList&&hintList.isOpen()}function _startNewSession(editor){const SHOW_PARAMETER_HINT_CMD_ID="showParameterHint";CommandManager.execute("showParameterHint"),isOpen()||(editor||(editor=EditorManager.getFocusedEditor()),editor&&(lastChar=null,_inSession(editor)&&_endSession(),_beginSession(editor)))}function _getCodeHintList(){return hintList}function activeEditorChangeHandler(event,current,previous){current&&(current.on("editorChange",_handleChange),current.on("keydown",_handleKeydownEvent),current.on("keypress",_handleKeypressEvent),current.on("keyup",_handleKeyupEvent),current.on("cursorActivity",_handleCursorActivity)),previous&&(previous.off("editorChange",_handleChange),previous.off("keydown",_handleKeydownEvent),previous.off("keypress",_handleKeypressEvent),previous.off("keyup",_handleKeyupEvent),previous.off("cursorActivity",_handleCursorActivity))}PreferencesManager.definePreference("showCodeHints","boolean",!0,{description:Strings.DESCRIPTION_SHOW_CODE_HINTS}),PreferencesManager.definePreference("insertHintOnTab","boolean",!1,{description:Strings.DESCRIPTION_INSERT_HINT_ON_TAB}),PreferencesManager.definePreference("maxCodeHints","number",50,{description:Strings.DESCRIPTION_MAX_CODE_HINTS}),PreferencesManager.on("change","showCodeHints",function(){codeHintsEnabled=PreferencesManager.get("showCodeHints")}),_beginSession=function(editor){var language,enabledProviders;if(codeHintsEnabled&&!(editor.getSelections().length>1))if(_getProvidersForLanguageId(editor.getLanguageForSelection().getId()).some(function(item,index){if(item.provider.hasHints(editor,lastChar))return sessionProvider=item.provider,!0}),sessionProvider){var insertHintOnTab,maxCodeHints=PreferencesManager.get("maxCodeHints");insertHintOnTab=void 0!==sessionProvider.insertHintOnTab?sessionProvider.insertHintOnTab:PreferencesManager.get("insertHintOnTab"),(hintList=new CodeHintList(sessionEditor=editor,insertHintOnTab,maxCodeHints)).onHighlight(function($hint,$hintDescContainer){hintList.enableDescription&&$hintDescContainer&&$hintDescContainer.length?(sessionProvider.onHighlight&&sessionProvider.onHighlight($hint,$hintDescContainer),sessionProvider.updateHintDescription&&sessionProvider.updateHintDescription($hint,$hintDescContainer)):sessionProvider.onHighlight&&sessionProvider.onHighlight($hint)}),hintList.onSelect(function(hint){var restart=sessionProvider.insertHint(hint),previousEditor=sessionEditor;_endSession(),restart&&_beginSession(previousEditor)}),hintList.onClose(_endSession),_updateHintList()}else lastChar=null},activeEditorChangeHandler(null,EditorManager.getActiveEditor(),null),EditorManager.on("activeEditorChange",activeEditorChangeHandler),CommandManager.on("beforeExecuteCommand",function(event,commandId){commandId!==Commands.SHOW_CODE_HINTS&&_endSession()}),CommandManager.register(Strings.CMD_SHOW_CODE_HINTS,Commands.SHOW_CODE_HINTS,_startNewSession),exports._getCodeHintList=_getCodeHintList,exports._removeHintProvider=_removeHintProvider,exports.isOpen=isOpen,exports.registerHintProvider=registerHintProvider,exports.hasValidExclusion=hasValidExclusion});
//# sourceMappingURL=CodeHintManager.js.map
