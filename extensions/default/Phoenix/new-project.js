define(function(require,exports,module){const Dialogs=brackets.getModule("widgets/Dialogs"),Mustache=brackets.getModule("thirdparty/mustache/mustache"),newProjectTemplate=require("text!html/new-project-template.html"),Strings=brackets.getModule("strings"),StringUtils=brackets.getModule("utils/StringUtils"),ExtensionInterface=brackets.getModule("utils/ExtensionInterface"),CommandManager=brackets.getModule("command/CommandManager"),Commands=brackets.getModule("command/Commands"),Menus=brackets.getModule("command/Menus"),Metrics=brackets.getModule("utils/Metrics"),DefaultDialogs=brackets.getModule("widgets/DefaultDialogs"),FileSystem=brackets.getModule("filesystem/FileSystem"),FileUtils=brackets.getModule("file/FileUtils"),ProjectManager=brackets.getModule("project/ProjectManager"),EventDispatcher=brackets.getModule("utils/EventDispatcher"),createProjectDialogue=require("text!html/create-project-dialogue.html"),replaceProjectDialogue=require("text!html/replace-project-dialogue.html"),replaceKeepProjectDialogue=require("text!html/replace-keep-project-dialogue.html"),guidedTour=require("guided-tour"),utils=require("utils");EventDispatcher.makeEventDispatcher(exports);const NEW_PROJECT_INTERFACE="Extn.Phoenix.newProject",MAX_DEDUPE_COUNT=1e4;ExtensionInterface.registerExtensionInterface(NEW_PROJECT_INTERFACE,exports);let newProjectDialogueObj,createProjectDialogueObj,downloadCancelled=!1;function _showNewProjectDialogue(){if(window.testEnvironment)return;let templateVars={Strings:Strings,newProjectURL:`${window.Phoenix.baseURL}assets/new-project/code-editor.html`},dialogueContents=Mustache.render(newProjectTemplate,templateVars);newProjectDialogueObj=Dialogs.showModalDialogUsingTemplate(dialogueContents,!0),setTimeout(()=>{document.getElementById("newProjectFrame").contentWindow.focus()},100),Metrics.countEvent(Metrics.EVENT_TYPE.NEW_PROJECT,"dialogue","open")}function _addMenuEntries(){CommandManager.register(Strings.CMD_PROJECT_NEW,Commands.FILE_NEW_PROJECT,_showNewProjectDialogue);const fileMenu=Menus.getMenu(Menus.AppMenuBar.FILE_MENU);fileMenu.addMenuItem(Commands.FILE_NEW_PROJECT,"Alt-Shift-N",Menus.AFTER,Commands.FILE_NEW)}function closeDialogue(){Metrics.countEvent(Metrics.EVENT_TYPE.NEW_PROJECT,"dialogue","open"),newProjectDialogueObj.close(),exports.trigger(exports.EVENT_NEW_PROJECT_DIALOGUE_CLOSED),guidedTour.startTourIfNeeded()}function showErrorDialogue(title,message){Dialogs.showModalDialog(DefaultDialogs.DIALOG_ID_ERROR,title,message)}function openFolder(){CommandManager.execute(Commands.FILE_OPEN_FOLDER).then(closeDialogue)}function init(){_addMenuEntries(),_showNewProjectDialogue()}function _showProjectErrorDialogue(desc,projectPath,err){let message=StringUtils.format(desc,projectPath,err);showErrorDialogue(Strings.ERROR_LOADING_PROJECT,message)}function _showReplaceProjectConfirmDialogue(projectPath){let message=StringUtils.format(Strings.DIRECTORY_REPLACE_MESSAGE,projectPath),templateVars={Strings:Strings,MESSAGE:message};return Dialogs.showModalDialogUsingTemplate(Mustache.render(replaceProjectDialogue,templateVars))}function _showReplaceKeepProjectConfirmDialogue(projectPath){let message=StringUtils.format(Strings.DIRECTORY_REPLACE_MESSAGE,projectPath),templateVars={Strings:Strings,MESSAGE:message};return Dialogs.showModalDialogUsingTemplate(Mustache.render(replaceKeepProjectDialogue,templateVars))}function _checkIfPathIsWritable(path){return new Promise((resolve,reject)=>{let file=FileSystem.getFileForPath(`${path}/.brackets.json`);FileUtils.writeText(file,"{}",!0).done(resolve).fail(reject)})}async function _validateProjectFolder(projectPath){return new Promise((resolve,reject)=>{let dir=FileSystem.getDirectoryForPath(projectPath),displayPath=projectPath.replace(Phoenix.VFS.getMountDir(),"");dir||(_showProjectErrorDialogue(Strings.REQUEST_NATIVE_FILE_SYSTEM_ERROR,displayPath,Strings.NOT_FOUND_ERR),reject()),dir.getContents(function(err,contents){if(err)return _showProjectErrorDialogue(Strings.READ_DIRECTORY_ENTRIES_ERROR,displayPath,Strings.NOT_FOUND_ERR),void reject();function _resolveIfWritable(){_checkIfPathIsWritable(projectPath).then(resolve).catch(reject)}contents.length>0?_showReplaceProjectConfirmDialogue(displayPath).done(function(id){id!==Dialogs.DIALOG_BTN_OK?reject():_resolveIfWritable()}):_resolveIfWritable()})})}async function _findFreeFolderName(basePath){return new Promise(async(resolve,reject)=>{try{for(let i=0;i<MAX_DEDUPE_COUNT;i++){let newPath=`${basePath}-${i}`,exists;if(!await window.Phoenix.VFS.existsAsync(newPath))return await window.Phoenix.VFS.ensureExistsDirAsync(newPath),void resolve(newPath)}reject()}catch(e){reject(e)}})}async function alreadyExists(suggestedProjectName){let projectPath=`${ProjectManager.getLocalProjectsPath()}${suggestedProjectName}`;return window.Phoenix.VFS.existsAsync(projectPath)}async function _getSuggestedProjectDir(suggestedProjectName){return new Promise(async(resolve,reject)=>{try{let projectPath=`${ProjectManager.getLocalProjectsPath()}${suggestedProjectName}`,exists;if(!await window.Phoenix.VFS.existsAsync(projectPath))return void resolve(projectPath);_showReplaceKeepProjectConfirmDialogue(suggestedProjectName).done(function(id){id!==Dialogs.DIALOG_BTN_OK?id!==Dialogs.DIALOG_BTN_CANCEL?_findFreeFolderName(projectPath).then(projectPath=>resolve(projectPath)).catch(reject):reject():resolve(projectPath)})}catch(e){reject(e)}})}function _showCreateProjectDialogue(title,message){let templateVars={Strings:Strings,TITLE:title,MESSAGE:message};return createProjectDialogueObj=Dialogs.showModalDialogUsingTemplate(Mustache.render(createProjectDialogue,templateVars))}function _closeCreateProjectDialogue(){createProjectDialogueObj.close()}function _updateCreateProjectDialogueMessage(message,title){let el=document.getElementById("new-prj-msg-dlg-message");el&&(el.textContent=message),(el=document.getElementById("new-prj-msg-dlg-title"))&&title&&(el.textContent=title)}function _unzipProject(data,projectPath,flattenFirstLevelInZip,progressCb){return new Promise((resolve,reject)=>{_updateCreateProjectDialogueMessage(Strings.UNZIP_IN_PROGRESS,Strings.DOWNLOAD_COMPLETE),utils.unzipFileToLocation(data,projectPath,flattenFirstLevelInZip,progressCb).then(resolve).catch(reject)})}async function downloadAndOpenProject(downloadURL,projectPath,suggestedProjectName,flattenFirstLevelInZip){return new Promise(async(resolve,reject)=>{try{projectPath?await _validateProjectFolder(projectPath):projectPath=await _getSuggestedProjectDir(suggestedProjectName),console.log(`downloadAndOpenProject ${suggestedProjectName} from URL: ${downloadURL} to: ${projectPath}`),downloadCancelled=!1,_showCreateProjectDialogue(Strings.SETTING_UP_PROJECT,Strings.DOWNLOADING).done(function(id){id===Dialogs.DIALOG_BTN_CANCEL&&(downloadCancelled=!0)}),window.JSZipUtils.getBinaryContent(downloadURL,{callback:async function(err,data){if(downloadCancelled)reject();else if(err)console.error("could not load phoenix default project from zip file!",err),_closeCreateProjectDialogue(),showErrorDialogue(Strings.DOWNLOAD_FAILED,Strings.DOWNLOAD_FAILED_MESSAGE),reject();else{function _progressCB(done,total){let message;return _updateCreateProjectDialogueMessage(StringUtils.format(Strings.EXTRACTING_FILES_PROGRESS,done,total)),!downloadCancelled}_unzipProject(data,projectPath,flattenFirstLevelInZip,_progressCB).then(()=>{_closeCreateProjectDialogue(),ProjectManager.openProject(projectPath).then(resolve).fail(reject),console.log("Project Setup complete: ",projectPath)}).catch(()=>{_closeCreateProjectDialogue(),showErrorDialogue(Strings.ERROR_LOADING_PROJECT,Strings.UNZIP_FAILED),reject()})}},progress:function(status){status.percent>0&&_updateCreateProjectDialogueMessage(`${Strings.DOWNLOADING} ${Math.round(status.percent)}%`)},abortCheck:function(){return downloadCancelled}})}catch(e){reject(e)}})}function showFolderSelect(){return new Promise((resolve,reject)=>{FileSystem.showOpenDialog(!1,!0,Strings.CHOOSE_FOLDER,"",null,function(err,files){err||1!==files.length?reject():resolve(files[0])})})}exports.init=init,exports.openFolder=openFolder,exports.closeDialogue=closeDialogue,exports.downloadAndOpenProject=downloadAndOpenProject,exports.showFolderSelect=showFolderSelect,exports.showErrorDialogue=showErrorDialogue,exports.alreadyExists=alreadyExists,exports.Metrics=Metrics,exports.EVENT_NEW_PROJECT_DIALOGUE_CLOSED="newProjectDlgClosed",exports.getWelcomeProjectPath=ProjectManager.getWelcomeProjectPath,exports.getExploreProjectPath=ProjectManager.getExploreProjectPath,exports.getLocalProjectsPath=ProjectManager.getLocalProjectsPath,exports.getMountDir=Phoenix.VFS.getMountDir});
//# sourceMappingURL=new-project.js.map
