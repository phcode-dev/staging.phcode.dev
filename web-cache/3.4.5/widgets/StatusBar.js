define(function(require,exports,module){var AppInit=require("utils/AppInit"),Strings=require("strings"),TaskManager=require("features/TaskManager"),WorkspaceManager=require("view/WorkspaceManager"),_init=!1,_busyCursor=!1,_indicatorIDRegexp=new RegExp("[^a-zA-Z 0-9]+","g"),$statusInfo,$statusBar,$indicators,$statusTasks;function showBusyIndicator(updateCursor){console.warn("StatusBar.showBusyIndicator API is deprecated. Please use new module `(features/TaskManager).addNewTask` instead"),_init?(updateCursor&&(_busyCursor=!0,$("*").addClass("busyCursor")),TaskManager._setLegacyExtensionBusy(!0)):console.error("StatusBar API invoked before status bar created")}function hideBusyIndicator(){console.warn("StatusBar.hideBusyIndicator API is deprecated. Please use new module `(features/TaskManager).addNewTask` instead"),_init?(_busyCursor&&(_busyCursor=!1,$("*").removeClass("busyCursor")),TaskManager._setLegacyExtensionBusy(!1)):console.error("StatusBar API invoked before status bar created")}function addIndicator(id,indicator,visible,style,tooltip,insertBefore){if(_init){indicator=indicator||window.document.createElement("div"),tooltip=tooltip||"",style=style||"",id=id.replace(_indicatorIDRegexp,"-")||"";var $indicator=$(indicator);$indicator.attr("id",id),$indicator.attr("title",tooltip),$indicator.addClass("indicator"),$indicator.addClass(style),visible||$indicator.hide(),insertBefore&&$("#"+insertBefore).length>0?$indicator.insertAfter("#"+insertBefore):$indicator.insertBefore($statusTasks)}else console.error("StatusBar API invoked before status bar created")}function updateIndicator(id,visible,style,tooltip){if(_init||!brackets.test){var $indicator=$("#"+id.replace(_indicatorIDRegexp,"-"));$indicator&&(visible?$indicator.show():$indicator.hide(),style?($indicator.removeClass(),$indicator.addClass(style)):($indicator.removeClass(),$indicator.addClass("indicator")),tooltip&&$indicator.attr("title",tooltip))}else console.error("StatusBar API invoked before status bar created")}function hideInformation(){$statusInfo.css("display","none")}function showInformation(){$statusInfo.css("display","")}function hideIndicators(){$indicators.addClass("hide-status-indicators")}function showIndicators(){$indicators.removeClass("hide-status-indicators")}function hideAllPanes(){hideInformation(),hideIndicators()}function showAllPanes(){showInformation(),showIndicators()}function hide(){_init?$statusBar.is(":visible")&&($statusBar.hide(),WorkspaceManager.recomputeLayout()):console.error("StatusBar API invoked before status bar created")}function show(){_init?$statusBar.is(":visible")||($statusBar.show(),WorkspaceManager.recomputeLayout()):console.error("StatusBar API invoked before status bar created")}AppInit.htmlReady(function(){$("#status-overwrite").text(Strings.STATUSBAR_INSERT),$statusBar=$("#status-bar"),$indicators=$("#status-indicators"),$statusTasks=$("#status-tasks"),$statusInfo=$("#status-info"),_init=!0,hide()}),exports.hideInformation=hideInformation,exports.showInformation=showInformation,exports.showBusyIndicator=showBusyIndicator,exports.hideBusyIndicator=hideBusyIndicator,exports.hideIndicators=hideIndicators,exports.showIndicators=showIndicators,exports.hideAllPanes=hideAllPanes,exports.showAllPanes=showAllPanes,exports.addIndicator=addIndicator,exports.updateIndicator=updateIndicator,exports.hide=hide,exports.show=show});
//# sourceMappingURL=StatusBar.js.map
