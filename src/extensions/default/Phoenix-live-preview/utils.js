define(function(require,exports,module){const ProjectManager=brackets.getModule("project/ProjectManager"),Strings=brackets.getModule("strings"),DocumentManager=brackets.getModule("document/DocumentManager"),LiveDevelopment=brackets.getModule("LiveDevelopment/main"),LiveDevServerManager=brackets.getModule("LiveDevelopment/LiveDevServerManager");function getExtension(filePath){let pathSplit=(filePath=filePath||"").split(".");return pathSplit&&pathSplit.length>1?pathSplit[pathSplit.length-1]:""}function isPreviewableFile(filePath){let extension=getExtension(filePath);return isImage(filePath)||_isMarkdownFile(filePath)||_isHTMLFile(filePath)||["pdf"].includes(extension.toLowerCase())}function isImage(filePath){let extension=getExtension(filePath);return["jpg","jpeg","png","gif","svg","webp","bmp","ico","avif"].includes(extension.toLowerCase())}function _isMarkdownFile(filePath){let extension=getExtension(filePath);return["md","markdown"].includes(extension.toLowerCase())}function _isHTMLFile(filePath){let extension=getExtension(filePath);return["html","htm","xhtml"].includes(extension.toLowerCase())}function getNoPreviewURL(){return`${window.Phoenix.baseURL}assets/phoenix-splash/no-preview.html?jsonInput=`+encodeURIComponent(`{"heading":"${Strings.DESCRIPTION_LIVEDEV_NO_PREVIEW}",`+`"details":"${Strings.DESCRIPTION_LIVEDEV_NO_PREVIEW_DETAILS}"}`)}function getLivePreviewNotSupportedURL(){return`${window.Phoenix.baseURL}assets/phoenix-splash/live-preview-error.html?mainHeading=`+encodeURIComponent(`${Strings.DESCRIPTION_LIVEDEV_MAIN_HEADING}`)+"&mainSpan="+encodeURIComponent(`${Strings.DESCRIPTION_LIVEDEV_MAIN_SPAN}`)}function getPageLoaderURL(url){return`${Phoenix.baseURL}live-preview-loader.html?`+`virtualServerURL=${encodeURIComponent(LiveDevServerManager.getStaticServerBaseURLs().baseURL)}`+`&phoenixInstanceID=${Phoenix.PHOENIX_INSTANCE_ID}&initialURL=${encodeURIComponent(url)}`+`&localMessage=${encodeURIComponent(Strings.DESCRIPTION_LIVEDEV_SECURITY_POPOUT_MESSAGE)}`+`&initialProjectRoot=${encodeURIComponent(ProjectManager.getProjectRoot().fullPath)}`+`&okMessage=${encodeURIComponent(Strings.TRUST_PROJECT)}`}function _isLivePreviewSupported(){return Phoenix.browser.isTauri||!(Phoenix.browser.desktop.isSafari||Phoenix.browser.mobile.isIos)}async function getPreviewDetails(){return new Promise(async(resolve,reject)=>{try{if(!_isLivePreviewSupported())return void resolve({URL:getLivePreviewNotSupportedURL(),isNoPreview:!0});const projectRoot=ProjectManager.getProjectRoot().fullPath,projectRootUrl=`${LiveDevelopment.getLivePreviewBaseURL()}${projectRoot}`,currentDocument=DocumentManager.getCurrentDocument(),currentFile=currentDocument?currentDocument.file:ProjectManager.getSelectedItem();if(currentFile){let fullPath=currentFile.fullPath,httpFilePath=null;if((fullPath.startsWith("http://")||fullPath.startsWith("https://"))&&(httpFilePath=fullPath),isPreviewableFile(fullPath)){const filePath=httpFilePath||path.relative(projectRoot,fullPath);let URL;return void resolve({URL:httpFilePath||`${projectRootUrl}${filePath}`,filePath:filePath,fullPath:fullPath,isMarkdownFile:_isMarkdownFile(fullPath),isHTMLFile:_isHTMLFile(fullPath)})}}resolve({URL:getNoPreviewURL(),isNoPreview:!0})}catch(e){reject(e)}})}exports.getPreviewDetails=getPreviewDetails,exports.getNoPreviewURL=getNoPreviewURL,exports.getExtension=getExtension,exports.getPageLoaderURL=getPageLoaderURL,exports.isPreviewableFile=isPreviewableFile,exports.isImage=isImage});
//# sourceMappingURL=utils.js.map
