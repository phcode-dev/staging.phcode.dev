define(function(require,exports,module){require("utils/Global");var _=require("thirdparty/lodash");let AppInit=require("utils/AppInit"),Async=require("utils/Async"),PreferencesDialogs=require("preferences/PreferencesDialogs"),PreferencesManager=require("preferences/PreferencesManager"),DocumentManager=require("document/DocumentManager"),MainViewManager=require("view/MainViewManager"),CommandManager=require("command/CommandManager"),Commands=require("command/Commands"),Dialogs=require("widgets/Dialogs"),DefaultDialogs=require("widgets/DefaultDialogs"),EventDispatcher=require("utils/EventDispatcher"),LanguageManager=require("language/LanguageManager"),Menus=require("command/Menus"),StringUtils=require("utils/StringUtils"),Strings=require("strings"),FileSystem=require("filesystem/FileSystem"),FileViewController=require("project/FileViewController"),PerfUtils=require("utils/PerfUtils"),FileUtils=require("file/FileUtils"),FileSystemError=require("filesystem/FileSystemError"),Urls=require("i18n!nls/urls"),FileSyncManager=require("project/FileSyncManager"),ProjectModel=require("project/ProjectModel"),FileTreeView=require("project/FileTreeView"),WorkingSetView=require("project/WorkingSetView"),ViewUtils=require("utils/ViewUtils"),ZipUtils=require("utils/ZipUtils"),Metrics=require("utils/Metrics");require("command/DefaultMenus");const EVENT_PROJECT_BEFORE_CLOSE="beforeProjectClose",EVENT_PROJECT_CLOSE="projectClose",EVENT_PROJECT_OPEN_FAILED="projectFileOpenFailed",EVENT_PROJECT_OPEN="projectOpen",EVENT_PROJECT_REFRESH="projectRefresh",EVENT_CONTENT_CHANGED="contentChanged",EVENT_PROJECT_FILE_CHANGED="projectFileChanged",EVENT_PROJECT_FILE_RENAMED="projectFileRenamed";EventDispatcher.setLeakThresholdForEvent(EVENT_PROJECT_OPEN,25);var SETTINGS_FILENAME="."+PreferencesManager.SETTINGS_FILENAME,SORT_DIRECTORIES_FIRST="sortDirectoriesFirst",_fileSystemChange,_fileSystemRename,_showErrorDialog,_saveTreeState,_renderTreeSync,_renderTree;const ERR_TYPE_CREATE=1,ERR_TYPE_CREATE_EXISTS=2,ERR_TYPE_RENAME=3,ERR_TYPE_DELETE=4,ERR_TYPE_LOADING_PROJECT=5,ERR_TYPE_LOADING_PROJECT_NATIVE=6,ERR_TYPE_MAX_FILES=7,ERR_TYPE_OPEN_DIALOG=8,ERR_TYPE_INVALID_FILENAME=9,ERR_TYPE_MOVE=10,ERR_TYPE_PASTE=11,ERR_TYPE_PASTE_FAILED=12,ERR_TYPE_DUPLICATE_FAILED=13,ERR_TYPE_DOWNLOAD_FAILED=14;var $projectTreeContainer,fileTreeViewContainer;function _hasFileSelectionFocus(){return FileViewController.getFileSelectionFocus()===FileViewController.PROJECT_MANAGER}var model=new ProjectModel.ProjectModel({focused:_hasFileSelectionFocus()}),_projectWarnedForTooManyFiles=!1;function _displayCreationError(e,errorInfo){window.setTimeout(function(){var error=errorInfo.type,isFolder=errorInfo.isFolder,name=errorInfo.name;if(error===FileSystemError.ALREADY_EXISTS)_showErrorDialog(ERR_TYPE_CREATE_EXISTS,isFolder,null,name);else if(error===ProjectModel.ERROR_INVALID_FILENAME)_showErrorDialog(ERR_TYPE_INVALID_FILENAME,isFolder,ProjectModel._invalidChars);else{var errString=error===FileSystemError.NOT_WRITABLE?Strings.NO_MODIFICATION_ALLOWED_ERR:StringUtils.format(Strings.GENERIC_ERROR,error);_showErrorDialog(ERR_TYPE_CREATE,isFolder,errString,name).getPromise()}},10)}function _revertSelection(previousPath,switchToWorkingSet){model.setSelected(previousPath),switchToWorkingSet&&FileViewController.setFileViewFocus(FileViewController.WORKING_SET_VIEW)}function ActionCreator(model){this.model=model,this._bindEvents()}ActionCreator.prototype._bindEvents=function(){this.model.on(ProjectModel.EVENT_CHANGE,function(){_renderTree()}),this.model.on(ProjectModel.EVENT_SHOULD_SELECT,function(e,data){data.add?FileViewController.openFileAndAddToWorkingSet(data.path).fail(_.partial(_revertSelection,data.previousPath,!data.hadFocus)):FileViewController.openAndSelectDocument(data.path,FileViewController.PROJECT_MANAGER).fail(_.partial(_revertSelection,data.previousPath,!data.hadFocus))}),this.model.on(ProjectModel.EVENT_SHOULD_FOCUS,function(){FileViewController.setFileViewFocus(FileViewController.PROJECT_MANAGER)}),this.model.on(ProjectModel.ERROR_CREATION,_displayCreationError)},ActionCreator.prototype.setDirectoryOpen=function(path,open){this.model.setDirectoryOpen(path,open).then(_saveTreeState)},ActionCreator.prototype.setSelected=function(path,doNotOpen){this.model.setSelected(path,doNotOpen)},ActionCreator.prototype.selectInWorkingSet=function(path){this.model.selectInWorkingSet(path)},ActionCreator.prototype.openWithExternalApplication=function(path){FileViewController.openWithExternalApplication(path)},ActionCreator.prototype.setContext=function(path){this.model.setContext(path)},ActionCreator.prototype.restoreContext=function(){this.model.restoreContext()},ActionCreator.prototype.startRename=function(path,isMoved){renameItemInline(path,isMoved)},ActionCreator.prototype.setRenameValue=function(path){this.model.setRenameValue(path)},ActionCreator.prototype.cancelRename=function(){this.model.cancelRename()},ActionCreator.prototype.performRename=function(){return this.model.performRename()},ActionCreator.prototype.startCreating=function(basedir,newName,isFolder){return this.model.startCreating(basedir,newName,isFolder)},ActionCreator.prototype.setSortDirectoriesFirst=function(sortDirectoriesFirst){this.model.setSortDirectoriesFirst(sortDirectoriesFirst)},ActionCreator.prototype.setFocused=function(focused){this.model.setFocused(focused)},ActionCreator.prototype.setCurrentFile=function(curFile){this.model.setCurrentFile(curFile)},ActionCreator.prototype.toggleSubdirectories=function(path,openOrClose){this.model.toggleSubdirectories(path,openOrClose).then(_saveTreeState)},ActionCreator.prototype.closeSubtree=function(path){this.model.closeSubtree(path),_saveTreeState()},ActionCreator.prototype.dragItem=function(path){$(".dropdown.open").length>0&&(Menus.closeAll(),this.setContext(null)),"/"===_.last(path)&&this.setDirectoryOpen(path,!1)},ActionCreator.prototype.moveItem=function(oldPath,newDirectory){var fileName,newPath=newDirectory+FileUtils.getBaseName(oldPath),self=this;oldPath!==newDirectory&&FileUtils.getParentPath(oldPath)!==newDirectory&&("/"===_.last(oldPath)&&(newPath=ProjectModel._ensureTrailingSlash(newPath)),this.startRename(oldPath,!0),this.setRenameValue(newPath),this.performRename(),this.setDirectoryOpen(newDirectory,!0))},ActionCreator.prototype.refresh=function(){this.model.refresh()};var actionCreator=new ActionCreator(model);function getFileTreeContext(){var selectedEntry;return model.getContext()}function getSelectedItem(){var selectedEntry=getFileTreeContext();return selectedEntry||(selectedEntry=model.getSelected()),selectedEntry||(selectedEntry=MainViewManager.getCurrentlyViewedFile()),selectedEntry}function _fileViewControllerChange(){actionCreator.setFocused(_hasFileSelectionFocus()),_renderTree()}function _documentSelectionFocusChange(){var curFullPath=MainViewManager.getCurrentlyViewedPath(MainViewManager.ACTIVE_PANE);curFullPath&&_hasFileSelectionFocus()?actionCreator.setSelected(curFullPath,!0):actionCreator.setSelected(null),_fileViewControllerChange()}function _currentFileChange(e,curFile){actionCreator.setCurrentFile(curFile)}function _getProjectViewStateContext(){return{location:{scope:"user",layer:"project",layerID:model.projectRoot.fullPath}}}function getBaseUrl(){return model.getBaseUrl()}function setBaseUrl(projectBaseUrl){var context=_getProjectViewStateContext();projectBaseUrl=model.setBaseUrl(projectBaseUrl),PreferencesManager.setViewState("project.baseUrl",projectBaseUrl,context)}function isWithinProject(absPathOrEntry){return model.isWithinProject(absPathOrEntry)}function filterProjectFiles(absPathOrEntryArray){if(!absPathOrEntryArray)return absPathOrEntryArray;let filteredPaths=[];return absPathOrEntryArray.forEach(function(file){isWithinProject(file)&&filteredPaths.push(file)}),filteredPaths}function makeProjectRelativeIfPossible(absPath){return model.makeProjectRelativeIfPossible(absPath)}function getProjectRoot(){return model.projectRoot}function _setProjectRoot(rootEntry){var d=new $.Deferred;return model.setProjectRoot(rootEntry).then(function(){d.resolve(),model.reopenNodes(PreferencesManager.getViewState("project.treeState",_getProjectViewStateContext()))}),d.promise()}var _saveProjectPath=function(){PreferencesManager.setViewState("projectPath",model.projectRoot.fullPath)};_saveTreeState=function(){var context=_getProjectViewStateContext(),openNodes=model.getOpenNodes();PreferencesManager.setViewState("project.treeState",openNodes,context)},_showErrorDialog=function(errType,isFolder,error,path,dstPath){var titleType=isFolder?Strings.DIRECTORY_TITLE:Strings.FILE_TITLE,entryType=isFolder?Strings.DIRECTORY:Strings.FILE,title,message;switch(path=StringUtils.breakableUrl(path),errType){case ERR_TYPE_CREATE:title=StringUtils.format(Strings.ERROR_CREATING_FILE_TITLE,titleType),message=StringUtils.format(Strings.ERROR_CREATING_FILE,entryType,path,error);break;case ERR_TYPE_CREATE_EXISTS:title=StringUtils.format(Strings.INVALID_FILENAME_TITLE,titleType),message=StringUtils.format(Strings.ENTRY_WITH_SAME_NAME_EXISTS,path);break;case ERR_TYPE_RENAME:title=StringUtils.format(Strings.ERROR_RENAMING_FILE_TITLE,titleType),message=StringUtils.format(Strings.ERROR_RENAMING_FILE,path,error,entryType);break;case ERR_TYPE_MOVE:title=StringUtils.format(Strings.ERROR_MOVING_FILE_TITLE,titleType),message=StringUtils.format(Strings.ERROR_MOVING_FILE,path,error,entryType);break;case ERR_TYPE_DELETE:title=StringUtils.format(Strings.ERROR_DELETING_FILE_TITLE,titleType),message=StringUtils.format(Strings.ERROR_DELETING_FILE,path,error,entryType);break;case 5:title=Strings.ERROR_LOADING_PROJECT,message=StringUtils.format(Strings.READ_DIRECTORY_ENTRIES_ERROR,path,error);break;case ERR_TYPE_LOADING_PROJECT_NATIVE:title=Strings.ERROR_LOADING_PROJECT,message=StringUtils.format(Strings.REQUEST_NATIVE_FILE_SYSTEM_ERROR,path,error);break;case ERR_TYPE_MAX_FILES:title=Strings.ERROR_MAX_FILES_TITLE,message=Strings.ERROR_MAX_FILES;break;case 8:title=Strings.ERROR_LOADING_PROJECT,message=StringUtils.format(Strings.OPEN_DIALOG_ERROR,error);break;case ERR_TYPE_INVALID_FILENAME:title=StringUtils.format(Strings.INVALID_FILENAME_TITLE,isFolder?Strings.DIRECTORY_NAME:Strings.FILENAME),message=StringUtils.format(Strings.INVALID_FILENAME_MESSAGE,isFolder?Strings.DIRECTORY_NAMES_LEDE:Strings.FILENAMES_LEDE,error);break;case ERR_TYPE_PASTE:title=StringUtils.format(Strings.CANNOT_PASTE_TITLE,titleType),message=StringUtils.format(Strings.ENTRY_WITH_SAME_NAME_EXISTS,path);break;case ERR_TYPE_PASTE_FAILED:title=StringUtils.format(Strings.CANNOT_PASTE_TITLE,titleType),message=StringUtils.format(Strings.ERR_TYPE_PASTE_FAILED,path,dstPath);break;case ERR_TYPE_DUPLICATE_FAILED:title=StringUtils.format(Strings.CANNOT_DUPLICATE_TITLE,titleType),message=StringUtils.format(Strings.ERR_TYPE_DUPLICATE_FAILED,path);break;case ERR_TYPE_DOWNLOAD_FAILED:title=StringUtils.format(Strings.CANNOT_DOWNLOAD_TITLE,titleType),message=StringUtils.format(Strings.ERR_TYPE_DOWNLOAD_FAILED,path)}return title&&message?Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,title,message):null};var _RENDER_DEBOUNCE_TIME=100;function getWelcomeProjectPath(){return ProjectModel._getWelcomeProjectPath(Urls.GETTING_STARTED,Phoenix.VFS.getDefaultProjectDir())}function getExploreProjectPath(){return`${getLocalProjectsPath()}explore`}function getLocalProjectsPath(){return Phoenix.VFS.getLocalDir()}function addWelcomeProjectPath(path){var welcomeProjects=ProjectModel._addWelcomeProjectPath(path,PreferencesManager.getViewState("welcomeProjects"));PreferencesManager.setViewState("welcomeProjects",welcomeProjects)}function isWelcomeProjectPath(path){return ProjectModel._isWelcomeProjectPath(path,getWelcomeProjectPath(),PreferencesManager.getViewState("welcomeProjects"))}function updateWelcomeProjectPath(path){return isWelcomeProjectPath(path)?getWelcomeProjectPath():path}function _getFallbackProjectPath(){var fallbackPaths=[],recentProjects=PreferencesManager.getViewState("recentProjects")||[],deferred=new $.Deferred;function processItem(path){var deferred=new $.Deferred,fileEntry;return FileSystem.getDirectoryForPath(path).exists(function(err,exists){!err&&exists?deferred.resolve():deferred.reject()}),deferred.promise()}return recentProjects.length>1&&fallbackPaths.push(recentProjects[1]),fallbackPaths.push(getWelcomeProjectPath()),Async.firstSequentially(fallbackPaths,processItem).done(function(fallbackPath){deferred.resolve(fallbackPath)}).fail(function(){deferred.resolve(FileUtils.getNativeBracketsDirectoryPath())}),deferred.promise()}function getInitialProjectPath(){return updateWelcomeProjectPath(PreferencesManager.getViewState("projectPath"))}async function getStartupProjectPath(){return new Promise(resolve=>{let startupProjectPath=updateWelcomeProjectPath(PreferencesManager.getViewState("projectPath"));FileSystem.getDirectoryForPath(startupProjectPath).exists((err,exists)=>{resolve(exists?startupProjectPath:getWelcomeProjectPath())})})}function _watchProjectRoot(rootPath){FileSystem.on("change",_fileSystemChange),FileSystem.on("rename",_fileSystemRename),FileSystem.watch(FileSystem.getDirectoryForPath(rootPath),ProjectModel._shouldShowName,ProjectModel.defaultIgnoreGlobs,function(err){err===FileSystemError.TOO_MANY_ENTRIES?_projectWarnedForTooManyFiles||(_showErrorDialog(ERR_TYPE_MAX_FILES),_projectWarnedForTooManyFiles=!0):err&&console.error("Error watching project root: ",rootPath,err)}),model._resetCache()}function _unwatchProjectRoot(){var result=new $.Deferred;return model.projectRoot?(FileSystem.off("change",_fileSystemChange),FileSystem.off("rename",_fileSystemRename),FileSystem.unwatch(model.projectRoot,function(err){err?(console.error("Error unwatching project root: ",model.projectRoot.fullPath,err),result.reject(err)):result.resolve()}),model._resetCache()):result.reject(),result.promise()}function _reloadProjectPreferencesScope(){var root=getProjectRoot();root?PreferencesManager._setProjectSettingsFile(root.fullPath+SETTINGS_FILENAME):PreferencesManager._setProjectSettingsFile()}function _loadProject(rootPath,isUpdating){var result=new $.Deferred,startLoad=new $.Deferred,projectPrefFullPath=(rootPath=ProjectModel._ensureTrailingSlash(rootPath))+SETTINGS_FILENAME,file=FileSystem.getFileForPath(projectPrefFullPath);if(FileUtils.readAsText(file).done(function(text){try{text&&JSON.parse(text)}catch(err){var info=MainViewManager.findInAllWorkingSets(projectPrefFullPath),paneId;info.length&&(paneId=info[0].paneId),FileViewController.openFileAndAddToWorkingSet(projectPrefFullPath,paneId).done(function(){Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,Strings.ERROR_PREFS_CORRUPT_TITLE,Strings.ERROR_PROJ_PREFS_CORRUPT).done(function(){MainViewManager.focusActivePane()})})}}),isUpdating)startLoad.resolve();else{if(model.projectRoot&&model.projectRoot.fullPath===rootPath)return(new $.Deferred).resolve().promise();model.projectRoot&&exports.trigger(EVENT_PROJECT_BEFORE_CLOSE,model.projectRoot),MainViewManager._closeAll(MainViewManager.ALL_PANES),_unwatchProjectRoot().always(function(){model.projectRoot&&(LanguageManager._resetPathLanguageOverrides(),PreferencesManager._reloadUserPrefs(model.projectRoot),exports.trigger(EVENT_PROJECT_CLOSE,model.projectRoot)),startLoad.resolve()})}return startLoad.done(function(){var context={location:{scope:"user",layer:"project"}};if(isUpdating||PreferencesManager._stateProjectLayer.setProjectPath(rootPath),!brackets.inBrowser){isUpdating||_watchProjectRoot(rootPath);var rootEntry=FileSystem.getDirectoryForPath(rootPath);rootEntry.exists(function(err,exists){if(exists){var projectRootChanged=!model.projectRoot||!rootEntry||model.projectRoot.fullPath!==rootEntry.fullPath,perfTimerName=PerfUtils.markStart("Load Project: "+rootPath);_projectWarnedForTooManyFiles=!1,_setProjectRoot(rootEntry).always(function(){model.setBaseUrl(PreferencesManager.getViewState("project.baseUrl",context)||""),projectRootChanged&&(_reloadProjectPreferencesScope(),PreferencesManager._setCurrentFile(rootPath)),rootPath===getWelcomeProjectPath()&&addWelcomeProjectPath(rootPath),projectRootChanged?(exports.trigger(EVENT_PROJECT_OPEN,model.projectRoot),result.resolve()):(exports.trigger(EVENT_PROJECT_REFRESH,model.projectRoot),result.resolve());let projectLoadTime=PerfUtils.addMeasurement(perfTimerName);Metrics.valueEvent(Metrics.EVENT_TYPE.PERFORMANCE,"projectLoad","timeMs",Number(projectLoadTime))})}else console.error("error loading project"),exports.trigger(EVENT_PROJECT_OPEN_FAILED,rootPath),_showErrorDialog(ERR_TYPE_LOADING_PROJECT_NATIVE,!0,err||FileSystemError.NOT_FOUND,rootPath).done(function(){model.projectRoot=null,_getFallbackProjectPath().done(function(path){_loadProject(path).always(function(){result.reject()})})})})}}),result.promise()}_renderTreeSync=function(forceRender){var projectRoot=getProjectRoot();projectRoot&&(model.setScrollerInfo($projectTreeContainer[0].scrollWidth,$projectTreeContainer.scrollTop(),$projectTreeContainer.scrollLeft(),$projectTreeContainer.offset().top),FileTreeView.render(fileTreeViewContainer,model._viewModel,projectRoot,actionCreator,forceRender,brackets.platform))},_renderTree=_.debounce(_renderTreeSync,100);var _refreshDelay=1e3,refreshFileTree=function refreshFileTree(){return FileSystem.clearAllCaches(),(new $.Deferred).resolve().promise()};function _showFolderFirst(){const newPref=!PreferencesManager.get(SORT_DIRECTORIES_FIRST);PreferencesManager.set(SORT_DIRECTORIES_FIRST,newPref)}function showInTree(entry){return model.showInTree(entry).then(_saveTreeState)}function openProject(path){var result=new $.Deferred;return path||window.showOpenFilePicker?(CommandManager.execute(Commands.FILE_CLOSE_ALL,{promptOnly:!0}).done(function(){path?_loadProject(path,!1).then(result.resolve,result.reject):FileSystem.showOpenDialog(!1,!0,Strings.CHOOSE_FOLDER,model.projectRoot.fullPath,null,function(err,files){!err&&files.length>0?_loadProject(files[0]).then(result.resolve,result.reject):result.reject()})}).fail(function(){result.reject()}),result.promise()):(Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,Strings.UNSUPPORTED_BROWSER,Strings.UNSUPPORTED_BROWSER_OPEN_FOLDER),result.reject(),result.promise())}function _projectSettings(){return PreferencesDialogs.showProjectPreferencesDialog(getBaseUrl()).getPromise()}function createNewItem(baseDir,initialName,skipRename,isFolder){return baseDir=model.getDirectoryInProject(baseDir),skipRename?isFolder?model.createAtPath(baseDir+initialName+"/"):model.createAtPath(baseDir+initialName):actionCreator.startCreating(baseDir,initialName,isFolder)}function deleteItem(entry){var result=new $.Deferred;let name=_getProjectRelativePathForCopy(entry.fullPath),message=StringUtils.format(Strings.DELETING,name);return setProjectBusy(!0,message),entry.unlink(function(err){if(setProjectBusy(!1,message),err)_showErrorDialog(ERR_TYPE_DELETE,entry.isDirectory,FileUtils.getFileErrorString(err),entry.fullPath),result.reject(err);else{let parent;DocumentManager.notifyPathDeleted(entry.fullPath),_updateModelWithChange(window.path.dirname(entry.fullPath)),result.resolve()}}),result.promise()}function getLanguageFilter(languageId){return function languageFilter(file){var id=LanguageManager.getLanguageForPath(file.fullPath).getId();return"string"==typeof languageId?id===languageId:-1!==languageId.indexOf(id)}}function _updateModelWithChange(path){FileSystem.resolve(path,(err,entry)=>{err||model.handleFSEvent(entry)})}function forceFinishRename(){actionCreator.performRename()}function _setFileTreeSelectionWidth(width){model.setSelectionWidth(width),_renderTreeSync()}refreshFileTree=_.debounce(refreshFileTree,1e3),_fileSystemChange=function(event,entry,added,removed){FileSyncManager.syncOpenDocuments(),model.handleFSEvent(entry,added,removed);let removedInProject=[],addedInProject=[];if(removed&&removed.forEach(function(file){DocumentManager.notifyPathDeleted(file.fullPath),isWithinProject(file)&&removedInProject.push(file)}),addedInProject=filterProjectFiles(added),entry&&!isWithinProject(entry))if(addedInProject&&addedInProject.length&&isWithinProject(addedInProject[0].parentPath))entry=FileSystem.getDirectoryForPath(addedInProject[0].parentPath);else{if(!(removedInProject&&removedInProject.length&&isWithinProject(removedInProject[0].parentPath)))return;entry=FileSystem.getDirectoryForPath(removedInProject[0].parentPath)}exports.trigger("projectFileChanged",entry,addedInProject,removedInProject)},_fileSystemRename=function(event,oldName,newName){let oldParent=window.path.dirname(oldName),newParent=window.path.dirname(newName);_updateModelWithChange(oldParent),newParent!==oldParent&&_updateModelWithChange(newParent),DocumentManager.notifyPathNameChanged(oldName,newName),exports.trigger("projectFileRenamed",oldName,newName)};let _numPendingOperations=0,projectBusyMessages=[];function setProjectBusy(isBusy,message){const $projectSpinner=$("#project-operations-spinner");if(message=message||Strings.PROJECT_BUSY,isBusy)_numPendingOperations++,projectBusyMessages.push(message);else{_numPendingOperations--,console.log("ProjectBusy marked by: ",projectBusyMessages),console.log("removing busy status: ",message);const index=projectBusyMessages.indexOf(message);index>-1&&projectBusyMessages.splice(index,1),console.log(projectBusyMessages)}projectBusyMessages.length>0&&$projectSpinner.attr("title",projectBusyMessages.join(", ")),_numPendingOperations>0?$projectSpinner.removeClass("forced-hidden"):$projectSpinner.addClass("forced-hidden")}let queuePathForSelection=null;function _duplicateFileCMD(){let context=getContext();if(context){let name=_getProjectRelativePathForCopy(context.fullPath),message=StringUtils.format(Strings.DUPLICATING,name);setProjectBusy(!0,message),FileSystem.getFreePath(context.fullPath,(err,dupePath)=>{FileSystem.copy(context.fullPath,dupePath,(err,copiedStats)=>{setProjectBusy(!1,message),err?_showErrorDialog(ERR_TYPE_DUPLICATE_FAILED,!1,"err",_getProjectRelativePathForCopy(context.fullPath)):queuePathForSelection=copiedStats.realPath})})}}function _zipFailed(fullPath){_showErrorDialog(ERR_TYPE_DOWNLOAD_FAILED,!1,"err",_getProjectRelativePathForCopy(fullPath))}function _downloadFolderCommand(downloadPath){downloadPath=downloadPath||getProjectRoot().fullPath;let projectName=path.basename(downloadPath),message=StringUtils.format(Strings.DOWNLOADING_FILE,projectName);setProjectBusy(!0,message),ZipUtils.zipFolder(downloadPath).then(zip=>zip.generateAsync({type:"blob"})).then(function(blob){window.saveAs(blob,`${projectName}.zip`)}).catch(()=>{_zipFailed(downloadPath)}).finally(()=>{setProjectBusy(!1,message)})}function _downloadCommand(entryToDownload){let context=entryToDownload||getContext();if(context){let name=_getProjectRelativePathForCopy(context.fullPath),message=StringUtils.format(Strings.DOWNLOADING_FILE,name);context.isFile?(setProjectBusy(!0,message),context.read({encoding:window.fs.BYTE_ARRAY_ENCODING},function(err,blobContent){if(err)return void _zipFailed(context.fullPath);setProjectBusy(!1,message);let blob=new Blob([blobContent],{type:"application/octet-stream"});window.saveAs(blob,path.basename(context.fullPath))})):_downloadFolderCommand(context.fullPath)}}model.on(ProjectModel.EVENT_CHANGE,async()=>{if(queuePathForSelection){let entry;(await FileSystem.resolveAsync(queuePathForSelection)).entry.isFile&&actionCreator.setSelected(queuePathForSelection),queuePathForSelection=null}}),model.on(ProjectModel.EVENT_FS_RENAME_STARTED,()=>{setProjectBusy(!0,Strings.RENAMING)}),model.on(ProjectModel.EVENT_FS_RENAME_END,()=>{setProjectBusy(!1,Strings.RENAMING)});const OPERATION_CUT="cut",OPERATION_COPY="copy";function _addTextToSystemClipboard(text){navigator.clipboard?navigator.clipboard.writeText(text).catch(function(err){console.error("System clipboard error: Could not copy text: ",err)}):console.warn("Browser doesnt support clipboard control. system cut/copy/paste may not work")}function _registerPathWithClipboard(path,operation){_addTextToSystemClipboard(window.path.basename(path)),localStorage.setItem("phoenix.clipboard",JSON.stringify({operation:operation,path:path}))}function getProjectRelativePath(path){let projectRootParent=window.path.dirname(getProjectRoot().fullPath),relativePath;return window.path.relative(projectRootParent,path)}function _getProjectRelativePathForCopy(path){let projectRootParent=window.path.dirname(getProjectRoot().fullPath),relativePath=window.path.relative(projectRootParent,path);return path.startsWith(Phoenix.VFS.getMountDir())?relativePath=window.path.relative(Phoenix.VFS.getMountDir(),path):path.startsWith(Phoenix.VFS.getLocalDir())&&(relativePath=window.path.relative(Phoenix.VFS.getLocalDir(),path)),relativePath}function _copyProjectRelativePath(){let context=getContext();if(context){let projectRoot=getProjectRoot().fullPath,relativePath;_addTextToSystemClipboard(window.path.relative(projectRoot,context.fullPath)),localStorage.setItem("phoenix.clipboard",JSON.stringify({}))}}function _cutFileCMD(){let context=getContext();context&&_registerPathWithClipboard(context.fullPath,OPERATION_CUT)}function _copyFileCMD(){let context=getContext();context&&_registerPathWithClipboard(context.fullPath,OPERATION_COPY)}function _getPasteTarget(dstThatExists){return new Promise(async(resolve,reject)=>{try{let entry=(await FileSystem.resolveAsync(dstThatExists)).entry;if(entry.isFile){let parent=window.path.dirname(dstThatExists),parentEntry;resolve((await FileSystem.resolveAsync(parent)).entry)}else resolve(entry)}catch(e){reject(e)}})}function _isSubPathOf(dir,subDir){const relative=window.path.relative(dir,subDir);return relative&&!relative.startsWith("..")&&!window.path.isAbsolute(relative)}async function _validatePasteTarget(srcEntry,targetEntry){if(_isSubPathOf(srcEntry.fullPath,targetEntry.fullPath))return _showErrorDialog(ERR_TYPE_PASTE_FAILED,srcEntry.isDirectory,"err",_getProjectRelativePathForCopy(srcEntry.fullPath),_getProjectRelativePathForCopy(targetEntry.fullPath)),!1;let baseName=window.path.basename(srcEntry.fullPath),targetPath=window.path.normalize(`${targetEntry.fullPath}/${baseName}`),exists;return!await FileSystem.existsAsync(targetPath)||(_showErrorDialog(ERR_TYPE_PASTE,srcEntry.isDirectory,"err",_getProjectRelativePathForCopy(targetPath)),!1)}async function _performCut(src,dst){let target=await _getPasteTarget(dst),srcEntry=(await FileSystem.resolveAsync(src)).entry,canPaste;if(await _validatePasteTarget(srcEntry,target)){let baseName=window.path.basename(srcEntry.fullPath),targetPath=window.path.normalize(`${target.fullPath}/${baseName}`),message=StringUtils.format(Strings.MOVING,_getProjectRelativePathForCopy(srcEntry.fullPath));setProjectBusy(!0,message),srcEntry.rename(targetPath,err=>{setProjectBusy(!1,message),err?_showErrorDialog(ERR_TYPE_PASTE_FAILED,srcEntry.isDirectory,"err",_getProjectRelativePathForCopy(srcEntry.fullPath),_getProjectRelativePathForCopy(target.fullPath)):queuePathForSelection=targetPath})}}async function _performCopy(src,dst){let target=await _getPasteTarget(dst),srcEntry=(await FileSystem.resolveAsync(src)).entry,canPaste;if(await _validatePasteTarget(srcEntry,target)){let name=_getProjectRelativePathForCopy(srcEntry.fullPath),message=StringUtils.format(Strings.COPYING,name);setProjectBusy(!0,message),FileSystem.copy(srcEntry.fullPath,target.fullPath,(err,targetStat)=>{setProjectBusy(!1,message),err?_showErrorDialog(ERR_TYPE_PASTE_FAILED,srcEntry.isDirectory,"err",_getProjectRelativePathForCopy(srcEntry.fullPath),_getProjectRelativePathForCopy(target.fullPath)):queuePathForSelection=targetStat.realPath})}}function _pasteFileCMD(){let targetPath=getProjectRoot().fullPath,context=getContext();context&&(targetPath=context.fullPath);let clipboard=localStorage.getItem("phoenix.clipboard");if(clipboard)switch((clipboard=JSON.parse(clipboard)).operation){case OPERATION_CUT:_performCut(clipboard.path,targetPath);break;case OPERATION_COPY:_performCopy(clipboard.path,targetPath);break;default:console.error("Clipboard unknown Operation: ",clipboard,targetPath)}}function _setProjectDownloadCommandEnabled(_event,projectRoot){CommandManager.get(Commands.FILE_DOWNLOAD_PROJECT).setEnabled(!Phoenix.VFS.isLocalDiscPath(projectRoot.fullPath)),CommandManager.get(Commands.FILE_DOWNLOAD).setEnabled(!Phoenix.VFS.isLocalDiscPath(projectRoot.fullPath))}function getContext(){return model.getContext()}function renameItemInline(entry,isMoved){var d=new $.Deferred;return model.startRename(entry,isMoved).done(function(){d.resolve()}).fail(function(errorInfo){window.setTimeout(function(){if(isMoved)switch(errorInfo.type){case FileSystemError.ALREADY_EXISTS:_showErrorDialog(ERR_TYPE_MOVE,errorInfo.isFolder,Strings.FILE_EXISTS_ERR,errorInfo.fullPath);break;case ProjectModel.ERROR_NOT_IN_PROJECT:_showErrorDialog(ERR_TYPE_MOVE,errorInfo.isFolder,Strings.ERROR_MOVING_NOT_IN_PROJECT,errorInfo.fullPath);break;default:_showErrorDialog(ERR_TYPE_MOVE,errorInfo.isFolder,FileUtils.getFileErrorString(errorInfo.type),errorInfo.fullPath)}else switch(errorInfo.type){case ProjectModel.ERROR_INVALID_FILENAME:_showErrorDialog(ERR_TYPE_INVALID_FILENAME,errorInfo.isFolder,ProjectModel._invalidChars);break;case FileSystemError.ALREADY_EXISTS:_showErrorDialog(ERR_TYPE_RENAME,errorInfo.isFolder,Strings.FILE_EXISTS_ERR,errorInfo.fullPath);break;case ProjectModel.ERROR_NOT_IN_PROJECT:_showErrorDialog(ERR_TYPE_RENAME,errorInfo.isFolder,Strings.ERROR_RENAMING_NOT_IN_PROJECT,errorInfo.fullPath);break;default:_showErrorDialog(ERR_TYPE_RENAME,errorInfo.isFolder,FileUtils.getFileErrorString(errorInfo.type),errorInfo.fullPath)}},10),d.reject(errorInfo)}),d.promise()}function getAllFiles(filter,includeWorkingSet,sort){var viewFiles,deferred;return void 0===includeWorkingSet&&"function"!=typeof filter&&(includeWorkingSet=filter,filter=null),includeWorkingSet&&(viewFiles=MainViewManager.getWorkingSet(MainViewManager.ALL_PANES)),deferred=new $.Deferred,model.getAllFiles(filter,viewFiles,sort).done(function(fileList){deferred.resolve(fileList)}).fail(function(err){err!==FileSystemError.TOO_MANY_ENTRIES||_projectWarnedForTooManyFiles||(_showErrorDialog(ERR_TYPE_MAX_FILES),_projectWarnedForTooManyFiles=!0),deferred.resolve([])}),deferred.promise()}function addIconProvider(callback,priority=0){return WorkingSetView.addIconProvider(callback,priority),FileTreeView.addIconProvider(callback,priority)}function addClassesProvider(callback,priority){return WorkingSetView.addClassProvider(callback,priority),FileTreeView.addClassesProvider(callback,priority)}function rerenderTree(){_renderTree(!0)}AppInit.htmlReady(function(){($projectTreeContainer=$("#project-files-container")).addClass("jstree jstree-brackets"),$projectTreeContainer.css("overflow","auto"),$projectTreeContainer.css("position","relative"),fileTreeViewContainer=$("<div>").appendTo($projectTreeContainer)[0],model.setSelectionWidth($projectTreeContainer.width()),$(".main-view").click(function(jqEvent){jqEvent.target.classList.contains("jstree-rename-input")||(forceFinishRename(),actionCreator.setContext(null))}),$("#working-set-list-container").on("contentChanged",function(){$projectTreeContainer.trigger("contentChanged")}),Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU).on("beforeContextMenuOpen",function(){actionCreator.restoreContext()}),Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU).on("beforeContextMenuClose",function(){model.setContext(null,!1,!0)}),$projectTreeContainer.on("contextmenu",function(){forceFinishRename()}),$projectTreeContainer.on("dragover",function(e){e.preventDefault()}),$projectTreeContainer.on("drop",function(e){var data=JSON.parse(e.originalEvent.dataTransfer.getData("text"));actionCreator.moveItem(data.path,getProjectRoot().fullPath),e.stopPropagation()}),$("#project-context-menu").on("click.dropdown-menu",function(){model.setContext(null,!0)}),$projectTreeContainer.on("scroll",function(){$(".dropdown.open").length>0&&(Menus.closeAll(),actionCreator.setContext(null)),_renderTreeSync()}),_renderTree(),ViewUtils.addScrollerShadow($projectTreeContainer[0])}),EventDispatcher.makeEventDispatcher(exports),PreferencesManager.stateManager.definePreference("projectPath","string",getWelcomeProjectPath()),exports.on(EVENT_PROJECT_OPEN,_reloadProjectPreferencesScope),exports.on(EVENT_PROJECT_OPEN,_saveProjectPath),exports.on(EVENT_PROJECT_OPEN,_setProjectDownloadCommandEnabled),exports.on("beforeAppClose",_unwatchProjectRoot),EventDispatcher.on_duringInit(FileViewController,"documentSelectionFocusChange",_documentSelectionFocusChange),EventDispatcher.on_duringInit(FileViewController,"fileViewFocusChange",_fileViewControllerChange),EventDispatcher.on_duringInit(MainViewManager,"currentFileChange",_currentFileChange),CommandManager.register(Strings.CMD_OPEN_FOLDER,Commands.FILE_OPEN_FOLDER,openProject),CommandManager.register(Strings.CMD_PROJECT_SETTINGS,Commands.FILE_PROJECT_SETTINGS,_projectSettings),CommandManager.register(Strings.CMD_FILE_REFRESH,Commands.FILE_REFRESH,refreshFileTree),CommandManager.register(Strings.CMD_FILE_CUT,Commands.FILE_CUT,_cutFileCMD),CommandManager.register(Strings.CMD_FILE_COPY,Commands.FILE_COPY,_copyFileCMD),CommandManager.register(Strings.CMD_FILE_COPY_PATH,Commands.FILE_COPY_PATH,_copyProjectRelativePath),CommandManager.register(Strings.CMD_FILE_PASTE,Commands.FILE_PASTE,_pasteFileCMD),CommandManager.register(Strings.CMD_FILE_DUPLICATE,Commands.FILE_DUPLICATE,_duplicateFileCMD),CommandManager.register(Strings.CMD_FILE_DOWNLOAD_PROJECT,Commands.FILE_DOWNLOAD_PROJECT,_downloadFolderCommand),CommandManager.register(Strings.CMD_FILE_DOWNLOAD,Commands.FILE_DOWNLOAD,_downloadCommand),PreferencesManager.definePreference(SORT_DIRECTORIES_FIRST,"boolean",!0,{description:Strings.DESCRIPTION_SORT_DIRECTORIES_FIRST}).on("change",function(){let sortPref=PreferencesManager.get(SORT_DIRECTORIES_FIRST);actionCreator.setSortDirectoriesFirst(sortPref),CommandManager.get(Commands.FILE_SHOW_FOLDERS_FIRST).setChecked(sortPref)}),CommandManager.register(Strings.CMD_FILE_SHOW_FOLDERS_FIRST,Commands.FILE_SHOW_FOLDERS_FIRST,_showFolderFirst),CommandManager.get(Commands.FILE_SHOW_FOLDERS_FIRST).setChecked(PreferencesManager.get(SORT_DIRECTORIES_FIRST)),actionCreator.setSortDirectoriesFirst(PreferencesManager.get(SORT_DIRECTORIES_FIRST)),exports._actionCreator=actionCreator,exports._RENDER_DEBOUNCE_TIME=100,exports._setFileTreeSelectionWidth=_setFileTreeSelectionWidth,exports.getProjectRoot=getProjectRoot,exports.getBaseUrl=getBaseUrl,exports.setBaseUrl=setBaseUrl,exports.isWithinProject=isWithinProject,exports.filterProjectFiles=filterProjectFiles,exports.makeProjectRelativeIfPossible=makeProjectRelativeIfPossible,exports.shouldShow=ProjectModel.shouldShow,exports.shouldIndex=ProjectModel.shouldIndex,exports.openProject=openProject,exports.getFileTreeContext=getFileTreeContext,exports.getSelectedItem=getSelectedItem,exports.getContext=getContext,exports.getInitialProjectPath=getInitialProjectPath,exports.getStartupProjectPath=getStartupProjectPath,exports.getProjectRelativePath=getProjectRelativePath,exports.getWelcomeProjectPath=getWelcomeProjectPath,exports.getExploreProjectPath=getExploreProjectPath,exports.getLocalProjectsPath=getLocalProjectsPath,exports.isWelcomeProjectPath=isWelcomeProjectPath,exports.updateWelcomeProjectPath=updateWelcomeProjectPath,exports.createNewItem=createNewItem,exports.renameItemInline=renameItemInline,exports.deleteItem=deleteItem,exports.forceFinishRename=forceFinishRename,exports.showInTree=showInTree,exports.refreshFileTree=refreshFileTree,exports.getAllFiles=getAllFiles,exports.getLanguageFilter=getLanguageFilter,exports.addIconProvider=addIconProvider,exports.addClassesProvider=addClassesProvider,exports.rerenderTree=rerenderTree,exports.setProjectBusy=setProjectBusy,exports.EVENT_PROJECT_BEFORE_CLOSE=EVENT_PROJECT_BEFORE_CLOSE,exports.EVENT_PROJECT_CLOSE=EVENT_PROJECT_CLOSE,exports.EVENT_PROJECT_OPEN=EVENT_PROJECT_OPEN,exports.EVENT_PROJECT_REFRESH=EVENT_PROJECT_REFRESH,exports.EVENT_CONTENT_CHANGED="contentChanged",exports.EVENT_PROJECT_FILE_CHANGED="projectFileChanged",exports.EVENT_PROJECT_FILE_RENAMED="projectFileRenamed",exports.EVENT_PROJECT_OPEN_FAILED=EVENT_PROJECT_OPEN_FAILED});
//# sourceMappingURL=ProjectManager.js.map
