define(function(require,exports,module){require("utils/Global");var AppInit=require("utils/AppInit"),Commands=require("command/Commands"),CommandManager=require("command/CommandManager"),DefaultDialogs=require("widgets/DefaultDialogs"),EventDispatcher=require("utils/EventDispatcher"),FileSystem=require("filesystem/FileSystem"),FileSystemError=require("filesystem/FileSystemError"),FileUtils=require("file/FileUtils"),KeyEvent=require("utils/KeyEvent"),Strings=require("strings"),StringUtils=require("utils/StringUtils"),UrlParams=require("utils/UrlParams").UrlParams,_=require("thirdparty/lodash"),KeyboardPrefs=JSON.parse(require("text!base-config/keyboard.json")),KEYMAP_FILENAME="keymap.json",_userKeyMapFilePath=path.normalize(brackets.app.getApplicationSupportDirectory()+"/"+KEYMAP_FILENAME),_keyMap={},_defaultKeyMap={},_customKeyMap={},_customKeyMapCache={},_commandMap={},_allCommands=[],_displayKeyMap={up:"↑",down:"↓",left:"←",right:"→","-":"−"},_specialCommands=[Commands.EDIT_UNDO,Commands.EDIT_REDO,Commands.EDIT_SELECT_ALL,Commands.EDIT_CUT,Commands.EDIT_COPY,Commands.EDIT_PASTE],_reservedShortcuts=["Ctrl-Z","Ctrl-Y","Ctrl-A","Ctrl-X","Ctrl-C","Ctrl-V"],_macReservedShortcuts=["Cmd-,","Cmd-H","Cmd-Alt-H","Cmd-M","Cmd-Shift-Z","Cmd-Q"],_keyNames=["Up","Down","Left","Right","Backspace","Enter","Space","Tab","PageUp","PageDown","Home","End","Insert","Delete"],_showErrors=!0,_enabled=!0,_globalKeydownHooks=[],_loadUserKeyMap,CtrlDownStates={NOT_YET_DETECTED:0,DETECTED:1,DETECTED_AND_IGNORED:2},_ctrlDown=CtrlDownStates.NOT_YET_DETECTED,_altGrDown=!1,_lastTimeStamp,_lastKeyIdentifier,MAX_INTERVAL_FOR_CTRL_ALT_KEYS=30,_onCtrlUp;function _quitAltGrMode(){_enabled=!0,_ctrlDown=CtrlDownStates.NOT_YET_DETECTED,_altGrDown=!1,_lastTimeStamp=null,_lastKeyIdentifier=null,$(window).off("keyup",_onCtrlUp)}function _detectAltGrKeyDown(e){"win"===brackets.platform&&(_altGrDown?"Control"!==e.key&&"Alt"!==e.key||(e.altKey&&e.ctrlKey&&e.key===_lastKeyIdentifier?_quitAltGrMode():_lastKeyIdentifier=e.key):(_ctrlDown!==CtrlDownStates.DETECTED_AND_IGNORED&&e.ctrlKey&&"Control"===e.key?_ctrlDown=CtrlDownStates.DETECTED:e.repeat&&e.ctrlKey&&"Control"===e.key?_ctrlDown=CtrlDownStates.DETECTED_AND_IGNORED:_ctrlDown===CtrlDownStates.DETECTED&&e.altKey&&e.ctrlKey&&"Alt"===e.key&&e.timeStamp-_lastTimeStamp<MAX_INTERVAL_FOR_CTRL_ALT_KEYS?(_altGrDown=!0,_lastKeyIdentifier="Alt",_enabled=!1,$(window).on("keyup",_onCtrlUp)):_ctrlDown=CtrlDownStates.NOT_YET_DETECTED,_lastTimeStamp=e.timeStamp))}function _reset(){_keyMap={},_defaultKeyMap={},_customKeyMap={},_customKeyMapCache={},_commandMap={},_globalKeydownHooks=[],_userKeyMapFilePath=path.normalize(brackets.app.getApplicationSupportDirectory()+"/"+KEYMAP_FILENAME)}function _buildKeyDescriptor(hasMacCtrl,hasCtrl,hasAlt,hasShift,key){if(!key)return console.log("KeyBindingManager _buildKeyDescriptor() - No key provided!"),"";var keyDescriptor=[];return hasMacCtrl&&keyDescriptor.push("Ctrl"),hasAlt&&keyDescriptor.push("Alt"),hasShift&&keyDescriptor.push("Shift"),hasCtrl&&("mac"===brackets.platform?keyDescriptor.push("Cmd"):keyDescriptor.unshift("Ctrl")),keyDescriptor.push(key),keyDescriptor.join("-")}function normalizeKeyDescriptorString(origDescriptor){var hasMacCtrl=!1,hasCtrl=!1,hasAlt=!1,hasShift=!1,key="",error=!1;function _compareModifierString(left,right){return!(!left||!right)&&(left=left.trim().toLowerCase(),right=right.trim().toLowerCase(),left.length>0&&left===right)}return origDescriptor.split("-").forEach(function parseDescriptor(ele,i,arr){_compareModifierString("ctrl",ele)?"mac"===brackets.platform?hasMacCtrl=!0:hasCtrl=!0:_compareModifierString("cmd",ele)?"mac"===brackets.platform?hasCtrl=!0:error=!0:_compareModifierString("alt",ele)?hasAlt=!0:_compareModifierString("opt",ele)?"mac"===brackets.platform?hasAlt=!0:error=!0:_compareModifierString("shift",ele)?hasShift=!0:key.length>0?(console.log("KeyBindingManager normalizeKeyDescriptorString() - Multiple keys defined. Using key: "+key+" from: "+origDescriptor),error=!0):key=ele}),error?null:(""===key&&-1!==origDescriptor.search(/^.+--$/)&&(key="-"),""===key&&"shift-shift"===origDescriptor.toLowerCase()&&(key="Shift"),key.indexOf("+")>=0&&key.length>1?null:(/^[a-z]/i.test(key)&&(key=_.capitalize(key.toLowerCase())),/^Page/.test(key)&&(key=key.replace(/(up|down)$/,function(match,p1){return _.capitalize(p1)})),key.length>1&&!/F\d+/.test(key)&&-1===_keyNames.indexOf(key)?null:_buildKeyDescriptor(hasMacCtrl,hasCtrl,hasAlt,hasShift,key)))}function _mapKeycodeToKey(keycode,key){if(keycode>=KeyEvent.DOM_VK_0&&keycode<=KeyEvent.DOM_VK_9)return String(keycode-KeyEvent.DOM_VK_0);if(keycode>=KeyEvent.DOM_VK_NUMPAD0&&keycode<=KeyEvent.DOM_VK_NUMPAD9)return String(keycode-KeyEvent.DOM_VK_NUMPAD0);switch(keycode){case KeyEvent.DOM_VK_SEMICOLON:return";";case KeyEvent.DOM_VK_EQUALS:return"=";case KeyEvent.DOM_VK_COMMA:return",";case KeyEvent.DOM_VK_SUBTRACT:case KeyEvent.DOM_VK_DASH:return"-";case KeyEvent.DOM_VK_ADD:return"+";case KeyEvent.DOM_VK_DECIMAL:case KeyEvent.DOM_VK_PERIOD:return".";case KeyEvent.DOM_VK_DIVIDE:case KeyEvent.DOM_VK_SLASH:return"/";case KeyEvent.DOM_VK_BACK_QUOTE:return"`";case KeyEvent.DOM_VK_OPEN_BRACKET:return"[";case KeyEvent.DOM_VK_BACK_SLASH:return"\\";case KeyEvent.DOM_VK_CLOSE_BRACKET:return"]";case KeyEvent.DOM_VK_QUOTE:return"'";default:return key}}function _translateKeyboardEvent(event){var hasMacCtrl="mac"===brackets.platform&&event.ctrlKey,hasCtrl="mac"!==brackets.platform?event.ctrlKey:event.metaKey,hasAlt=event.altKey,hasShift=event.shiftKey,key=String.fromCharCode(event.keyCode),ident=event.key;return ident&&(key="U"===ident.charAt(0)&&"+"===ident.charAt(1)?String.fromCharCode(parseInt(ident.substring(2),16)):ident),normalizeKeyDescriptorString(_buildKeyDescriptor(hasMacCtrl,hasCtrl,hasAlt,hasShift,key="\t"===key?"Tab":" "===key?"Space":"\b"===key?"Backspace":"Help"===key?"Insert":event.keyCode===KeyEvent.DOM_VK_DELETE?"Delete":"ArrowUp"===key?"Up":"ArrowDown"===key?"Down":"ArrowLeft"===key?"Left":"ArrowRight"===key?"Right":_mapKeycodeToKey(event.keyCode,key)))}function formatKeyDescriptor(descriptor){var displayStr;return displayStr=(displayStr=(displayStr=(displayStr=(displayStr=(displayStr=(displayStr=(displayStr="mac"===brackets.platform?(displayStr=(displayStr=(displayStr=(displayStr=descriptor.replace(/-(?!$)/g,"")).replace("Ctrl","⌃")).replace("Cmd","⌘")).replace("Shift","⇧")).replace("Alt","⌥"):(displayStr=(displayStr=descriptor.replace("Ctrl",Strings.KEYBOARD_CTRL)).replace("Shift",Strings.KEYBOARD_SHIFT)).replace(/-(?!$)/g,"+")).replace("Space",Strings.KEYBOARD_SPACE)).replace("PageUp",Strings.KEYBOARD_PAGE_UP)).replace("PageDown",Strings.KEYBOARD_PAGE_DOWN)).replace("Home",Strings.KEYBOARD_HOME)).replace("End",Strings.KEYBOARD_END)).replace("Ins",Strings.KEYBOARD_INSERT)).replace("Del",Strings.KEYBOARD_DELETE)}function _isKeyAssigned(key){return void 0!==_keyMap[key]}function removeBinding(key,platform){if(key&&(null==platform||platform===brackets.platform)){var normalizedKey=normalizeKeyDescriptorString(key);if(normalizedKey){if(_isKeyAssigned(normalizedKey)){var binding=_keyMap[normalizedKey],command=CommandManager.get(binding.commandID),bindings=_commandMap[binding.commandID];delete _keyMap[normalizedKey],bindings&&(_commandMap[binding.commandID]=bindings.filter(function(b){return b.key!==normalizedKey}),command&&command.trigger("keyBindingRemoved",{key:normalizedKey,displayKey:binding.displayKey}))}}else console.log("Failed to normalize "+key)}}function _updateCommandAndKeyMaps(newBinding){0!==_allCommands.length&&newBinding&&newBinding.commandID&&-1===_allCommands.indexOf(newBinding.commandID)&&(_defaultKeyMap[newBinding.commandID]=_.cloneDeep(newBinding),_loadUserKeyMap())}function _addBinding(commandID,keyBinding,platform,userBindings){var key,result=null,normalized,normalizedDisplay,explicitPlatform=keyBinding.platform||platform,targetPlatform,command,bindingsToDelete=[],existing,existingBindings,isWindowsCompatible,isReplaceGeneric,ignoreGeneric;if(targetPlatform=explicitPlatform&&"all"!==explicitPlatform?explicitPlatform:brackets.platform,"mac"===explicitPlatform&&"mac"!==brackets.platform)return null;if(key=keyBinding.key||keyBinding,"mac"!==brackets.platform||void 0!==explicitPlatform&&"all"!==explicitPlatform||(key=key.replace("Ctrl","Cmd"),void 0!==keyBinding.displayKey&&(keyBinding.displayKey=keyBinding.displayKey.replace("Ctrl","Cmd"))),!(normalized=normalizeKeyDescriptorString(key)))return console.error("Unable to parse key binding "+key+". Permitted modifiers: Ctrl, Cmd, Alt, Opt, Shift; separated by '-' (not '+')."),null;if(existing=_keyMap[normalized],exports.useWindowsCompatibleBindings&&"win"===explicitPlatform){if(existing&&(!existing.explicitPlatform||existing.explicitPlatform===brackets.platform||"all"===existing.explicitPlatform))return null;targetPlatform=brackets.platform}return targetPlatform!==brackets.platform?null:(existing&&!existing.explicitPlatform&&explicitPlatform&&(removeBinding(normalized),existing=!1),(_commandMap[commandID]||[]).forEach(function(binding){isWindowsCompatible=exports.useWindowsCompatibleBindings&&"win"===binding.explicitPlatform,isReplaceGeneric=!binding.explicitPlatform&&explicitPlatform,isWindowsCompatible||isReplaceGeneric?bindingsToDelete.push(binding):ignoreGeneric=binding.explicitPlatform&&!explicitPlatform}),ignoreGeneric?null:existing?(console.error("Cannot assign "+normalized+" to "+commandID+". It is already assigned to "+_keyMap[normalized].commandID),null):(bindingsToDelete.forEach(function(binding){removeBinding(binding.key)}),normalizedDisplay=keyBinding.displayKey?normalizeKeyDescriptorString(keyBinding.displayKey):normalized,_commandMap[commandID]||(_commandMap[commandID]=[]),result={key:normalized,displayKey:normalizedDisplay,explicitPlatform:explicitPlatform},_commandMap[commandID].push(result),_keyMap[normalized]={commandID:commandID,key:normalized,displayKey:normalizedDisplay,explicitPlatform:explicitPlatform},userBindings||_updateCommandAndKeyMaps(_keyMap[normalized]),(command=CommandManager.get(commandID))&&command.trigger("keyBindingAdded",result),result))}function getKeymap(defaults){return $.extend({},defaults?_defaultKeyMap:_keyMap)}_onCtrlUp=function(e){var key=e.keyCode||e.which;_altGrDown&&key===KeyEvent.DOM_VK_CONTROL&&_quitAltGrMode()};let UN_SWALLOWED_EVENTS=[Commands.EDIT_UNDO,Commands.EDIT_REDO,Commands.EDIT_CUT,Commands.EDIT_COPY,Commands.EDIT_PASTE];function _handleKey(key){if(_enabled&&_keyMap[key]){let promise=CommandManager.execute(_keyMap[key].commandID);return!UN_SWALLOWED_EVENTS.includes(_keyMap[key].commandID)||"rejected"!==promise.state()}return!1}function _sortByPlatform(a,b){var a1=a.platform?1:0,b1;return(b.platform?1:0)-a1}function addBinding(command,keyBindings,platform){var commandID="",results;if(command){if(keyBindings){var keyBinding;if(commandID="string"==typeof command?command:command.getID(),Array.isArray(keyBindings))results=[],keyBindings.sort(_sortByPlatform),keyBindings.forEach(function addSingleBinding(keyBindingRequest){(keyBinding=_addBinding(commandID,keyBindingRequest,keyBindingRequest.platform))&&results.push(keyBinding)});else results=_addBinding(commandID,keyBindings,platform);return results}}else console.error("addBinding(): missing required parameter: command")}function getKeyBindings(command){var bindings=[],commandID="";return command?(commandID="string"==typeof command?command:command.getID(),(bindings=_commandMap[commandID])||[]):(console.error("getKeyBindings(): missing required parameter: command"),[])}function _handleCommandRegistered(event,command){var commandId=command.getID(),defaults=KeyboardPrefs[commandId];defaults&&addBinding(commandId,defaults)}function addGlobalKeydownHook(hook){_globalKeydownHooks.push(hook)}function removeGlobalKeydownHook(hook){var index=_globalKeydownHooks.indexOf(hook);-1!==index&&_globalKeydownHooks.splice(index,1)}function _handleKeyEvent(event){var i,handled=!1;for(i=_globalKeydownHooks.length-1;i>=0;i--)if(_globalKeydownHooks[i](event)){handled=!0;break}_detectAltGrKeyDown(event),!handled&&_handleKey(_translateKeyboardEvent(event))&&(event.stopPropagation(),event.preventDefault())}function _showErrorsAndOpenKeyMap(err,message){require(["widgets/Dialogs"],function(Dialogs){var errorMessage=Strings.ERROR_KEYMAP_CORRUPT;err===FileSystemError.UNSUPPORTED_ENCODING?errorMessage=Strings.ERROR_LOADING_KEYMAP:message&&(errorMessage=message),Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,Strings.ERROR_KEYMAP_TITLE,errorMessage).done(function(){err!==FileSystemError.UNSUPPORTED_ENCODING&&CommandManager.execute(Commands.FILE_OPEN_KEYMAP)})})}function _isSpecialCommand(commandID){return"mac"===brackets.platform&&"file.quit"===commandID||_specialCommands.indexOf(commandID)>-1}function _isReservedShortcuts(normalizedKey){return!!normalizedKey&&(_reservedShortcuts.indexOf(normalizedKey)>-1||_reservedShortcuts.indexOf(normalizedKey.replace("Cmd","Ctrl"))>-1||"mac"===brackets.platform&&_macReservedShortcuts.indexOf(normalizedKey)>-1)}function _getBulletList(list){var message="<ul class='dialog-list'>";return list.forEach(function(info){message+="<li>"+info+"</li>"}),message+="</ul>"}function _getDisplayKey(key){var displayKey="",match=key?key.match(/(Up|Down|Left|Right|\-)$/i):null;return match&&!/Page(Up|Down)/.test(key)&&(displayKey=key.substr(0,match.index)+_displayKeyMap[match[0].toLowerCase()]),displayKey}function _applyUserKeyBindings(){var remappedCommands=[],remappedKeys=[],restrictedCommands=[],restrictedKeys=[],invalidKeys=[],invalidCommands=[],multipleKeys=[],duplicateBindings=[],errorMessage="";_.forEach(_customKeyMap,function(commandID,key){var normalizedKey=normalizeKeyDescriptorString(key),existingBindings=_commandMap[commandID]||[];if(_isSpecialCommand(commandID))restrictedCommands.push(commandID);else if(_isReservedShortcuts(normalizedKey))restrictedKeys.push(key);else if(normalizedKey){if(_isKeyAssigned(normalizedKey)){if(-1!==remappedKeys.indexOf(normalizedKey))return void duplicateBindings.push(key);if(_keyMap[normalizedKey].commandID===commandID)return void remappedCommands.push(commandID);removeBinding(normalizedKey)}if(-1===remappedKeys.indexOf(normalizedKey)&&remappedKeys.push(normalizedKey),existingBindings.length&&existingBindings.forEach(function(binding){removeBinding(binding.key)}),commandID)if(-1!==_allCommands.indexOf(commandID))if(-1===remappedCommands.indexOf(commandID)){var keybinding={key:normalizedKey};keybinding.displayKey=_getDisplayKey(normalizedKey),_addBinding(commandID,keybinding.displayKey?keybinding:normalizedKey,brackets.platform,!0),remappedCommands.push(commandID)}else multipleKeys.push(commandID);else invalidCommands.push(commandID)}else invalidKeys.push(key)}),restrictedCommands.length&&(errorMessage=StringUtils.format(Strings.ERROR_RESTRICTED_COMMANDS,_getBulletList(restrictedCommands))),restrictedKeys.length&&(errorMessage+=StringUtils.format(Strings.ERROR_RESTRICTED_SHORTCUTS,_getBulletList(restrictedKeys))),multipleKeys.length&&(errorMessage+=StringUtils.format(Strings.ERROR_MULTIPLE_SHORTCUTS,_getBulletList(multipleKeys))),duplicateBindings.length&&(errorMessage+=StringUtils.format(Strings.ERROR_DUPLICATE_SHORTCUTS,_getBulletList(duplicateBindings))),invalidKeys.length&&(errorMessage+=StringUtils.format(Strings.ERROR_INVALID_SHORTCUTS,_getBulletList(invalidKeys))),invalidCommands.length&&(errorMessage+=StringUtils.format(Strings.ERROR_NONEXISTENT_COMMANDS,_getBulletList(invalidCommands))),_showErrors&&errorMessage&&_showErrorsAndOpenKeyMap("",errorMessage)}function _undoPriorUserKeyBindings(){_.forEach(_customKeyMapCache,function(commandID,key){var normalizedKey=normalizeKeyDescriptorString(key),defaults=_.find(_.toArray(_defaultKeyMap),{commandID:commandID}),defaultCommand=_defaultKeyMap[normalizedKey];_isSpecialCommand(commandID)||_isReservedShortcuts(normalizedKey)||(_isKeyAssigned(normalizedKey)&&_customKeyMap[key]!==commandID&&_customKeyMap[normalizedKey]!==commandID&&removeBinding(normalizedKey),defaults&&addBinding(commandID,defaults,brackets.platform),defaultCommand&&defaultCommand.key&&addBinding(defaultCommand.commandID,defaultCommand.key,brackets.platform))})}function _getUserKeyMapFilePath(){return window.isBracketsTestWindow?path.normalize(brackets.app.getApplicationSupportDirectory()+"/_test_/"+KEYMAP_FILENAME):_userKeyMapFilePath}function _readUserKeyMap(){var file=FileSystem.getFileForPath(_getUserKeyMapFilePath()),result=new $.Deferred;return file.exists(function(err,doesExist){doesExist?FileUtils.readAsText(file).done(function(text){var keyMap={};try{if(text){var json=JSON.parse(text);result.resolve(json&&json.overrides||keyMap)}else result.resolve(keyMap)}catch(err){result.reject(err)}}).fail(function(err){result.reject(err)}):result.resolve()}),result.promise()}function _openUserKeyMap(){var userKeyMapPath=_getUserKeyMapFilePath(),file=FileSystem.getFileForPath(userKeyMapPath);file.exists(function(err,doesExist){if(doesExist)CommandManager.execute(Commands.FILE_OPEN,{fullPath:userKeyMapPath});else{var defaultContent='{\n    "documentation": "https://github.com/adobe/brackets/wiki/User-Key-Bindings",\n    "overrides": {\n        \n    }\n}\n';FileUtils.writeText(file,defaultContent,!0).done(function(){CommandManager.execute(Commands.FILE_OPEN,{fullPath:userKeyMapPath})})}})}function _initCommandAndKeyMaps(){_allCommands=CommandManager.getAll(),_defaultKeyMap=_.cloneDeep(_keyMap)}function _setUserKeyMapFilePath(fullPath){_userKeyMapFilePath=fullPath}AppInit.htmlReady(function(){window.document.body.addEventListener("keydown",_handleKeyEvent,!0),exports.useWindowsCompatibleBindings="mac"!==brackets.platform&&"win"!==brackets.platform}),_loadUserKeyMap=_.debounce(function(){_readUserKeyMap().then(function(keyMap){_allCommands=CommandManager.getAll(),_customKeyMapCache=_.cloneDeep(_customKeyMap),_customKeyMap=keyMap,_undoPriorUserKeyBindings(),_applyUserKeyBindings()},function(err){_showErrorsAndOpenKeyMap(err)})},200),EventDispatcher.on_duringInit(CommandManager,"commandRegistered",_handleCommandRegistered),CommandManager.register(Strings.CMD_OPEN_KEYMAP,Commands.FILE_OPEN_KEYMAP,_openUserKeyMap),require(["document/DocumentManager"],function(DocumentManager){DocumentManager.on("documentSaved",function checkKeyMapUpdates(e,doc){doc&&doc.file.fullPath===_userKeyMapFilePath&&_loadUserKeyMap()})}),AppInit.extensionsLoaded(function(){var params=new UrlParams;params.parse(),"true"===params.get("reloadWithoutUserExts")&&(_showErrors=!1),_initCommandAndKeyMaps(),_loadUserKeyMap()}),exports._reset=_reset,exports._setUserKeyMapFilePath=_setUserKeyMapFilePath,exports._getDisplayKey=_getDisplayKey,exports._loadUserKeyMap=_loadUserKeyMap,exports._initCommandAndKeyMaps=_initCommandAndKeyMaps,exports._onCtrlUp=_onCtrlUp,exports.getKeymap=getKeymap,exports.addBinding=addBinding,exports.removeBinding=removeBinding,exports.formatKeyDescriptor=formatKeyDescriptor,exports.getKeyBindings=getKeyBindings,exports.addGlobalKeydownHook=addGlobalKeydownHook,exports.removeGlobalKeydownHook=removeGlobalKeydownHook,exports.useWindowsCompatibleBindings=!1,exports._handleKey=_handleKey,exports._handleKeyEvent=_handleKeyEvent});
//# sourceMappingURL=KeyBindingManager.js.map
