define(function(require,exports,module){const AppInit=brackets.getModule("utils/AppInit"),JumpToDefManager=brackets.getModule("features/JumpToDefManager"),CommandManager=brackets.getModule("command/CommandManager"),Commands=brackets.getModule("command/Commands"),FileViewController=brackets.getModule("project/FileViewController");function HTMLJumpToDefProvider(){}function _isSrcOrHrefString(editor,token){if("string"!==token.type)return!1;const equalsToken=editor.getPreviousToken({line:token.line,ch:token.start+1}),hrefOrSrcToken=editor.getPreviousToken({line:equalsToken.line,ch:equalsToken.start+1});return"="===equalsToken.string&&["href","src"].includes(hrefOrSrcToken.string)}const jumpTokenTypes=["tag","string"];function _openFile(fileRelativePath,mainDocPath){if(fileRelativePath.startsWith("http://")||fileRelativePath.startsWith("https://")||fileRelativePath.startsWith("phtauri://")||fileRelativePath.startsWith("asset://"))return FileViewController.openAndSelectDocument(fileRelativePath,FileViewController.PROJECT_MANAGER);const targetPath=path.resolve(mainDocPath,fileRelativePath);return FileViewController.openAndSelectDocument(targetPath,FileViewController.PROJECT_MANAGER)}HTMLJumpToDefProvider.prototype.canJumpToDef=function(editor,optionalPosition){let pos=optionalPosition||editor.getCursorPos(),token=editor.getToken(pos);return!!(token&&token.type&&jumpTokenTypes.includes(token.type))},HTMLJumpToDefProvider.prototype.doJumpToDef=function(editor){if(!this.canJumpToDef(editor))return(new $.Deferred).reject().promise();const token=editor.getToken();return _isSrcOrHrefString(editor,token)?_openFile(token.string.replace(/['"]+/g,""),editor.document.file.parentPath):CommandManager.execute(Commands.TOGGLE_QUICK_EDIT)},AppInit.appReady(function(){var jdProvider=new HTMLJumpToDefProvider;JumpToDefManager.registerJumpToDefProvider(jdProvider,["html"],0)})});
//# sourceMappingURL=HTMLJumpToDef.js.map
