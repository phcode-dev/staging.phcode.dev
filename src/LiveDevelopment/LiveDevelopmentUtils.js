define(function(require,exports,module){var LanguageManager=require("language/LanguageManager");const _staticHtmlFileExts=["htm","html","xhtml"];function isStaticHtmlFileExt(filePath){return!!filePath&&-1!==_staticHtmlFileExts.indexOf(LanguageManager.getLanguageForPath(filePath).getId())}function isHtmlFileExt(ext){return isStaticHtmlFileExt(ext)}exports.isHtmlFileExt=isHtmlFileExt,exports.isStaticHtmlFileExt=isStaticHtmlFileExt});
//# sourceMappingURL=LiveDevelopmentUtils.js.map
