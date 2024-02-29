define(function(require,exports,module){var MainViewManager=require("view/MainViewManager"),EventDispatcher=require("utils/EventDispatcher"),KeyEvent=require("utils/KeyEvent"),AnimationUtils=require("utils/AnimationUtils"),WorkspaceManager=require("view/WorkspaceManager");function ModalBar(template,autoClose,animate){if(void 0===animate&&(animate=!0),this._handleKeydown=this._handleKeydown.bind(this),this._handleFocusChange=this._handleFocusChange.bind(this),this._$root=$("<div class='modal-bar'/>").html(template).insertBefore("#editor-holder"),animate&&(this._$root.addClass("popout offscreen"),window.getComputedStyle(this._$root.get(0)).getPropertyValue("top"),this._$root.removeClass("popout offscreen")),MainViewManager.focusActivePane(),autoClose){this._autoClose=!0,this._$root.on("keydown",this._handleKeydown),window.document.body.addEventListener("focusin",this._handleFocusChange,!0);var $firstInput=$("input[type='text']",this._$root).first();$firstInput.length>0?$firstInput.focus():$("button",this._$root).first().focus()}MainViewManager.cacheScrollState(MainViewManager.ALL_PANES),WorkspaceManager.recomputeLayout(),MainViewManager.restoreAdjustedScrollState(MainViewManager.ALL_PANES,this.height())}EventDispatcher.makeEventDispatcher(ModalBar.prototype),ModalBar.prototype._$root=null,ModalBar.prototype._autoClose=!1,ModalBar.prototype.isLockedOpen=null,ModalBar.CLOSE_ESCAPE="escape",ModalBar.CLOSE_BLUR="blur",ModalBar.CLOSE_API="api",ModalBar.prototype.height=function(){return this._$root.outerHeight()},ModalBar.prototype.prepareClose=function(restoreScrollPos){void 0===restoreScrollPos&&(restoreScrollPos=!0),this._$root.addClass("popout");var top=$("#titlebar").outerHeight();this._$root.css("top",top+"px");var barHeight=this.height();restoreScrollPos&&MainViewManager.cacheScrollState(MainViewManager.ALL_PANES),WorkspaceManager.recomputeLayout(),restoreScrollPos&&MainViewManager.restoreAdjustedScrollState(MainViewManager.ALL_PANES,-barHeight)},ModalBar.prototype.close=function(restoreScrollPos,animate,_reason){var result=new $.Deferred,self=this;function doRemove(){self._$root.remove(),result.resolve()}return void 0===restoreScrollPos&&(restoreScrollPos=!0),void 0===animate&&(animate=!0),this._$root.hasClass("popout")||this.prepareClose(restoreScrollPos),this._autoClose&&window.document.body.removeEventListener("focusin",this._handleFocusChange,!0),this.trigger("close",_reason,result),animate?AnimationUtils.animateUsingClass(this._$root.get(0),"offscreen").done(doRemove):doRemove(),MainViewManager.focusActivePane(),result.promise()},ModalBar.prototype._handleKeydown=function(e){e.keyCode===KeyEvent.DOM_VK_ESCAPE&&(e.stopPropagation(),e.preventDefault(),this.close(void 0,void 0,ModalBar.CLOSE_ESCAPE))},ModalBar.prototype._handleFocusChange=function(e){if(!this.isLockedOpen||!this.isLockedOpen()){var effectiveElem=$(e.target).data("attached-to")||e.target;$.contains(this._$root.get(0),effectiveElem)||this.close(void 0,void 0,ModalBar.CLOSE_BLUR)}},ModalBar.prototype.getRoot=function(){return this._$root},exports.ModalBar=ModalBar});
//# sourceMappingURL=ModalBar.js.map
