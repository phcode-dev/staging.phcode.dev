define(function(require,exports,module){const AppInit=require("utils/AppInit"),CommandManager=require("command/CommandManager"),Commands=require("command/Commands"),DeprecationWarning=require("utils/DeprecationWarning"),EventDispatcher=require("utils/EventDispatcher"),ProjectManager=require("project/ProjectManager"),DocumentManager=require("document/DocumentManager"),MainViewManager=require("view/MainViewManager"),EditorManager=require("editor/EditorManager"),FileSystem=require("filesystem/FileSystem"),FileSystemError=require("filesystem/FileSystemError"),FileUtils=require("file/FileUtils"),FileViewController=require("project/FileViewController"),InMemoryFile=require("document/InMemoryFile"),StringUtils=require("utils/StringUtils"),Async=require("utils/Async"),Metrics=require("utils/Metrics"),Dialogs=require("widgets/Dialogs"),DefaultDialogs=require("widgets/DefaultDialogs"),Strings=require("strings"),PopUpManager=require("widgets/PopUpManager"),PreferencesManager=require("preferences/PreferencesManager"),PerfUtils=require("utils/PerfUtils"),KeyEvent=require("utils/KeyEvent"),Menus=require("command/Menus"),UrlParams=require("utils/UrlParams").UrlParams,StatusBar=require("widgets/StatusBar"),WorkspaceManager=require("view/WorkspaceManager"),LanguageManager=require("language/LanguageManager"),NewFileContentManager=require("features/NewFileContentManager"),NodeConnector=require("NodeConnector"),_=require("thirdparty/lodash");var _$title=null,_$dirtydot=null,_$titleWrapper=null,_currentTitlePath=null,_osDash="mac"===brackets.platform?"—":"-",WINDOW_TITLE_STRING_NO_DOC="{0} "+_osDash+" {1}",WINDOW_TITLE_STRING_DOC="{0} "+_osDash+" {1}",_$titleContainerToolbar=null,_lastToolbarHeight=null,_nextUntitledIndexToUse=1,_isReloading=!1,USER_CANCELED={userCanceled:!0};PreferencesManager.definePreference("defaultExtension","string","",{excludeFromHints:!0}),EventDispatcher.makeEventDispatcher(exports);const APP_QUIT_CANCELLED="appQuitCancelled",_EVENT_OPEN_WITH_FILE_FROM_OS="_openWithFileFromOS";let _filesOpenedFromOsCount=0;var handleFileSaveAs;function _fileOpened(filePath,addedToWorkingSet,encoding){let language=LanguageManager.getLanguageForPath(filePath);Metrics.countEvent(Metrics.EVENT_TYPE.EDITOR,"fileEncoding",encoding||"UTF-8"),addedToWorkingSet?Metrics.countEvent(Metrics.EVENT_TYPE.EDITOR,"fileAddToWorkingSet",language._name.toLowerCase()):Metrics.countEvent(Metrics.EVENT_TYPE.EDITOR,"fileOpen",language._name.toLowerCase())}function _fileSavedMetrics(docToSave){if(!docToSave)return;let fileType=docToSave.language?docToSave.language._name:"";Metrics.countEvent(Metrics.EVENT_TYPE.EDITOR,"fileSave",fileType)}function _fileClosed(file){if(file){var language=LanguageManager.getLanguageForPath(file._path),size=-1;file.stat(function(err,fileStat){err||(size=fileStat.size.valueOf()/1024),_sendData(size)})}function _sendData(fileSizeInKB){let subType="",fileSizeInMB=fileSizeInKB/1024;fileSizeInMB<=1?(fileSizeInKB<0&&(subType=""),subType=fileSizeInKB<=10?"0_to_10KB":fileSizeInKB<=50?"10_to_50KB":fileSizeInKB<=100?"50_to_100KB":fileSizeInKB<=500?"100_to_500KB":"500KB_to_1MB"):subType=fileSizeInMB<=2?"1_to_2MB":fileSizeInMB<=5?"2_to_5MB":fileSizeInMB<=10?"5_to_10MB":"Above_10MB",Metrics.countEvent(Metrics.EVENT_TYPE.EDITOR,"fileClose",`${language._name.toLowerCase()}.${subType}`)}}function _updateTitle(){var currentDoc=DocumentManager.getCurrentDocument(),windowTitle=brackets.config.app_title,currentlyViewedFile=MainViewManager.getCurrentlyViewedFile(MainViewManager.ACTIVE_PANE),currentlyViewedPath=currentlyViewedFile&&currentlyViewedFile.fullPath,readOnlyString=currentlyViewedFile&&currentlyViewedFile.readOnly?"[Read Only] - ":"";currentlyViewedPath?(_$title.text(_currentTitlePath),_$title.attr("title",currentlyViewedPath),currentDoc?_$dirtydot.css("visibility",currentDoc.isDirty?"visible":"hidden"):_$dirtydot.css("visibility","hidden")):(_$title.text(""),_$title.attr("title",""),_$dirtydot.css("visibility","hidden")),_$titleWrapper.css("width","");var newWidth=_$title.width();_$titleWrapper.css("width",newWidth);var newToolbarHeight=_$titleContainerToolbar.height();_lastToolbarHeight!==newToolbarHeight&&(_lastToolbarHeight=newToolbarHeight,WorkspaceManager.recomputeLayout());var projectRoot=ProjectManager.getProjectRoot();if(projectRoot){var projectName=projectRoot.name;currentlyViewedPath?(windowTitle=StringUtils.format(WINDOW_TITLE_STRING_DOC,readOnlyString+projectName,_currentTitlePath),currentDoc&&currentDoc.isDirty&&(windowTitle="• "+windowTitle)):windowTitle=StringUtils.format(WINDOW_TITLE_STRING_NO_DOC,projectName,brackets.config.app_title)}Phoenix.app.setWindowTitle(windowTitle)}function _shortTitleForDocument(doc){var fullPath=doc.file.fullPath;return doc.isUntitled()?fullPath.substring(fullPath.lastIndexOf("/")+1):Phoenix.app.getDisplayPath(ProjectManager.makeProjectRelativeIfPossible(fullPath))}function handleCurrentFileChange(){var newFile=MainViewManager.getCurrentlyViewedFile(MainViewManager.ACTIVE_PANE);if(newFile){var newDocument=DocumentManager.getOpenDocumentForPath(newFile.fullPath);if(newDocument)_currentTitlePath=_shortTitleForDocument(newDocument);else{const filePath=ProjectManager.makeProjectRelativeIfPossible(newFile.fullPath);_currentTitlePath=Phoenix.app.getDisplayPath(filePath)}}else _currentTitlePath=null;_updateTitle()}function handleDirtyChange(event,changedDoc){var currentDoc=DocumentManager.getCurrentDocument();currentDoc&&changedDoc.file.fullPath===currentDoc.file.fullPath&&_updateTitle()}function showFileOpenError(name,path){return Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,Strings.ERROR_OPENING_FILE_TITLE,StringUtils.format(Strings.ERROR_OPENING_FILE,StringUtils.breakableUrl(path),FileUtils.getFileErrorString(name)))}function _doOpen(fullPath,silent,paneId,options){var result=new $.Deferred;if(MainViewManager.getCurrentlyViewedPath(paneId||MainViewManager.ACTIVE_PANE)===fullPath)return result.resolve(MainViewManager.getCurrentlyViewedFile(paneId||MainViewManager.ACTIVE_PANE)),result.promise();function _cleanup(fileError,fullFilePath){fullFilePath&&(MainViewManager._removeView(paneId,FileSystem.getFileForPath(fullFilePath)),MainViewManager.focusActivePane()),result.reject(fileError)}function _showErrorAndCleanUp(fileError,fullFilePath){silent?_cleanup(fileError,fullFilePath):showFileOpenError(fileError,fullFilePath).done(function(){_cleanup(fileError,fullFilePath)})}if(!fullPath)throw new Error("_doOpen() called without fullPath");var perfTimerName=PerfUtils.markStart("Open File:\t"+fullPath);result.always(function(){let fileOpenTime=PerfUtils.addMeasurement(perfTimerName);Metrics.valueEvent(Metrics.EVENT_TYPE.PERFORMANCE,"fileOpen","timeMs",Number(fileOpenTime))});var file=FileSystem.getFileForPath(fullPath);if(options&&options.encoding)file._encoding=options.encoding;else{const encoding=PreferencesManager.getViewState("encoding",PreferencesManager.STATE_PROJECT_CONTEXT);encoding&&encoding[fullPath]&&(file._encoding=encoding[fullPath])}return MainViewManager._open(paneId,file,options).done(function(){result.resolve(file)}).fail(function(fileError){_showErrorAndCleanUp(fileError,fullPath),result.reject()}),result.promise()}var _defaultOpenDialogFullPath=null;function _doOpenWithOptionalPath(fullPath,silent,paneId,options){var result;return paneId=paneId||MainViewManager.ACTIVE_PANE,fullPath?result=_doOpen(fullPath,silent,paneId,options):(result=new $.Deferred,_defaultOpenDialogFullPath||(_defaultOpenDialogFullPath=ProjectManager.getProjectRoot().fullPath),FileSystem.showOpenDialog(!0,!1,Strings.OPEN_FILE,_defaultOpenDialogFullPath,null,function(err,paths){if(!err)if(paths.length>0){var filesToOpen=[];paths.forEach(function(path){filesToOpen.push(FileSystem.getFileForPath(path))}),MainViewManager.addListToWorkingSet(paneId,filesToOpen),_doOpen(paths[paths.length-1],silent,paneId,options).done(function(file){_defaultOpenDialogFullPath=FileUtils.getDirectoryPath(MainViewManager.getCurrentlyViewedPath(paneId))}).then(result.resolve,result.reject)}else result.reject()})),result.promise()}function _parseDecoratedPath(path){var result={path:path,line:null,column:null};if(path){var matchResult=/(.+?):([0-9]+)(:([0-9]+))?$/.exec(path);matchResult&&(result.path=matchResult[1],matchResult[2]&&(result.line=parseInt(matchResult[2],10)),matchResult[4]&&(result.column=parseInt(matchResult[4],10)))}return result}function handleFileOpen(commandData){var fileInfo=_parseDecoratedPath(commandData?commandData.fullPath:null),silent=commandData&&commandData.silent||!1,paneId=commandData&&commandData.paneId||MainViewManager.ACTIVE_PANE,result=new $.Deferred;return _doOpenWithOptionalPath(fileInfo.path,silent,paneId,commandData&&commandData.options).done(function(file){_fileOpened(file._path,!1,file._encoding),commandData&&commandData.options&&commandData.options.noPaneActivate||MainViewManager.setActivePaneId(paneId),null!==fileInfo.line&&((null===fileInfo.column||fileInfo.column<=0)&&(fileInfo.column=1),EditorManager.getCurrentFullEditor().setCursorPos(fileInfo.line-1,fileInfo.column-1,!0)),result.resolve(file)}).fail(function(err){result.reject(err)}),result}function handleDocumentOpen(commandData){var result=new $.Deferred;return handleFileOpen(commandData).done(function(file){var doc=DocumentManager.getOpenDocumentForPath(file.fullPath);result.resolve(doc)}).fail(function(err){result.reject(err)}),result.promise()}function handleFileAddToWorkingSetAndOpen(commandData){return handleFileOpen(commandData).done(function(file){var paneId=commandData&&commandData.paneId||MainViewManager.ACTIVE_PANE;MainViewManager.addToWorkingSet(paneId,file,commandData.index,commandData.forceRedraw),_fileOpened(file.fullPath,!0)})}function handleFileAddToWorkingSet(commandData){DeprecationWarning.deprecationWarning("Commands.FILE_ADD_TO_WORKING_SET has been deprecated.  Use Commands.CMD_ADD_TO_WORKINGSET_AND_OPEN instead.");var result=new $.Deferred;return handleFileAddToWorkingSetAndOpen(commandData).done(function(file){var doc=DocumentManager.getOpenDocumentForPath(file.fullPath);result.resolve(doc)}).fail(function(err){result.reject(err)}),result.promise()}function _getUntitledFileSuggestion(dir,baseFileName,isFolder){var suggestedName=baseFileName+"-"+_nextUntitledIndexToUse++,deferred=$.Deferred();if(_nextUntitledIndexToUse>9999)deferred.reject();else{var path=dir.fullPath+suggestedName,entry;(isFolder?FileSystem.getDirectoryForPath(path):FileSystem.getFileForPath(path)).exists(function(err,exists){err||exists?_getUntitledFileSuggestion(dir,baseFileName,isFolder).then(deferred.resolve,deferred.reject):deferred.resolve(suggestedName)})}return deferred.promise()}var fileNewInProgress=!1;function _handleNewItemInProject(isFolder){if(!fileNewInProgress){fileNewInProgress=!0;var baseDirEntry,selected=ProjectManager.getFileTreeContext();return(!selected||selected instanceof InMemoryFile)&&(selected=ProjectManager.getProjectRoot()),selected.isFile&&(baseDirEntry=FileSystem.getDirectoryForPath(selected.parentPath)),_getUntitledFileSuggestion(baseDirEntry=baseDirEntry||selected,Strings.UNTITLED,isFolder).then(createWithSuggestedName,createWithSuggestedName.bind(void 0,Strings.UNTITLED))}function createWithSuggestedName(suggestedName){return ProjectManager.createNewItem(baseDirEntry,suggestedName,!1,isFolder).done(function(fileOrStatus){"object"==typeof fileOrStatus&&fileOrStatus.isFile&&fileOrStatus.fullPath&&DocumentManager.getDocumentForPath(fileOrStatus.fullPath).done(doc=>{NewFileContentManager.getInitialContentForFile(fileOrStatus.fullPath).then(content=>{doc.setText(content)})}).fail(console.error)}).always(function(){fileNewInProgress=!1})}ProjectManager.forceFinishRename()}function handleFileNew(){var defaultExtension="",doc=DocumentManager.createUntitledDocument(_nextUntitledIndexToUse++,"");return MainViewManager._edit(MainViewManager.ACTIVE_PANE,doc),Metrics.countEvent(Metrics.EVENT_TYPE.EDITOR,"newUntitledFile","create"),(new $.Deferred).resolve(doc).promise()}function handleFileNewInProject(){Metrics.countEvent(Metrics.EVENT_TYPE.EDITOR,"newFile","inProject"),_handleNewItemInProject(!1)}function handleNewFolderInProject(){Metrics.countEvent(Metrics.EVENT_TYPE.EDITOR,"newFolder","inProject"),_handleNewItemInProject(!0)}function _showSaveFileError(name,path){return Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,Strings.ERROR_SAVING_FILE_TITLE,StringUtils.format(Strings.ERROR_SAVING_FILE,StringUtils.breakableUrl(path),FileUtils.getFileErrorString(name)))}let alwaysOverwriteTillProjectSwitch=!1;function doSave(docToSave,force){var result=new $.Deferred,file=docToSave.file;function handleError(error){_showSaveFileError(error,file.fullPath).done(function(){result.reject(error)})}function handleContentsModified(){alwaysOverwriteTillProjectSwitch?doSave(docToSave,!0).then(result.resolve,result.reject):Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,Strings.EXT_MODIFIED_TITLE,StringUtils.format(Strings.EXT_MODIFIED_WARNING,StringUtils.breakableUrl(docToSave.file.fullPath)),[{className:Dialogs.DIALOG_BTN_CLASS_LEFT,id:Dialogs.DIALOG_BTN_SAVE_AS,text:Strings.SAVE_AS},{className:Dialogs.DIALOG_BTN_CLASS_NORMAL,id:Dialogs.DIALOG_BTN_CANCEL,text:Strings.CANCEL},{className:Dialogs.DIALOG_BTN_CLASS_NORMAL,id:"alwaysOverwrite",text:Strings.ALWAYS_OVERWRITE,tooltip:Strings.EXT_ALWAYS_MODIFIED_BUTTON_TOOLTIP},{className:Dialogs.DIALOG_BTN_CLASS_PRIMARY,id:Dialogs.DIALOG_BTN_OK,text:Strings.SAVE_AND_OVERWRITE}]).done(function(id){id===Dialogs.DIALOG_BTN_CANCEL?result.reject():id===Dialogs.DIALOG_BTN_OK?doSave(docToSave,!0).then(result.resolve,result.reject):id===Dialogs.DIALOG_BTN_SAVE_AS?handleFileSaveAs({doc:docToSave}).then(result.resolve,result.reject):"alwaysOverwrite"===id&&(alwaysOverwriteTillProjectSwitch=!0,doSave(docToSave,!0).then(result.resolve,result.reject))})}function trySave(){FileUtils.writeText(file,docToSave.getText(!0),force).done(function(){docToSave.notifySaved(),result.resolve(file),_fileSavedMetrics(docToSave)}).fail(function(err){err===FileSystemError.CONTENTS_MODIFIED?handleContentsModified():handleError(err)}).always(function(){docToSave.isSaving=!1})}return docToSave.isDirty?(docToSave.isSaving=!0,docToSave.keepChangesTime?docToSave.file.stat(function(err,stat){err||docToSave.keepChangesTime!==stat.mtime.getTime()||(force=!0),trySave()}):trySave()):result.resolve(file),result.always(function(){MainViewManager.focusActivePane()}),result.promise()}function _doRevert(doc,suppressError){var result=new $.Deferred;return FileUtils.readAsText(doc.file).done(function(text,readTimestamp){doc.refreshText(text,readTimestamp),result.resolve()}).fail(function(error){suppressError?result.resolve():showFileOpenError(error,doc.file.fullPath).done(function(){result.reject(error)})}),result.promise()}function dispatchAppQuitCancelledEvent(){exports.trigger(exports.APP_QUIT_CANCELLED)}function _doSaveAs(doc,settings){var origPath,saveAsDefaultPath,defaultName,result=new $.Deferred;function _doSaveAfterSaveDialog(path){var newFile;function _configureEditorAndResolve(){var editor=EditorManager.getActiveEditor();editor&&settings&&(editor.setSelections(settings.selections),editor.setScrollPos(settings.scrollPos.x,settings.scrollPos.y)),result.resolve(newFile)}function openNewFile(){var fileOpenPromise;if(FileViewController.getFileSelectionFocus()===FileViewController.PROJECT_MANAGER)fileOpenPromise=FileViewController.openAndSelectDocument(path,FileViewController.PROJECT_MANAGER);else{var info=MainViewManager.findInAllWorkingSets(doc.file.fullPath).shift();MainViewManager._removeView(info.paneId,doc.file,!0),fileOpenPromise=handleFileAddToWorkingSetAndOpen({fullPath:path,paneId:info.paneId,index:info.index,forceRedraw:!0})}fileOpenPromise.always(function(){_configureEditorAndResolve()})}if(path!==origPath){if(doc.isSaving=!0,doc.file._encoding&&"UTF-8"!==doc.file._encoding){const encoding=PreferencesManager.getViewState("encoding",PreferencesManager.STATE_PROJECT_CONTEXT);encoding[path]=doc.file._encoding,PreferencesManager.setViewState("encoding",encoding,PreferencesManager.STATE_PROJECT_CONTEXT)}(newFile=FileSystem.getFileForPath(path))._encoding=doc.file._encoding,FileUtils.writeText(newFile,doc.getText(!0),!0).done(function(){doc.isDirty&&!doc.isUntitled()?_doRevert(doc).always(openNewFile):openNewFile(),_fileSavedMetrics(doc)}).fail(function(error){_showSaveFileError(error,path).done(function(){result.reject(error)})}).always(function(){doc.isSaving=!1})}else doSave(doc).then(result.resolve,result.reject)}if(doc){if(origPath=doc.file.fullPath,doc.isUntitled()){var info=MainViewManager.findInAllWorkingSets(origPath).shift();info&&MainViewManager._open(info.paneId,doc.file),saveAsDefaultPath=ProjectManager.getProjectRoot().fullPath}else saveAsDefaultPath=FileUtils.getDirectoryPath(origPath);var file;if(defaultName=FileUtils.getBaseName(origPath),FileSystem.getFileForPath(origPath)instanceof InMemoryFile){var language=LanguageManager.getLanguageForPath(origPath);if(language){var fileExtensions=language.getFileExtensions();fileExtensions&&fileExtensions.length>0&&(defaultName+="."+fileExtensions[0])}}FileSystem.showSaveDialog(Strings.SAVE_FILE_AS,saveAsDefaultPath,defaultName,function(err,selectedPath){err?result.reject(err):selectedPath?_doSaveAfterSaveDialog(selectedPath):(dispatchAppQuitCancelledEvent(),result.reject(USER_CANCELED))})}else result.reject();return result.promise()}function handleFileSave(commandData){var activeEditor=EditorManager.getActiveEditor(),activeDoc=activeEditor&&activeEditor.document,doc=commandData&&commandData.doc||activeDoc,settings;return doc&&!doc.isSaving?doc.isUntitled()?(doc===activeDoc&&(settings={selections:activeEditor.getSelections(),scrollPos:activeEditor.getScrollPos()}),_doSaveAs(doc,settings)):doSave(doc):$.Deferred().reject().promise()}function _saveFileList(fileList){var userCanceled=!1,filesAfterSave=[];return Async.doSequentially(fileList,function(file){if(userCanceled)return(new $.Deferred).reject().promise();var doc=DocumentManager.getOpenDocumentForPath(file.fullPath);if(doc){var savePromise=handleFileSave({doc:doc});return savePromise.done(function(newFile){filesAfterSave.push(newFile)}).fail(function(error){error===USER_CANCELED&&(userCanceled=!0)}),savePromise}return filesAfterSave.push(file),(new $.Deferred).resolve().promise()},!1).then(function(){return filesAfterSave})}function saveAll(){return _saveFileList(MainViewManager.getWorkingSet(MainViewManager.ALL_PANES))}function handleFileSaveAll(){return saveAll()}function handleFileClose(commandData){var file,promptOnly,_forceClose,_spawnedRequest,paneId=MainViewManager.ACTIVE_PANE;function doClose(file){promptOnly||(MainViewManager._close(paneId,file),_fileClosed(file))}commandData&&(file=commandData.file,promptOnly=commandData.promptOnly,_forceClose=commandData._forceClose,paneId=commandData.paneId||paneId,_spawnedRequest=commandData.spawnedRequest||!1);var result=new $.Deferred,promise=result.promise();if(file||(file=MainViewManager.getCurrentlyViewedFile(MainViewManager.ACTIVE_PANE)),!file)return result.resolve(),promise;var doc=DocumentManager.getOpenDocumentForPath(file.fullPath);if(doc&&doc.isDirty&&!_forceClose&&(MainViewManager.isExclusiveToPane(doc.file,paneId)||_spawnedRequest)){var filename=FileUtils.getBaseName(doc.file.fullPath);Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_SAVE_CLOSE,Strings.SAVE_CLOSE_TITLE,StringUtils.format(Strings.SAVE_CLOSE_MESSAGE,StringUtils.breakableUrl(filename)),[{className:Dialogs.DIALOG_BTN_CLASS_LEFT,id:Dialogs.DIALOG_BTN_DONTSAVE,text:Strings.DONT_SAVE},{className:Dialogs.DIALOG_BTN_CLASS_NORMAL,id:Dialogs.DIALOG_BTN_CANCEL,text:Strings.CANCEL},{className:Dialogs.DIALOG_BTN_CLASS_PRIMARY,id:Dialogs.DIALOG_BTN_OK,text:Strings.SAVE}]).done(function(id){if(id===Dialogs.DIALOG_BTN_CANCEL)dispatchAppQuitCancelledEvent(),result.reject();else if(id===Dialogs.DIALOG_BTN_OK)handleFileSave({doc:doc}).done(function(newFile){doClose(newFile),result.resolve()}).fail(function(){result.reject()});else if(doClose(file),promptOnly)result.resolve();else{var suppressError=!DocumentManager.getOpenDocumentForPath(file.fullPath);_doRevert(doc,suppressError).then(result.resolve,result.reject)}}),result.always(function(){MainViewManager.focusActivePane()})}else doClose(file),MainViewManager.focusActivePane(),result.resolve();return promise}function _closeList(list,promptOnly,_forceClose){var result=new $.Deferred,unsavedDocs=[];if(list.forEach(function(file){var doc=DocumentManager.getOpenDocumentForPath(file.fullPath);doc&&doc.isDirty&&unsavedDocs.push(doc)}),0===unsavedDocs.length||_forceClose)result.resolve();else if(1===unsavedDocs.length){var fileCloseArgs;handleFileClose({file:unsavedDocs[0].file,promptOnly:promptOnly,spawnedRequest:!0}).done(function(){result.resolve()}).fail(function(){result.reject()})}else{var message=Strings.SAVE_CLOSE_MULTI_MESSAGE+FileUtils.makeDialogFileList(_.map(unsavedDocs,_shortTitleForDocument));Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_SAVE_CLOSE,Strings.SAVE_CLOSE_TITLE,message,[{className:Dialogs.DIALOG_BTN_CLASS_LEFT,id:Dialogs.DIALOG_BTN_DONTSAVE,text:Strings.DONT_SAVE},{className:Dialogs.DIALOG_BTN_CLASS_NORMAL,id:Dialogs.DIALOG_BTN_CANCEL,text:Strings.CANCEL},{className:Dialogs.DIALOG_BTN_CLASS_PRIMARY,id:Dialogs.DIALOG_BTN_OK,text:Strings.SAVE}]).done(function(id){id===Dialogs.DIALOG_BTN_CANCEL?(dispatchAppQuitCancelledEvent(),result.reject()):id===Dialogs.DIALOG_BTN_OK?_saveFileList(list).done(function(listAfterSave){result.resolve(listAfterSave)}).fail(function(){result.reject()}):result.resolve()})}return result.done(function(listAfterSave){listAfterSave=listAfterSave||list,promptOnly||MainViewManager._closeList(MainViewManager.ALL_PANES,listAfterSave)}),result.promise()}function handleFileCloseAll(commandData){return _closeList(MainViewManager.getAllOpenFiles(),commandData&&commandData.promptOnly,commandData&&commandData._forceClose)}function handleFileCloseList(commandData){return _closeList(commandData.fileList)}handleFileSaveAs=function(commandData){var doc=null,settings;if(commandData)doc=commandData.doc;else{var activeEditor=EditorManager.getActiveEditor();activeEditor&&(doc=activeEditor.document,(settings={}).selections=activeEditor.getSelections(),settings.scrollPos=activeEditor.getScrollPos())}return _doSaveAs(doc,settings)};var _windowGoingAway=!1;function _handleWindowGoingAway(commandData,postCloseHandler,failHandler){return _windowGoingAway?(new $.Deferred).reject().promise():(Metrics.flushMetrics(),CommandManager.execute(Commands.FILE_CLOSE_ALL,{promptOnly:!0}).done(function(){_windowGoingAway=!0;try{ProjectManager.trigger("beforeAppClose")}catch(ex){console.error(ex)}postCloseHandler()}).fail(function(){_windowGoingAway=!1,failHandler&&failHandler()}))}function handleAbortQuit(){_windowGoingAway=!1}function handleBeforeMenuPopup(){PopUpManager.trigger("beforeMenuPopup")}function handleFileCloseWindow(commandData){return _forceQuitIfNeeded(),_handleWindowGoingAway(commandData,function(closeSuccess){console.log("close success: ",closeSuccess),raceAgainstTime(window.PhStore.flushDB()).finally(()=>{raceAgainstTime(_safeNodeTerminate()).finally(()=>{Phoenix.app.closeWindow()})})},function(err){console.error("Quit failed! ",err)})}function newPhoenixWindow(cliArgsArray=null,cwd=null){let width=window.innerWidth,height=window.innerHeight;Phoenix.app.openNewPhoenixEditorWindow(width,height,cliArgsArray,cwd)}async function _fileExists(fullPath){try{const{entry:entry}=await FileSystem.resolveAsync(fullPath);return entry.isFile}catch(e){return!1}}async function _tryToOpenFile(absOrRelativePath,cwdIfRelativePath){try{let fileToOpen=absOrRelativePath,isFile;if(fileToOpen=cwdIfRelativePath?window.path.join(Phoenix.VFS.getTauriVirtualPath(cwdIfRelativePath),absOrRelativePath):Phoenix.VFS.getTauriVirtualPath(absOrRelativePath),await _fileExists(fileToOpen))return FileViewController.openFileAndAddToWorkingSet(fileToOpen),!0}catch(e){console.warn("Opening file failed ",absOrRelativePath,e)}return!1}async function _openFilesPassedInFromCLI(args=null,cwd=""){if(!args){const cliArgs=await Phoenix.app.getCommandLineArgs();args=cliArgs&&cliArgs.args,cwd=cliArgs&&cliArgs.cwd}if(!args||args.length<=1)return;let openCount=0;for(let i=1;i<args.length;i++){const fileArg=args[i];let isOpened=await _tryToOpenFile(fileArg);isOpened||await _tryToOpenFile(fileArg,cwd),isOpened&&openCount++}openCount&&(exports.trigger(_EVENT_OPEN_WITH_FILE_FROM_OS),_filesOpenedFromOsCount++,Metrics.countEvent(Metrics.EVENT_TYPE.PLATFORM,"openWith","file",openCount))}async function _safeCheckFileAndGetVirtualPath(absOrRelativePath,relativeToDir=null){try{let fileToCheck;if(relativeToDir){fileToCheck=window.path.join(Phoenix.VFS.getTauriVirtualPath(relativeToDir),absOrRelativePath);const fileExists=await _fileExists(fileToCheck);if(fileExists)return fileToCheck}else{fileToCheck=Phoenix.VFS.getTauriVirtualPath(absOrRelativePath);const fileExists=await _fileExists(fileToCheck);if(fileExists)return fileToCheck}}catch(e){console.warn("error opening folder at path",absOrRelativePath,relativeToDir)}return null}async function _singleInstanceHandler(args,cwd){const isPrimary=await Phoenix.app.isPrimaryDesktopPhoenixWindow();if(isPrimary){if(args.length>1){let fileToOpen=await _safeCheckFileAndGetVirtualPath(args[1]);if(fileToOpen||(fileToOpen=await _safeCheckFileAndGetVirtualPath(args[1],cwd)),fileToOpen)return Metrics.countEvent(Metrics.EVENT_TYPE.PLATFORM,"openWith","file"),await _openFilesPassedInFromCLI(args,cwd),void await Phoenix.app.focusWindow()}newPhoenixWindow(args,cwd)}}function handleFileNewWindow(){newPhoenixWindow([])}function handleFileRename(){var entry=ProjectManager.getContext();entry||(entry=MainViewManager.getCurrentlyViewedFile()),entry&&ProjectManager.renameItemInline(entry)}var _addedNavKeyHandler=!1;function detectDocumentNavEnd(event){event.keyCode===KeyEvent.DOM_VK_CONTROL&&(MainViewManager.endTraversal(),_addedNavKeyHandler=!1,$(window.document.body).off("keyup",detectDocumentNavEnd))}function goNextPrevDoc(inc,listOrder){var result;if(result=listOrder?MainViewManager.traverseToNextViewInListOrder(inc):MainViewManager.traverseToNextViewByMRU(inc)){var file=result.file,paneId=result.paneId;MainViewManager.beginTraversal(),CommandManager.execute(Commands.FILE_OPEN,{fullPath:file.fullPath,paneId:paneId}),_addedNavKeyHandler||(_addedNavKeyHandler=!0,$(window.document.body).keyup(detectDocumentNavEnd))}}function handleGoNextDoc(){goNextPrevDoc(1)}function handleGoPrevDoc(){goNextPrevDoc(-1)}function handleGoNextDocListOrder(){goNextPrevDoc(1,!0)}function handleGoPrevDocListOrder(){goNextPrevDoc(-1,!0)}function handleShowInTree(){let activeFile=MainViewManager.getCurrentlyViewedFile(MainViewManager.ACTIVE_PANE);activeFile&&ProjectManager.showInTree(activeFile)}function handleFileDelete(){var entry=ProjectManager.getSelectedItem();Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_EXT_DELETED,Strings.CONFIRM_DELETE_TITLE,StringUtils.format(entry.isFile?Strings.CONFIRM_FILE_DELETE:Strings.CONFIRM_FOLDER_DELETE,StringUtils.breakableUrl(ProjectManager.getProjectRelativePath(entry.fullPath))),[{className:Dialogs.DIALOG_BTN_CLASS_NORMAL,id:Dialogs.DIALOG_BTN_CANCEL,text:Strings.CANCEL},{className:Dialogs.DIALOG_BTN_CLASS_PRIMARY,id:Dialogs.DIALOG_BTN_OK,text:Strings.DELETE}]).done(function(id){id===Dialogs.DIALOG_BTN_OK&&ProjectManager.deleteItem(entry)})}function handleShowInOS(){var entry=ProjectManager.getSelectedItem();entry&&brackets.app.openPathInFileBrowser(entry.fullPath).catch(err=>console.error("Error showing '"+entry.fullPath+"' in OS folder:",err))}function raceAgainstTime(promise,timeout=2e3){const timeoutPromise=new Promise((_resolve,reject)=>{setTimeout(()=>{reject(new Error(`Timed out after ${timeout} seconds`))},timeout)});return Promise.race([promise,timeoutPromise])}function browserReload(href){if(!_isReloading)return _isReloading=!0,CommandManager.execute(Commands.FILE_CLOSE_ALL,{promptOnly:!0}).done(function(){try{ProjectManager.trigger("beforeAppClose")}catch(ex){console.error(ex)}_.forEach(Menus.getAllMenus(),function(value,key){Menus.removeMenu(key)});var fragment=href.indexOf("#");-1!==fragment&&(href=href.substr(0,fragment)),window.setTimeout(function(){raceAgainstTime(window.PhStore.flushDB()).finally(()=>{raceAgainstTime(_safeNodeTerminate(),4e3).finally(()=>{window.location.href=href})})},1e3)}).fail(function(){_isReloading=!1})}function handleReload(loadWithoutExtensions=!1,loadDevExtensionPath=[]){var href=window.location.href,params=new UrlParams;function _removeLoadDevExtensionPathParam(){params.get("loadDevExtensionPath")&&(params.remove("loadDevExtensionPath"),params.get(logger.loggingOptions.LOCAL_STORAGE_KEYS.LOG_TO_CONSOLE_KEY)&&params.remove(logger.loggingOptions.LOCAL_STORAGE_KEYS.LOG_TO_CONSOLE_KEY))}params.parse(),loadWithoutExtensions?(params.get("reloadWithoutUserExts")||params.put("reloadWithoutUserExts",!0),_removeLoadDevExtensionPathParam()):(params.get("reloadWithoutUserExts")&&params.remove("reloadWithoutUserExts"),loadDevExtensionPath&&loadDevExtensionPath.length?(params.put("loadDevExtensionPath",loadDevExtensionPath),params.put(logger.loggingOptions.LOCAL_STORAGE_KEYS.LOG_TO_CONSOLE_KEY,"true")):loadDevExtensionPath&&0===loadDevExtensionPath.length&&_removeLoadDevExtensionPathParam()),-1!==href.indexOf("?")&&(href=href.substring(0,href.indexOf("?"))),params.isEmpty()||(href+="?"+params.toString()),window.setTimeout(function(){browserReload(href)},100)}var handleReloadWithoutExts=_.partial(handleReload,!0);function attachBrowserUnloadHandler(){window.onbeforeunload=function(e){PreferencesManager.setViewState("windowClosingTime",(new Date).getTime()),_handleWindowGoingAway(null,closeSuccess=>{console.log("close success: ",closeSuccess)},closeFail=>{console.log("close fail: ",closeFail)});var openDocs=DocumentManager.getAllOpenDocuments();if(openDocs=openDocs.filter(function(doc){return doc&&doc.isDirty}),!_isReloading&&!_windowGoingAway)return openDocs.length>0?Strings.WINDOW_UNLOAD_WARNING_WITH_UNSAVED_CHANGES:Strings.WINDOW_UNLOAD_WARNING}}async function _safeFlushDB(){try{await window.PhStore.flushDB()}catch(e){console.error(e)}}let nodeTerminateDueToShutdown=!1,closeInProgress;async function _safeNodeTerminate(){nodeTerminateDueToShutdown=!0;try{await NodeConnector.terminateNode()}catch(e){console.error(e)}}window.nodeTerminationPromise&&window.nodeTerminationPromise.then(()=>{nodeTerminateDueToShutdown||(Metrics.countEvent(Metrics.EVENT_TYPE.NODEJS,"crash","dlgShown"),window.fs.forceUseNodeWSEndpoint(!1),Dialogs.showErrorDialog(Strings.ERROR_NODE_JS_CRASH_TITLE,Strings.ERROR_NODE_JS_CRASH_MESSAGE).done(()=>{handleReload()}))});let closeClickCounter=0;const CLOSE_TIMER_RESET_INTERVAL=4e3;let closeTimer=setTimeout(()=>{closeClickCounter=0,closeTimer=null},CLOSE_TIMER_RESET_INTERVAL),isTestWindow;function _forceQuitIfNeeded(){closeClickCounter++,closeTimer&&clearTimeout(closeTimer),closeTimer=setInterval(()=>{closeClickCounter=0,closeTimer=null},CLOSE_TIMER_RESET_INTERVAL),closeClickCounter>=2&&Phoenix.app.closeWindow(!0)}function attachTauriUnloadHandler(){window.__TAURI__.window.appWindow.onCloseRequested(event=>{_forceQuitIfNeeded(),closeInProgress?event.preventDefault():(closeInProgress=!0,PreferencesManager.setViewState("windowClosingTime",(new Date).getTime()),event.preventDefault(),_handleWindowGoingAway(null,closeSuccess=>{console.log("close success: ",closeSuccess),raceAgainstTime(_safeFlushDB()).finally(()=>{raceAgainstTime(_safeNodeTerminate()).finally(()=>{closeInProgress=!1,Phoenix.app.closeWindow()})})},closeFail=>{console.log("close fail: ",closeFail),closeInProgress=!1}))})}new window.URLSearchParams(window.location.search||"").get("testEnvironment")||(Phoenix.browser.isTauri?attachTauriUnloadHandler():attachBrowserUnloadHandler()),AppInit.htmlReady(function(){var params=new UrlParams,$icon=$("#toolbar-extension-manager"),$indicator=$("<div>"+Strings.STATUSBAR_USER_EXTENSIONS_DISABLED+"</div>");params.parse(),"true"===params.get("reloadWithoutUserExts")&&(CommandManager.get(Commands.FILE_EXTENSION_MANAGER).setEnabled(!1),$icon.css({display:"none"}),StatusBar.addIndicator("status-user-exts",$indicator,!0),console.log("Brackets reloaded with extensions disabled")),_$titleContainerToolbar=$("#titlebar"),_$titleWrapper=$(".title-wrapper",_$titleContainerToolbar),_$title=$(".title",_$titleWrapper),_$dirtydot=$(".dirty-dot",_$titleWrapper)});let firstProjectOpenHandled=!1;ProjectManager.on(ProjectManager.EVENT_AFTER_PROJECT_OPEN,()=>{firstProjectOpenHandled||(firstProjectOpenHandled=!0,Phoenix.app.setSingleInstanceCLIArgsHandler(_singleInstanceHandler),_openFilesPassedInFromCLI())}),exports._parseDecoratedPath=_parseDecoratedPath;var quitString=Strings.CMD_QUIT,showInOS=Strings.CMD_SHOW_IN_OS;"win"===brackets.platform?(quitString=Strings.CMD_EXIT,showInOS=Strings.CMD_SHOW_IN_EXPLORER):"mac"===brackets.platform&&(showInOS=Strings.CMD_SHOW_IN_FINDER),exports._EVENT_OPEN_WITH_FILE_FROM_OS=_EVENT_OPEN_WITH_FILE_FROM_OS,exports._isOpenWithFileFromOS=function(){return!!_filesOpenedFromOsCount},exports.showFileOpenError=showFileOpenError,exports.APP_QUIT_CANCELLED="appQuitCancelled",CommandManager.register(Strings.CMD_ADD_TO_WORKING_SET,Commands.FILE_ADD_TO_WORKING_SET,handleFileAddToWorkingSet),CommandManager.register(Strings.CMD_FILE_OPEN,Commands.FILE_OPEN,handleDocumentOpen),CommandManager.register(Strings.CMD_ADD_TO_WORKING_SET,Commands.CMD_ADD_TO_WORKINGSET_AND_OPEN,handleFileAddToWorkingSetAndOpen),CommandManager.register(Strings.CMD_FILE_OPEN,Commands.CMD_OPEN,handleFileOpen),CommandManager.register(Strings.CMD_FILE_NEW_UNTITLED,Commands.FILE_NEW_UNTITLED,handleFileNew),CommandManager.register(Strings.CMD_FILE_NEW,Commands.FILE_NEW,handleFileNewInProject),CommandManager.register(Strings.CMD_FILE_NEW_FOLDER,Commands.FILE_NEW_FOLDER,handleNewFolderInProject),CommandManager.register(Strings.CMD_FILE_SAVE,Commands.FILE_SAVE,handleFileSave),CommandManager.register(Strings.CMD_FILE_SAVE_ALL,Commands.FILE_SAVE_ALL,handleFileSaveAll),CommandManager.register(Strings.CMD_FILE_SAVE_AS,Commands.FILE_SAVE_AS,handleFileSaveAs),CommandManager.register(Strings.CMD_FILE_RENAME,Commands.FILE_RENAME,handleFileRename),CommandManager.register(Strings.CMD_FILE_DELETE,Commands.FILE_DELETE,handleFileDelete),CommandManager.register(Strings.CMD_FILE_CLOSE,Commands.FILE_CLOSE,handleFileClose),CommandManager.register(Strings.CMD_FILE_CLOSE_ALL,Commands.FILE_CLOSE_ALL,handleFileCloseAll),CommandManager.register(Strings.CMD_FILE_CLOSE_LIST,Commands.FILE_CLOSE_LIST,handleFileCloseList),CommandManager.register(Strings.CMD_NEXT_DOC,Commands.NAVIGATE_NEXT_DOC,handleGoNextDoc),CommandManager.register(Strings.CMD_PREV_DOC,Commands.NAVIGATE_PREV_DOC,handleGoPrevDoc),CommandManager.register(Strings.CMD_NEXT_DOC_LIST_ORDER,Commands.NAVIGATE_NEXT_DOC_LIST_ORDER,handleGoNextDocListOrder),CommandManager.register(Strings.CMD_PREV_DOC_LIST_ORDER,Commands.NAVIGATE_PREV_DOC_LIST_ORDER,handleGoPrevDocListOrder),CommandManager.register(showInOS,Commands.NAVIGATE_SHOW_IN_OS,handleShowInOS),CommandManager.register(Strings.CMD_NEW_BRACKETS_WINDOW,Commands.FILE_NEW_WINDOW,handleFileNewWindow),CommandManager.register(quitString,Commands.FILE_QUIT,handleFileCloseWindow),CommandManager.register(Strings.CMD_SHOW_IN_TREE,Commands.NAVIGATE_SHOW_IN_FILE_TREE,handleShowInTree),CommandManager.registerInternal(Commands.APP_ABORT_QUIT,handleAbortQuit),CommandManager.registerInternal(Commands.APP_BEFORE_MENUPOPUP,handleBeforeMenuPopup),CommandManager.registerInternal(Commands.FILE_CLOSE_WINDOW,handleFileCloseWindow),CommandManager.registerInternal(Commands.APP_RELOAD,handleReload),CommandManager.registerInternal(Commands.APP_RELOAD_WITHOUT_EXTS,handleReloadWithoutExts),ProjectManager.on("projectOpen",()=>{alwaysOverwriteTillProjectSwitch=!1,_updateTitle()}),DocumentManager.on("dirtyFlagChange",handleDirtyChange),DocumentManager.on("fileNameChange",handleCurrentFileChange),MainViewManager.on("currentFileChange",handleCurrentFileChange),ProjectManager.on("beforeProjectClose",function(){_nextUntitledIndexToUse=1})});
//# sourceMappingURL=DocumentCommandHandlers.js.map
