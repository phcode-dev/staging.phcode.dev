define(function(require,exports,module){require("utils/Global");var FileSystemError=require("filesystem/FileSystemError"),DeprecationWarning=require("utils/DeprecationWarning"),LanguageManager=require("language/LanguageManager"),PerfUtils=require("utils/PerfUtils"),Strings=require("strings"),StringUtils=require("utils/StringUtils"),DocumentCommandHandlers,LiveDevelopmentUtils,MAX_FILE_SIZE_MB=16,MAX_FILE_SIZE=1024*MAX_FILE_SIZE_MB*1024,extListToBeOpenedInExtApp=[];function readAsText(file,bypassCache){const result=new $.Deferred;return file.read({bypassCache:bypassCache},function(err,data,_encoding,stat){err?result.reject(err):result.resolve(data,stat.mtime)}),result.promise()}function writeText(file,text,allowBlindWrite){const result=new $.Deferred,options={};return allowBlindWrite&&(options.blind=!0),file.write(text,options,function(err){err?result.reject(err):result.resolve()}),result.promise()}var LINE_ENDINGS_CRLF="CRLF",LINE_ENDINGS_LF="LF";function getPlatformLineEndings(){return"win"===brackets.platform?LINE_ENDINGS_CRLF:LINE_ENDINGS_LF}function sniffLineEndings(text){var subset=text.substr(0,1e3),hasCRLF=/\r\n/.test(subset),hasLF=/[^\r]\n/.test(subset);return hasCRLF&&hasLF||!hasCRLF&&!hasLF?null:hasCRLF?LINE_ENDINGS_CRLF:LINE_ENDINGS_LF}function translateLineEndings(text,lineEndings){lineEndings!==LINE_ENDINGS_CRLF&&lineEndings!==LINE_ENDINGS_LF&&(lineEndings=getPlatformLineEndings());var eolStr=lineEndings===LINE_ENDINGS_CRLF?"\r\n":"\n",findAnyEol=/\r\n|\r|\n/g;return text.replace(findAnyEol,eolStr)}function getFileErrorString(name){var result;return result=name===FileSystemError.NOT_FOUND?Strings.NOT_FOUND_ERR:name===FileSystemError.NOT_READABLE?Strings.NOT_READABLE_ERR:name===FileSystemError.NOT_WRITABLE?Strings.NO_MODIFICATION_ALLOWED_ERR_FILE:name===FileSystemError.CONTENTS_MODIFIED?Strings.CONTENTS_MODIFIED_ERR:name===FileSystemError.UNSUPPORTED_ENCODING?Strings.UNSUPPORTED_ENCODING_ERR:name===FileSystemError.EXCEEDS_MAX_FILE_SIZE?StringUtils.format(Strings.EXCEEDS_MAX_FILE_SIZE,MAX_FILE_SIZE_MB):name===FileSystemError.ENCODE_FILE_FAILED?Strings.ENCODE_FILE_FAILED_ERR:name===FileSystemError.DECODE_FILE_FAILED?Strings.DECODE_FILE_FAILED_ERR:name===FileSystemError.UNSUPPORTED_UTF16_ENCODING?Strings.UNSUPPORTED_UTF16_ENCODING_ERR:StringUtils.format(Strings.GENERIC_ERROR,name)}function showFileOpenError(name,path){return DeprecationWarning.deprecationWarning("FileUtils.showFileOpenError() has been deprecated. Please use DocumentCommandHandlers.showFileOpenError() instead."),DocumentCommandHandlers.showFileOpenError(name,path)}function makeDialogFileList(paths){var result="<ul class='dialog-list'>";return paths.forEach(function(path){result+="<li><span class='dialog-filename'>",result+=StringUtils.breakableUrl(path),result+="</span></li>"}),result+="</ul>"}function convertToNativePath(path){return-1!==(path=unescape(path)).indexOf(":")&&"/"===path[0]?path.substr(1):path}function convertWindowsPathToUnixPath(path){return"win"===brackets.platform&&(path=path.replace(/\\/g,"/")),path}function stripTrailingSlash(path){return path&&"/"===path[path.length-1]?path.slice(0,-1):path}function getBaseName(fullPath){var lastSlash=fullPath.lastIndexOf("/");return lastSlash===fullPath.length-1?fullPath.slice(fullPath.lastIndexOf("/",fullPath.length-2)+1,-1):fullPath.slice(lastSlash+1)}function getNativeBracketsDirectoryPath(){var pathname=decodeURI(window.location.pathname);return pathname.substr(0,pathname.lastIndexOf("/"))}function getNativeModuleDirectoryPath(module){var path;return module&&module.uri&&(path=(path=decodeURI(module.uri)).substr(0,path.lastIndexOf("/"))),path}function getFileExtension(fullPath){var baseName=getBaseName(fullPath),idx=baseName.lastIndexOf(".");return-1===idx?"":baseName.substr(idx+1)}function getSmartFileExtension(fullPath){return DeprecationWarning.deprecationWarning("FileUtils.getSmartFileExtension() has been deprecated. Please use LanguageManager.getCompoundFileExtension() instead."),LanguageManager.getCompoundFileExtension(fullPath)}function getRelativeFilename(basePath,filename){if(filename&&filename.substr(0,basePath.length)===basePath)return filename.substr(basePath.length)}function isStaticHtmlFileExt(filePath){return DeprecationWarning.deprecationWarning("FileUtils.isStaticHtmlFileExt() has been deprecated. Please use LiveDevelopmentUtils.isStaticHtmlFileExt() instead."),LiveDevelopmentUtils.isStaticHtmlFileExt(filePath)}function getDirectoryPath(fullPath){return fullPath.substr(0,fullPath.lastIndexOf("/")+1)}function getParentPath(fullPath){return"/"===fullPath?"":fullPath.substring(0,fullPath.lastIndexOf("/",fullPath.length-2)+1)}function getFilenameWithoutExtension(filename){var index=filename.lastIndexOf(".");return-1===index?filename:filename.slice(0,index)}var _cmpNames="win"===brackets.platform?function(filename1,filename2,lang){var f1=getFilenameWithoutExtension(filename1),f2=getFilenameWithoutExtension(filename2);return f1.localeCompare(f2,lang,{numeric:!0})}:function(filename1,filename2,lang){return filename1.localeCompare(filename2,lang,{numeric:!0})};function compareFilenames(filename1,filename2,extFirst){var lang=brackets.getLocale();function cmpExt(){var ext1=getFileExtension(filename1),ext2=getFileExtension(filename2);return ext1.localeCompare(ext2,lang,{numeric:!0})}function cmpNames(){return _cmpNames(filename1,filename2,lang)}return filename1=filename1.toLocaleLowerCase(),filename2=filename2.toLocaleLowerCase(),extFirst?cmpExt()||cmpNames():cmpNames()||cmpExt()}function comparePaths(path1,path2){for(var entryName1,entryName2,pathParts1=path1.split("/"),pathParts2=path2.split("/"),length=Math.min(pathParts1.length,pathParts2.length),folders1=pathParts1.length-1,folders2=pathParts2.length-1,index=0;index<length;){if((entryName1=pathParts1[index])!==(entryName2=pathParts2[index]))return index<folders1&&index<folders2?entryName1.toLocaleLowerCase().localeCompare(entryName2.toLocaleLowerCase()):index>=folders1&&index>=folders2?compareFilenames(entryName1,entryName2):index>=folders1&&index<folders2?-1:1;index++}return 0}function encodeFilePath(path){var pathArray=path.split("/");return(pathArray=pathArray.map(function(subPath){return encodeURIComponent(subPath)})).join("/")}function shouldOpenInExternalApplication(ext){return extListToBeOpenedInExtApp.includes(ext)}function addExtensionToExternalAppList(ext){Array.isArray(ext)?extListToBeOpenedInExtApp=ext:"string"==typeof ext&&extListToBeOpenedInExtApp.push(ext)}require(["document/DocumentCommandHandlers"],function(dchModule){DocumentCommandHandlers=dchModule}),require(["LiveDevelopment/LiveDevelopmentUtils"],function(lduModule){LiveDevelopmentUtils=lduModule}),exports.LINE_ENDINGS_CRLF=LINE_ENDINGS_CRLF,exports.LINE_ENDINGS_LF=LINE_ENDINGS_LF,exports.getPlatformLineEndings=getPlatformLineEndings,exports.sniffLineEndings=sniffLineEndings,exports.translateLineEndings=translateLineEndings,exports.showFileOpenError=showFileOpenError,exports.getFileErrorString=getFileErrorString,exports.makeDialogFileList=makeDialogFileList,exports.readAsText=readAsText,exports.writeText=writeText,exports.convertToNativePath=convertToNativePath,exports.convertWindowsPathToUnixPath=convertWindowsPathToUnixPath,exports.getNativeBracketsDirectoryPath=getNativeBracketsDirectoryPath,exports.getNativeModuleDirectoryPath=getNativeModuleDirectoryPath,exports.stripTrailingSlash=stripTrailingSlash,exports.isStaticHtmlFileExt=isStaticHtmlFileExt,exports.getDirectoryPath=getDirectoryPath,exports.getParentPath=getParentPath,exports.getBaseName=getBaseName,exports.getRelativeFilename=getRelativeFilename,exports.getFilenameWithoutExtension=getFilenameWithoutExtension,exports.getFileExtension=getFileExtension,exports.getSmartFileExtension=getSmartFileExtension,exports.compareFilenames=compareFilenames,exports.comparePaths=comparePaths,exports.MAX_FILE_SIZE=MAX_FILE_SIZE,exports.encodeFilePath=encodeFilePath,exports.shouldOpenInExternalApplication=shouldOpenInExternalApplication,exports.addExtensionToExternalAppList=addExtensionToExternalAppList});
//# sourceMappingURL=FileUtils.js.map
