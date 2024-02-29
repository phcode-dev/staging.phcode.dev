define(function(require,exports,module){var _=require("thirdparty/lodash"),AppInit=require("utils/AppInit"),EventDispatcher=require("utils/EventDispatcher"),DocumentModule=require("document/Document"),DeprecationWarning=require("utils/DeprecationWarning"),MainViewManager=require("view/MainViewManager"),MainViewFactory=require("view/MainViewFactory"),FileSyncManager=require("project/FileSyncManager"),FileSystem=require("filesystem/FileSystem"),PreferencesManager=require("preferences/PreferencesManager"),FileUtils=require("file/FileUtils"),InMemoryFile=require("document/InMemoryFile"),CommandManager=require("command/CommandManager"),Commands=require("command/Commands"),PerfUtils=require("utils/PerfUtils"),LanguageManager=require("language/LanguageManager"),ProjectManager=require("project/ProjectManager"),Strings=require("strings");const EVENT_AFTER_DOCUMENT_CREATE="afterDocumentCreate",EVENT_PATH_DELETED="pathDeleted",EVENT_FILE_NAME_CHANGE="fileNameChange",EVENT_BEFORE_DOCUMENT_DELETE="beforeDocumentDelete",EVENT_DOCUMENT_REFRESHED="documentRefreshed",EVENT_DOCUMENT_CHANGE="documentChange",EVENT_DIRTY_FLAG_CHANGED="dirtyFlagChange";var _untitledDocumentPath="/_brackets_"+_.random(1e7,99999999),_openDocuments={};function getOpenDocumentForPath(fullPath){var id;for(id in _openDocuments)if(_openDocuments.hasOwnProperty(id)&&_openDocuments[id].file.fullPath===fullPath)return _openDocuments[id];return null}function getCurrentDocument(){var file=MainViewManager.getCurrentlyViewedFile(MainViewManager.ACTIVE_PANE);return file?getOpenDocumentForPath(file.fullPath):null}function getWorkingSet(){return DeprecationWarning.deprecationWarning("Use MainViewManager.getWorkingSet() instead of DocumentManager.getWorkingSet()",!0),MainViewManager.getWorkingSet(MainViewManager.ALL_PANES).filter(function(file){return!MainViewFactory.findSuitableFactoryForPath(file.fullPath)})}function findInWorkingSet(fullPath){return DeprecationWarning.deprecationWarning("Use MainViewManager.findInWorkingSet() instead of DocumentManager.findInWorkingSet()",!0),MainViewManager.findInWorkingSet(MainViewManager.ACTIVE_PANE,fullPath)}function getAllOpenDocuments(){var result=[],id;for(id in _openDocuments)_openDocuments.hasOwnProperty(id)&&result.push(_openDocuments[id]);return result}function addToWorkingSet(file,index,forceRedraw){DeprecationWarning.deprecationWarning("Use MainViewManager.addToWorkingSet() instead of DocumentManager.addToWorkingSet()",!0),MainViewManager.addToWorkingSet(MainViewManager.ACTIVE_PANE,file,index,forceRedraw)}function addListToWorkingSet(fileList){DeprecationWarning.deprecationWarning("Use MainViewManager.addListToWorkingSet() instead of DocumentManager.addListToWorkingSet()",!0),MainViewManager.addListToWorkingSet(MainViewManager.ACTIVE_PANE,fileList)}function removeListFromWorkingSet(list){DeprecationWarning.deprecationWarning("Use CommandManager.execute(Commands.FILE_CLOSE_LIST, {PaneId: MainViewManager.ALL_PANES, fileList: list}) instead of DocumentManager.removeListFromWorkingSet()",!0),CommandManager.execute(Commands.FILE_CLOSE_LIST,{PaneId:MainViewManager.ALL_PANES,fileList:list})}function closeAll(){DeprecationWarning.deprecationWarning("Use CommandManager.execute(Commands.FILE_CLOSE_ALL,{PaneId: MainViewManager.ALL_PANES}) instead of DocumentManager.closeAll()",!0),CommandManager.execute(Commands.FILE_CLOSE_ALL,{PaneId:MainViewManager.ALL_PANES})}function closeFullEditor(file){DeprecationWarning.deprecationWarning("Use CommandManager.execute(Commands.FILE_CLOSE, {File: file} instead of DocumentManager.closeFullEditor()",!0),CommandManager.execute(Commands.FILE_CLOSE,{File:file})}function setCurrentDocument(doc){DeprecationWarning.deprecationWarning("Use CommandManager.execute(Commands.CMD_OPEN) instead of DocumentManager.setCurrentDocument()",!0),CommandManager.execute(Commands.CMD_OPEN,{fullPath:doc.file.fullPath})}function beginDocumentNavigation(){DeprecationWarning.deprecationWarning("Use MainViewManager.beginTraversal() instead of DocumentManager.beginDocumentNavigation()",!0),MainViewManager.beginTraversal()}function finalizeDocumentNavigation(){DeprecationWarning.deprecationWarning("Use MainViewManager.endTraversal() instead of DocumentManager.finalizeDocumentNavigation()",!0),MainViewManager.endTraversal()}function getNextPrevFile(inc){DeprecationWarning.deprecationWarning("Use MainViewManager.traverseToNextViewByMRU() instead of DocumentManager.getNextPrevFile()",!0);var result=MainViewManager.traverseToNextViewByMRU(inc);return result?result.file:null}function _gcDocuments(){getAllOpenDocuments().forEach(function(doc){1===doc._refCount&&doc._masterEditor&&MainViewManager._destroyEditorIfNotNeeded(doc)})}function getDocumentForPath(fullPath,fileObj){var doc=getOpenDocumentForPath(fullPath);if(doc)return(new $.Deferred).resolve(doc).promise();var result=new $.Deferred,promise=result.promise();if(0===fullPath.indexOf(_untitledDocumentPath))return result.resolve(null),promise;var file=fileObj||FileSystem.getFileForPath(fullPath),pendingPromise=getDocumentForPath._pendingDocumentPromises[file.id];if(pendingPromise)return pendingPromise;getDocumentForPath._pendingDocumentPromises[file.id]=promise;var perfTimerName=PerfUtils.markStart("getDocumentForPath:\t"+fullPath);return result.done(function(){PerfUtils.addMeasurement(perfTimerName)}).fail(function(){PerfUtils.finalizeMeasurement(perfTimerName)}),FileUtils.readAsText(file).always(function(){delete getDocumentForPath._pendingDocumentPromises[file.id]}).done(function(rawText,readTimestamp){doc=new DocumentModule.Document(file,readTimestamp,rawText),_gcDocuments(),result.resolve(doc)}).fail(function(fileError){result.reject(fileError)}),promise}function getDocumentText(file,checkLineEndings){var result=new $.Deferred,doc=getOpenDocumentForPath(file.fullPath);return doc?result.resolve(doc.getText(),doc.diskTimestamp,checkLineEndings?doc._lineEndings:null):file.read(function(err,contents,encoding,stat){if(err)result.reject(err);else{var originalLineEndings=checkLineEndings?FileUtils.sniffLineEndings(contents):null;contents=DocumentModule.Document.normalizeText(contents),result.resolve(contents,stat.mtime,originalLineEndings)}}),result.promise()}function createUntitledDocument(counter,fileExt){var filename=Strings.UNTITLED+"-"+counter+fileExt,fullPath=_untitledDocumentPath+"/"+filename,now=new Date,file=new InMemoryFile(fullPath,FileSystem);return FileSystem.addEntryForPathIfRequired(file,fullPath),new DocumentModule.Document(file,now,"")}function notifyFileDeleted(file){exports.trigger(EVENT_PATH_DELETED,file.fullPath);var doc=getOpenDocumentForPath(file.fullPath);doc&&doc.trigger("deleted"),doc&&doc._refCount>0&&console.warn("Deleted "+file.fullPath+" Document still has "+doc._refCount+" references. Did someone addRef() without listening for 'deleted'?")}function notifyPathDeleted(fullPath){FileSyncManager.syncOpenDocuments(Strings.FILE_DELETED_TITLE);const encoding=PreferencesManager.getViewState("encoding",PreferencesManager.STATE_PROJECT_CONTEXT);delete encoding[fullPath],PreferencesManager.setViewState("encoding",encoding,PreferencesManager.STATE_PROJECT_CONTEXT),getOpenDocumentForPath(fullPath)||MainViewManager.findInAllWorkingSets(fullPath).length||exports.trigger(EVENT_PATH_DELETED,fullPath)}function notifyPathNameChanged(oldName,newName){_.forEach(_openDocuments,function(doc){doc._notifyFilePathChanged()}),exports.trigger(EVENT_FILE_NAME_CHANGE,oldName,newName)}function _handleLanguageAdded(){_.forEach(_openDocuments,function(doc){doc.getLanguage().isFallbackLanguage()&&doc._updateLanguage()})}function _handleLanguageModified(event,language){_.forEach(_openDocuments,function(doc){var docLanguage=doc.getLanguage();(docLanguage===language||docLanguage.isFallbackLanguage())&&doc._updateLanguage()})}getDocumentForPath._pendingDocumentPromises={},DocumentModule.on("_afterDocumentCreate",function(event,doc){if(_openDocuments[doc.file.id])return console.error("Document for this path already in _openDocuments!"),!0;_openDocuments[doc.file.id]=doc,exports.trigger("afterDocumentCreate",doc)}).on("_beforeDocumentDelete",function(event,doc){if(!_openDocuments[doc.file.id])return console.error("Document with references was not in _openDocuments!"),!0;exports.trigger("beforeDocumentDelete",doc),delete _openDocuments[doc.file.id]}).on("_documentRefreshed",function(event,doc){exports.trigger("documentRefreshed",doc)}).on("documentChange",function(event,doc,changelist){exports.trigger("documentChange",doc,changelist)}).on("_dirtyFlagChange",function(event,doc){doc.trigger("_dirtyFlagChange",doc),exports.trigger("dirtyFlagChange",doc),doc.isDirty&&(MainViewManager.addToWorkingSet(MainViewManager.ACTIVE_PANE,doc.file),MainViewManager.getCurrentlyViewedFile()||-1===MainViewManager.findInWorkingSet(MainViewManager.ACTIVE_PANE,doc.file.fullPath)||CommandManager.execute(Commands.FILE_OPEN,{fullPath:doc.file.fullPath}))}).on("_documentSaved",function(event,doc){exports.trigger("documentSaved",doc)}),EventDispatcher.makeEventDispatcher(exports),EventDispatcher.markDeprecated(exports,"currentDocumentChange","MainViewManager.currentFileChange"),EventDispatcher.markDeprecated(exports,"workingSetAdd","MainViewManager.workingSetAdd"),EventDispatcher.markDeprecated(exports,"workingSetAddList","MainViewManager.workingSetAddList"),EventDispatcher.markDeprecated(exports,"workingSetRemove","MainViewManager.workingSetRemove"),EventDispatcher.markDeprecated(exports,"workingSetRemoveList","MainViewManager.workingSetRemoveList"),EventDispatcher.markDeprecated(exports,"workingSetSort","MainViewManager.workingSetSort"),AppInit.extensionsLoaded(function(){function _proxyDeprecatedEvent(eventName){DeprecationWarning.deprecateEvent(exports,MainViewManager,eventName,eventName,"DocumentManager."+eventName,"MainViewManager."+eventName)}_proxyDeprecatedEvent("workingSetAdd"),_proxyDeprecatedEvent("workingSetAddList"),_proxyDeprecatedEvent("workingSetRemove"),_proxyDeprecatedEvent("workingSetRemoveList"),_proxyDeprecatedEvent("workingSetSort")}),exports.on("documentSaved",function(e,doc){PreferencesManager.fileChanged(doc.file.fullPath)}),MainViewManager.on("currentFileChange",function(e,newFile,newPaneId,oldFile){var newDoc=null,oldDoc=null;newFile&&(newDoc=getOpenDocumentForPath(newFile.fullPath)),oldFile&&(oldDoc=getOpenDocumentForPath(oldFile.fullPath)),oldDoc&&oldDoc.off("languageChanged.DocumentManager"),newDoc?(PreferencesManager._setCurrentLanguage(newDoc.getLanguage().getId()),newDoc.off("languageChanged.DocumentManager"),newDoc.on("languageChanged.DocumentManager",function(e,oldLang,newLang){PreferencesManager._setCurrentLanguage(newLang.getId()),exports.trigger("currentDocumentLanguageChanged",[oldLang,newLang])})):PreferencesManager._setCurrentLanguage(void 0),newDoc!==oldDoc&&exports.trigger("currentDocumentChange",newDoc,oldDoc)}),exports.getWorkingSet=getWorkingSet,exports.findInWorkingSet=findInWorkingSet,exports.addToWorkingSet=addToWorkingSet,exports.addListToWorkingSet=addListToWorkingSet,exports.removeListFromWorkingSet=removeListFromWorkingSet,exports.getCurrentDocument=getCurrentDocument,exports.beginDocumentNavigation=beginDocumentNavigation,exports.finalizeDocumentNavigation=finalizeDocumentNavigation,exports.getNextPrevFile=getNextPrevFile,exports.setCurrentDocument=setCurrentDocument,exports.closeFullEditor=closeFullEditor,exports.closeAll=closeAll,exports.Document=DocumentModule.Document,exports.getDocumentForPath=getDocumentForPath,exports.getOpenDocumentForPath=getOpenDocumentForPath,exports.getDocumentText=getDocumentText,exports.createUntitledDocument=createUntitledDocument,exports.getAllOpenDocuments=getAllOpenDocuments,exports.EVENT_AFTER_DOCUMENT_CREATE="afterDocumentCreate",exports.EVENT_PATH_DELETED=EVENT_PATH_DELETED,exports.EVENT_FILE_NAME_CHANGE=EVENT_FILE_NAME_CHANGE,exports.EVENT_BEFORE_DOCUMENT_DELETE="beforeDocumentDelete",exports.EVENT_DOCUMENT_REFRESHED="documentRefreshed",exports.EVENT_DOCUMENT_CHANGE="documentChange",exports.EVENT_DIRTY_FLAG_CHANGED="dirtyFlagChange",exports.notifyPathNameChanged=notifyPathNameChanged,exports.notifyPathDeleted=notifyPathDeleted,exports.notifyFileDeleted=notifyFileDeleted,PerfUtils.createPerfMeasurement("DOCUMENT_MANAGER_GET_DOCUMENT_FOR_PATH","DocumentManager.getDocumentForPath()"),LanguageManager.on("languageAdded",_handleLanguageAdded),LanguageManager.on("languageModified",_handleLanguageModified)});
//# sourceMappingURL=DocumentManager.js.map
