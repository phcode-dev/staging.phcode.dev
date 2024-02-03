define(function(require,exports,module){require("utils/Global");let KeyBindingManager=require("command/KeyBindingManager"),KeyEvent=require("utils/KeyEvent"),EditorManager=require("editor/EditorManager"),Strings=require("strings"),DialogTemplate=require("text!htmlContent/dialog-template.html"),WorkspaceManager=require("view/WorkspaceManager"),AppInit=require("utils/AppInit"),DefaultDialogs=require("widgets/DefaultDialogs"),Mustache=require("thirdparty/mustache/mustache"),DIALOG_BTN_CANCEL="cancel",DIALOG_BTN_OK="ok",DIALOG_BTN_DONTSAVE="dontsave",DIALOG_BTN_SAVE_AS="save_as",DIALOG_CANCELED="_canceled",DIALOG_BTN_DOWNLOAD="download",DIALOG_BTN_CLASS_PRIMARY="primary",DIALOG_BTN_CLASS_NORMAL="",DIALOG_BTN_CLASS_LEFT="left",zIndex=1050;function _isAnyDialogShown(){let dialogueShown=!1;return $(".modal.instance").each(function(){$(this).is(":visible")&&(dialogueShown=!0)}),dialogueShown}function _dismissDialog($dlg,buttonId){$dlg.data("buttonId",buttonId),$dlg.modal("hide"),!_isAnyDialogShown()&&EditorManager.getActiveEditor()&&EditorManager.getActiveEditor().focus()}function _processButton($dlg,buttonId,autoDismiss){autoDismiss?_dismissDialog($dlg,buttonId):$dlg.triggerHandler("buttonClick",buttonId)}function _hasButton($dlg,buttonId){return $dlg.find("[data-button-id='"+buttonId+"']").length>0}function _handleTab(event,$dlg){let $inputs=$(":input:enabled, a",$dlg).filter(":visible");function stopEvent(){event.stopPropagation(),event.preventDefault()}$(event.target).closest($dlg).length?!event.shiftKey&&event.target===$inputs[$inputs.length-1]||event.shiftKey&&event.target===$inputs[0]?($inputs.filter(event.shiftKey?":last":":first").focus(),stopEvent()):$inputs.length||stopEvent():($inputs.first().focus(),stopEvent())}let _keydownHook=function(e,autoDismiss){let $primaryBtn=this.find(".primary"),buttonId=null,which=String.fromCharCode(e.which),$focusedElement=this.find(".dialog-button:focus, a:focus");function stopEvent(){e.preventDefault(),e.stopPropagation()}let inTextArea="TEXTAREA"===e.target.tagName,inTypingField=inTextArea||$(e.target).filter(":text, :password").length>0;return e.which===KeyEvent.DOM_VK_TAB?_handleTab(e,this):e.which===KeyEvent.DOM_VK_ESCAPE?buttonId=DIALOG_BTN_CANCEL:e.which!==KeyEvent.DOM_VK_RETURN||inTextArea&&!e.ctrlKey?e.which===KeyEvent.DOM_VK_SPACE?$focusedElement.length&&(stopEvent(),$focusedElement.click()):"mac"===brackets.platform?e.metaKey&&e.which===KeyEvent.DOM_VK_BACK_SPACE?_hasButton(this,"dontsave")&&(buttonId="dontsave"):e.metaKey&&e.which===KeyEvent.DOM_VK_PERIOD&&(buttonId=DIALOG_BTN_CANCEL):"N"!==which||inTypingField||_hasButton(this,"dontsave")&&(buttonId="dontsave"):(stopEvent(),"BUTTON"===e.target.tagName?this.find(e.target).click():"INPUT"!==e.target.tagName&&$primaryBtn.click()),buttonId&&(stopEvent(),_processButton(this,buttonId,autoDismiss)),!0};function Dialog($dlg,promise){this._$dlg=$dlg,this._promise=promise}function setDialogMaxSize(){let maxWidth,maxHeight,$dlgs=$(".modal-inner-wrapper > .instance");$dlgs.length>0&&(maxWidth=$("body").width(),maxHeight=$("body").height(),$dlgs.css({"max-width":maxWidth,"max-height":maxHeight,overflow:"auto"}))}function showModalDialogUsingTemplate(template,autoDismiss){void 0===autoDismiss&&(autoDismiss=!0),$("body").append("<div class='modal-wrapper'><div class='modal-inner-wrapper'></div></div>");let result=new $.Deferred,promise=result.promise(),$dlg=$(template).addClass("instance").appendTo(".modal-inner-wrapper:last");setDialogMaxSize(),$dlg.data("promise",promise);let keydownHook=function(e){return _keydownHook.call($dlg,e,autoDismiss)},lastFocus=window.document.activeElement;return $dlg.one("hidden",function(){let buttonId=$dlg.data("buttonId");buttonId||(buttonId=DIALOG_BTN_CANCEL),window.setTimeout(function(){result.resolve(buttonId)},0),$dlg.remove(),KeyBindingManager.removeGlobalKeydownHook(keydownHook),lastFocus&&lastFocus.focus(),$(".modal-wrapper:last").remove()}).one("shown",function(){let $primaryBtn=$dlg.find(".primary:enabled"),$otherBtn=$dlg.find(".modal-footer .dialog-button:enabled:eq(0)");$primaryBtn.length?$primaryBtn.focus():$otherBtn.length?$otherBtn.focus():window.document.activeElement.blur(),KeyBindingManager.addGlobalKeydownHook(keydownHook)}),$dlg.one("click",".dialog-button",function(e){_processButton($dlg,$(this).attr("data-button-id"),autoDismiss)}),$dlg.modal({backdrop:"static",show:!0,selector:".modal-inner-wrapper:last",keyboard:!1}).css("z-index",zIndex+1).next().css("z-index",zIndex),zIndex+=2,new Dialog($dlg,promise)}function showModalDialog(dlgClass,title,message,buttons,autoDismiss){let templateVars={dlgClass:dlgClass,title:title||"",message:message||"",buttons:buttons||[{className:DIALOG_BTN_CLASS_PRIMARY,id:DIALOG_BTN_OK,text:Strings.OK}]},template;return showModalDialogUsingTemplate(Mustache.render(DialogTemplate,templateVars),autoDismiss)}function showConfirmDialog(title,message,autoDismiss){const buttons=[{className:DIALOG_BTN_CLASS_NORMAL,id:DIALOG_BTN_CANCEL,text:Strings.CANCEL},{className:DIALOG_BTN_CLASS_PRIMARY,id:DIALOG_BTN_OK,text:Strings.OK}];return showModalDialog(DefaultDialogs.DIALOG_ID_INFO,title,message,buttons,autoDismiss)}function showInfoDialog(title,message,autoDismiss){return showModalDialog(DefaultDialogs.DIALOG_ID_INFO,title,message,null,autoDismiss)}function showErrorDialog(title,message,autoDismiss){return showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,title,message,null,autoDismiss)}function cancelModalDialogIfOpen(dlgClass,buttonId){$("."+dlgClass+".instance").each(function(){$(this).is(":visible")&&_dismissDialog($(this),buttonId||DIALOG_CANCELED)})}function _dontToggleWorkspacePanel(){return _isAnyDialogShown()}function addLinkTooltips(elementOrDialog){let $element;($element=elementOrDialog.getElement?elementOrDialog.getElement().find(".dialog-message"):elementOrDialog).find("a").each(function(index,elem){let $elem=$(elem),url=$elem.attr("href");url&&"#"!==url&&!$elem.attr("title")&&$elem.attr("title",url)})}Dialog.prototype.getElement=function(){return this._$dlg},Dialog.prototype.getPromise=function(){return this._promise},Dialog.prototype.close=function(){this._$dlg.is(":visible")&&_dismissDialog(this._$dlg,DIALOG_CANCELED)},Dialog.prototype.done=function(callback){this._promise.done(callback)},AppInit.htmlReady(function(){WorkspaceManager.addEscapeKeyEventHandler("ModalDialog",_dontToggleWorkspacePanel)}),window.addEventListener("resize",setDialogMaxSize),exports.DIALOG_BTN_CANCEL=DIALOG_BTN_CANCEL,exports.DIALOG_BTN_OK=DIALOG_BTN_OK,exports.DIALOG_BTN_DONTSAVE="dontsave",exports.DIALOG_BTN_SAVE_AS="save_as",exports.DIALOG_CANCELED=DIALOG_CANCELED,exports.DIALOG_BTN_DOWNLOAD="download",exports.DIALOG_BTN_CLASS_PRIMARY=DIALOG_BTN_CLASS_PRIMARY,exports.DIALOG_BTN_CLASS_NORMAL=DIALOG_BTN_CLASS_NORMAL,exports.DIALOG_BTN_CLASS_LEFT="left",exports.showModalDialog=showModalDialog,exports.showConfirmDialog=showConfirmDialog,exports.showInfoDialog=showInfoDialog,exports.showErrorDialog=showErrorDialog,exports.showModalDialogUsingTemplate=showModalDialogUsingTemplate,exports.cancelModalDialogIfOpen=cancelModalDialogIfOpen,exports.addLinkTooltips=addLinkTooltips});
//# sourceMappingURL=Dialogs.js.map
