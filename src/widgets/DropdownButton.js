define(function(require,exports,module){const DropdownEventHandler=require("utils/DropdownEventHandler").DropdownEventHandler,EventDispatcher=require("utils/EventDispatcher"),WorkspaceManager=require("view/WorkspaceManager"),Menus=require("command/Menus"),ViewUtils=require("utils/ViewUtils"),_=require("thirdparty/lodash"),EVENT_SELECTED="select",EVENT_LIST_RENDERED="listRendered",EVENT_DROPDOWN_SHOWN="shown",EVENT_DROPDOWN_CLOSED="closed";function DropdownButton(label,items,itemRenderer,options){this.items=items,options=options||{},this.enableFilter="boolean"!=typeof options.enableFilter||options.enableFilter,this.customFilter=options.customFilter,this.itemRenderer=itemRenderer||this.itemRenderer,this._onClick=this._onClick.bind(this),this.closeDropdown=this.closeDropdown.bind(this),this._onClickOutside=this._onClickOutside.bind(this),this.$button=$("<button class='btn btn-dropdown'/>").text(label).on("click",this._onClick)}EventDispatcher.makeEventDispatcher(DropdownButton.prototype),DropdownButton.prototype.items=null,DropdownButton.prototype.itemsSearchFilterText=null,DropdownButton.prototype.$button=null,DropdownButton.prototype.$dropdown=null,DropdownButton.prototype.dropdownExtraClasses=null,DropdownButton.prototype._lastFocus=null,DropdownButton.prototype._dropdownEventHandler=null,DropdownButton.prototype._onClick=function(event){this.$button.hasClass("disabled")||this.toggleDropdown(),event.stopPropagation()},DropdownButton.prototype.setButtonLabel=function(label){this.$button&&$(this.$button).text(label)},DropdownButton.prototype.itemRenderer=function(item,index){return _.escape(String(item))},DropdownButton.prototype._renderList=function(parent){if(!parent)return null;const self=this;this.itemsSearchFilterText=[];let html="";return this.searchStr="",self.enableFilter&&(html='<li class="sticky-li-top forced-hidden"><a class=\'stylesheet-link\'><i class="fa fa-search" aria-hidden="true"></i>&nbsp;&nbsp;<span class="searchTextSpan"></span></a></li>'),this.items.forEach(function(item,i){if(self.itemsSearchFilterText[i]="","---"===item)html+="<li class='divider'></li>";else{let rendered=self.itemRenderer(item,i),itemHtml=rendered.html||rendered||"",disabledClass;itemHtml=`<li data-index='${i}'><a class='stylesheet-link ${rendered.html&&!rendered.enabled?"disabled":""}' data-index='${i}'>${itemHtml}</a></li>`,self.itemsSearchFilterText[i]=$(itemHtml).text(),html+=itemHtml}}.bind(this)),parent.append(html),this.trigger("listRendered",parent),this._dropdownEventHandler&&this._dropdownEventHandler.reRegisterMouseHandlers(parent),parent},DropdownButton.prototype.refresh=function(){this.$dropdown&&($("li",this.$dropdown).remove(),this._renderList(this.$dropdown))},DropdownButton.prototype.setChecked=function(index,checked){if(this.$dropdown){var listItems=$("li",this.$dropdown),count=listItems.length;index>-1&&index<count&&$("a",listItems[index]).toggleClass("checked",checked)}},DropdownButton.prototype.showDropdown=function(){if(this.items.length&&!this.$dropdown){Menus.closeAll(),this.searchStr="";var $dropdown=$("<ul class='dropdown-menu dropdownbutton-popup' tabindex='-1'>").addClass(this.dropdownExtraClasses).css("min-width",this.$button.outerWidth());this.$dropdown=$dropdown,this._renderList(this.$dropdown).appendTo($("body")).data("attached-to",this.$button[0]);var toggleOffset=this.$button.offset(),posLeft=toggleOffset.left,posTop=toggleOffset.top+this.$button.outerHeight(),elementRect={top:posTop,left:posLeft,height:$dropdown.height(),width:$dropdown.width()},clip=ViewUtils.getElementClipSize($(window),elementRect);clip.bottom>0&&(posTop=Math.max(0,toggleOffset.top-$dropdown.height()-4));var dropdownElement=this.$dropdown[0],scrollWidth=dropdownElement.offsetWidth-dropdownElement.clientWidth+1;clip.right>0&&(posLeft=Math.max(0,posLeft-clip.right-scrollWidth)),$dropdown.css({left:posLeft,top:posTop,width:$dropdown.width()+scrollWidth}),this._dropdownEventHandler=new DropdownEventHandler($dropdown,this._onSelect.bind(this),this._onDropdownClose.bind(this),this._onKeyDown.bind(this)),this._dropdownEventHandler.open(),window.document.body.addEventListener("mousedown",this._onClickOutside,!0),WorkspaceManager.on("workspaceUpdateLayout",this.closeDropdown),this._lastFocus=window.document.activeElement,$dropdown.focus(),this.trigger("shown")}},DropdownButton.prototype._onDropdownClose=function(){window.document.body.removeEventListener("mousedown",this._onClickOutside,!0),WorkspaceManager.off("workspaceUpdateLayout",this.closeDropdown),window.document.activeElement===this.$dropdown[0]&&this._lastFocus.focus(),this._dropdownEventHandler=null,this.$dropdown=null,this.trigger("closed")},DropdownButton.prototype.filterDropdown=function(searchString){this.searchStr=searchString;const $stickyLi=this.$dropdown.find("li.sticky-li-top");for(let i=0;i<this.itemsSearchFilterText.length;i++){const itemText=this.itemsSearchFilterText[i],$liElementAtIndex=this.$dropdown.find(`li[data-index='${i}']`);let shouldShow=itemText&&itemText.toLowerCase().includes(searchString.toLowerCase());this.customFilter&&(shouldShow=this.customFilter(searchString,itemText,i)),shouldShow?$liElementAtIndex.removeClass("forced-hidden"):$liElementAtIndex.addClass("forced-hidden")}searchString?($stickyLi.removeClass("forced-hidden"),$stickyLi.find(".searchTextSpan").text(searchString)):$stickyLi.addClass("forced-hidden")},DropdownButton.prototype._onKeyDown=function(event){if(!this.enableFilter)return!1;const self=this;if((event.ctrlKey||event.metaKey)&&"v"===event.key)return Phoenix.app.clipboardReadText().then(text=>{self.searchStr+=text,self.filterDropdown(this.searchStr)}),event.stopImmediatePropagation(),event.preventDefault(),!0;if(1===event.key.length)this.searchStr+=event.key;else{if("Backspace"!==event.key)return!1;this.searchStr=this.searchStr.slice(0,-1)}return this.filterDropdown(this.searchStr),event.stopImmediatePropagation(),event.preventDefault(),!0},DropdownButton.prototype.closeDropdown=function(){this._dropdownEventHandler&&this._dropdownEventHandler.close()},DropdownButton.prototype._onClickOutside=function(event){var $container=$(event.target).closest(".dropdownbutton-popup");$(event.target).is(this.$button)||0!==$container.length&&$container[0]===this.$dropdown[0]||(this.closeDropdown(),event.stopPropagation(),event.preventDefault())},DropdownButton.prototype.toggleDropdown=function(){this.$dropdown?this.closeDropdown():this.showDropdown()},DropdownButton.prototype._onSelect=function($link){var itemIndex=Number($link.data("index"));this.trigger("select",this.items[itemIndex],itemIndex)},exports.DropdownButton=DropdownButton,exports.EVENT_SELECTED="select",exports.EVENT_LIST_RENDERED="listRendered",exports.EVENT_DROPDOWN_SHOWN="shown",exports.EVENT_DROPDOWN_CLOSED="closed"});
//# sourceMappingURL=DropdownButton.js.map
