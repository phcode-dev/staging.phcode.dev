define(function(require,exports,module){var Dialogs=require("widgets/Dialogs"),File=require("filesystem/File"),StringUtils=require("utils/StringUtils"),Strings=require("strings"),FileSystem=require("filesystem/FileSystem"),KeyEvent=require("utils/KeyEvent"),Package=require("extensibility/Package"),NativeApp=require("utils/NativeApp"),InstallDialogTemplate=require("text!htmlContent/install-extension-dialog.html"),Mustache=require("thirdparty/mustache/mustache"),ExtensionDownloader=require("extensibility/ExtensionDownloader"),STATE_CLOSED=0,STATE_START=1,STATE_VALID_URL=2,STATE_INSTALLING=3,STATE_INSTALLED=4,STATE_INSTALL_FAILED=5,STATE_CANCELING_INSTALL=6,STATE_CANCELING_HUNG=7,STATE_INSTALL_CANCELED=8,STATE_ALREADY_INSTALLED=9,STATE_OVERWRITE_CONFIRMED=10,STATE_NEEDS_UPDATE=11;function InstallExtensionDialog(installer,_isUpdate){this._installer=installer,this._state=STATE_CLOSED,this._installResult=null,this._isUpdate=_isUpdate,this._cancelTimeout=1e4}function InstallerFacade(isLocalFile){this._isLocalFile=isLocalFile}function showDialog(){var dlg;return new InstallExtensionDialog(new InstallerFacade).show()}function installUsingDialog(urlOrFileToInstall,_isUpdate){var isLocalFile,dlg;return new InstallExtensionDialog(new InstallerFacade(urlOrFileToInstall instanceof File),_isUpdate).show(urlOrFileToInstall.fullPath||urlOrFileToInstall)}function updateUsingDialog(urlToUpdate){return installUsingDialog(urlToUpdate,!0)}InstallExtensionDialog.prototype.$dlg=null,InstallExtensionDialog.prototype.$url=null,InstallExtensionDialog.prototype.$okButton=null,InstallExtensionDialog.prototype.$cancelButton=null,InstallExtensionDialog.prototype.$inputArea=null,InstallExtensionDialog.prototype.$msgArea=null,InstallExtensionDialog.prototype.$msg=null,InstallExtensionDialog.prototype.$browseExtensionsButton=null,InstallExtensionDialog.prototype._dialogDeferred=null,InstallExtensionDialog.prototype._installer=null,InstallExtensionDialog.prototype._state=null,InstallExtensionDialog.prototype._enterState=function(newState){var url,msg,self=this,prevState=this._state;switch(this._state=newState,newState){case 1:this.$msg.find(".spinner").remove(),this.$msgArea.hide(),this.$inputArea.show(),this.$okButton.prop("disabled",!0).text(Strings.INSTALL);break;case 2:this.$okButton.prop("disabled",!1);break;case 3:url=this.$url.val().trim(),this.$inputArea.hide(),this.$browseExtensionsButton.hide(),this._messageText=StringUtils.format(Strings.INSTALLING_FROM,url),this.$msg.text(this._messageText).append("<span class='spinner inline spin'/>"),this.$msgArea.show(),this.$okButton.prop("disabled",!0),this._installer.install(url).done(function(result){self._installResult=result,result.installationStatus===Package.InstallationStatuses.ALREADY_INSTALLED||result.installationStatus===Package.InstallationStatuses.OLDER_VERSION||result.installationStatus===Package.InstallationStatuses.SAME_VERSION?self._enterState(9):result.installationStatus===Package.InstallationStatuses.NEEDS_UPDATE?self._enterState(11):self._enterState(4)}).fail(function(err){"CANCELED"===err?(console.assert(6===self._state||7===self._state),self._enterState(8)):(self._errorMessage=Package.formatError(err),self._enterState(5))});break;case 6:this.$cancelButton.prop("disabled",!0),this.$msg.text(Strings.CANCELING_INSTALL),this._installer.cancel(),window.setTimeout(function(){6===self._state&&self._enterState(7)},this._cancelTimeout);break;case 7:this.$msg.text(Strings.CANCELING_HUNG),this.$okButton.removeAttr("disabled").text(Strings.CLOSE);break;case 4:case 5:case 8:case 11:msg=4===newState?Strings.INSTALL_SUCCEEDED:5===newState?Strings.INSTALL_FAILED:11===newState?Strings.EXTENSION_UPDATE_INSTALLED:Strings.INSTALL_CANCELED,this.$msg.html($("<strong/>").text(msg)),this._errorMessage&&this.$msg.append($("<p/>").text(this._errorMessage)),this.$okButton.removeAttr("disabled").text(Strings.CLOSE),this.$cancelButton.hide();break;case 9:var installResult=this._installResult,status=installResult.installationStatus,msgText=Strings["EXTENSION_"+status];status===Package.InstallationStatuses.OLDER_VERSION&&(msgText=StringUtils.format(msgText,installResult.metadata.version,installResult.installedVersion)),this.$msg.text(msgText),this.$okButton.prop("disabled",!1).text(Strings.OVERWRITE);break;case 10:this._enterState(STATE_CLOSED);break;case STATE_CLOSED:$(window.document.body).off(".installDialog"),ExtensionDownloader.off(ExtensionDownloader.EVENT_DOWNLOAD_FILE_PROGRESS),ExtensionDownloader.off(ExtensionDownloader.EVENT_EXTRACT_FILE_PROGRESS),Dialogs.cancelModalDialogIfOpen("install-extension-dialog"),4===prevState||11===prevState||10===prevState?this._dialogDeferred.resolve(this._installResult):this._dialogDeferred.reject()}},InstallExtensionDialog.prototype._handleCancel=function(){if(3===this._state)this._enterState(6);else if(9===this._state){if(this._installResult&&this._installResult.localPath&&!this._installResult.keepFile){var filename=this._installResult.localPath;FileSystem.getFileForPath(filename).unlink()}this._enterState(STATE_CLOSED)}else 6!==this._state&&this._enterState(STATE_CLOSED)},InstallExtensionDialog.prototype._handleOk=function(){4===this._state||5===this._state||8===this._state||7===this._state||11===this._state?this._enterState(STATE_CLOSED):2===this._state?this._enterState(3):9===this._state&&this._enterState(10)},InstallExtensionDialog.prototype._handleKeyUp=function(e){e.keyCode===KeyEvent.DOM_VK_ESCAPE&&this._handleCancel()},InstallExtensionDialog.prototype._handleUrlInput=function(e){var url,valid=""!==this.$url.val().trim();valid||2!==this._state?valid&&1===this._state&&this._enterState(2):this._enterState(1)},InstallExtensionDialog.prototype._close=function(){this._state!==STATE_CLOSED&&this._enterState(STATE_CLOSED)},InstallExtensionDialog.prototype.show=function(urlToInstall){const self=this;if(this._state!==STATE_CLOSED)return this._dialogDeferred.promise();var context={Strings:Strings,isUpdate:this._isUpdate,includeBrowseExtensions:!!brackets.config.extension_listing_url};return Dialogs.showModalDialogUsingTemplate(Mustache.render(InstallDialogTemplate,context),!1),this.$dlg=$(".install-extension-dialog.instance"),this.$url=this.$dlg.find(".url").focus(),this.$okButton=this.$dlg.find(".dialog-button[data-button-id='ok']"),this.$cancelButton=this.$dlg.find(".dialog-button[data-button-id='cancel']"),this.$inputArea=this.$dlg.find(".input-field"),this.$msgArea=this.$dlg.find(".message-field"),this.$msg=this.$msgArea.find(".message"),this.$browseExtensionsButton=this.$dlg.find(".browse-extensions"),this.$okButton.on("click",this._handleOk.bind(this)),this.$cancelButton.on("click",this._handleCancel.bind(this)),this.$url.on("input",this._handleUrlInput.bind(this)),this.$browseExtensionsButton.on("click",function(){NativeApp.openURLInDefaultBrowser(brackets.config.extension_listing_url)}),$(window.document.body).on("keyup.installDialog",this._handleKeyUp.bind(this)),ExtensionDownloader.on(ExtensionDownloader.EVENT_DOWNLOAD_FILE_PROGRESS,(_evt,progress)=>{self.$msg.text(self._messageText+` ${Strings.DOWNLOADING} ${Math.round(progress)}%`).append("<span class='spinner inline spin'/>")}),ExtensionDownloader.on(ExtensionDownloader.EVENT_EXTRACT_FILE_PROGRESS,(_evt,done,total)=>{let message=StringUtils.format(Strings.EXTRACTING_FILES_PROGRESS,done,total||"...");self.$msg.text(self._messageText+` ${message}`).append("<span class='spinner inline spin'/>")}),this._enterState(1),urlToInstall&&(this.$url.val(urlToInstall),this._enterState(2),this._enterState(3)),this._dialogDeferred=new $.Deferred,this._dialogDeferred.promise()},InstallerFacade.prototype.install=function(url){if(this.pendingInstall)return console.error("Extension installation already pending"),(new $.Deferred).reject("DOWNLOAD_ID_IN_USE").promise();if(this._isLocalFile){var deferred=new $.Deferred;this.pendingInstall={promise:deferred.promise(),cancel:function(){}},Package.installFromPath(url).then(function(installationResult){installationResult.keepFile=!0,deferred.resolve(installationResult)},deferred.reject)}else this.pendingInstall=Package.installFromURL(url);var promise=this.pendingInstall.promise,self=this;return this.pendingInstall.promise.always(function(){self.pendingInstall=null}),promise},InstallerFacade.prototype.cancel=function(){this.pendingInstall.cancel()},exports.showDialog=showDialog,exports.installUsingDialog=installUsingDialog,exports.updateUsingDialog=updateUsingDialog,exports._Dialog=InstallExtensionDialog});
//# sourceMappingURL=InstallExtensionDialog.js.map
