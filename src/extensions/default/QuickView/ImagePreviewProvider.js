define(function(require,exports,module){let FileUtils=brackets.getModule("file/FileUtils"),FileSystem=brackets.getModule("filesystem/FileSystem"),PreferencesManager=brackets.getModule("preferences/PreferencesManager"),LanguageManager=brackets.getModule("language/LanguageManager"),Strings=brackets.getModule("strings"),PathUtils=brackets.getModule("thirdparty/path-utils/path-utils"),AppInit=brackets.getModule("utils/AppInit"),QuickView=brackets.getModule("features/QuickViewManager"),Metrics=brackets.getModule("utils/Metrics"),FileViewController=brackets.getModule("project/FileViewController"),enabled,prefs=null,extensionlessImagePreview,validProtocols=["data:","http:","https:","phtauri:","asset:","ftp:","file:"];function _transformToIframePath(url){if(url&&url.startsWith("https://www.youtube.com/watch?")){const utube=new URL(url),vidLink=utube.searchParams.get("v");if(vidLink)return`https://www.youtube.com/embed/${vidLink}`}return url}function getQuickView(editor,pos,token,line){return new Promise((resolve,reject)=>{let urlRegEx=/url\(([^\)]*)\)/gi,tokenString,urlMatch,sPos,ePos;if("string"===token.type)tokenString=token.string;else for(urlMatch=urlRegEx.exec(line);urlMatch&&!(pos.ch<urlMatch.index);){if(pos.ch<=urlMatch.index+urlMatch[0].length){tokenString=urlMatch[1];break}urlMatch=urlRegEx.exec(line)}if(!tokenString)return void reject();tokenString=tokenString.replace(/(^['"])|(['"]$)/g,"");let docPath=editor.document.file.fullPath,imgPath,parsed=PathUtils.parseUrl(tokenString),hasProtocol=""!==parsed.protocol&&-1!==validProtocols.indexOf(parsed.protocol.trim().toLowerCase()),ext=parsed.filenameExtension.replace(/^\./,""),language=LanguageManager.getLanguageForExtension(ext),id=language&&language.getId(),isImage="image"===id||"svg"===id,loadFromDisk=null;if(hasProtocol&&(isImage||!ext&&extensionlessImagePreview)?imgPath=tokenString:!hasProtocol&&isImage&&(imgPath="",loadFromDisk=window.path.normalize(FileUtils.getDirectoryPath(docPath)+tokenString)),!loadFromDisk&&!imgPath)return void reject();urlMatch?(sPos={line:pos.line,ch:urlMatch.index},ePos={line:pos.line,ch:urlMatch.index+urlMatch[0].length}):(sPos={line:pos.line,ch:token.start},ePos={line:pos.line,ch:token.end});let $imgPreview=$("<div id='quick-view-image-preview'><div class='image-preview'>    <img src=\""+imgPath+'"></div></div>');function _tryLoadingURLInIframe(){let $iframe=$(`<iframe class='image-preview' src="${_transformToIframePath(imgPath)}">`);$imgPreview.find(".image-preview").append($iframe)}function showHandlerWithImageURL(imageURL){let img=$imgPreview.find("img");imageURL&&(img[0].src=imageURL),img.on("load",function(){$imgPreview.append("<div class='img-size'>"+this.naturalWidth+" &times; "+this.naturalHeight+" "+Strings.UNIT_PIXELS+"</div>")}).on("error",function(e){img.remove(),_tryLoadingURLInIframe(),e.preventDefault()})}function _imageToDataURI(file,cb){let contentType="data:image;base64,";file.name.endsWith(".svg")&&(contentType="data:image/svg+xml;base64,"),file.read({encoding:window.fs.BYTE_ARRAY_ENCODING},function(err,content){if(err)return void cb(err);let base64=window.btoa(new Uint8Array(content).reduce((data,byte)=>data+String.fromCharCode(byte),"")),dataURL;cb(null,contentType+base64)})}$imgPreview.attr("data-for-test",imgPath||loadFromDisk);let previewPopup={start:sPos,end:ePos,content:$imgPreview};if(loadFromDisk){let imageFile=FileSystem.getFileForPath(loadFromDisk);_imageToDataURI(imageFile,function(err,dataURL){err?reject():($imgPreview.click(function(){FileViewController.openAndSelectDocument(imageFile.fullPath,FileViewController.PROJECT_MANAGER),Metrics.countEvent(Metrics.EVENT_TYPE.QUICK_VIEW,"image","click")}),showHandlerWithImageURL(dataURL),Metrics.countEvent(Metrics.EVENT_TYPE.QUICK_VIEW,"image","show"),resolve(previewPopup))})}else showHandlerWithImageURL(),resolve(previewPopup)})}function setExtensionlessImagePreview(_extensionlessImagePreview,doNotSave){extensionlessImagePreview!==_extensionlessImagePreview&&(extensionlessImagePreview=_extensionlessImagePreview,doNotSave||(prefs.set("extensionlessImagePreview",enabled),prefs.save()))}(prefs=PreferencesManager.getExtensionPrefs("quickview")).definePreference("extensionlessImagePreview","boolean",!0,{description:Strings.DESCRIPTION_EXTENSION_LESS_IMAGE_PREVIEW}),setExtensionlessImagePreview(prefs.get("extensionlessImagePreview"),!0),prefs.on("change","extensionlessImagePreview",function(){setExtensionlessImagePreview(prefs.get("extensionlessImagePreview"))}),AppInit.appReady(function(){QuickView.registerQuickViewProvider(exports,["all"])}),exports.getQuickView=getQuickView,exports.QUICK_VIEW_NAME="ImagePreviewProvider"});
//# sourceMappingURL=ImagePreviewProvider.js.map
