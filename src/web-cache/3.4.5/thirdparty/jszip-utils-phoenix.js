!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.JSZipUtils=e():"undefined"!=typeof global?global.JSZipUtils=e():"undefined"!=typeof self&&(self.JSZipUtils=e())}(function(){var define,module,exports;return function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a="function"==typeof require&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n||e)},f,f.exports,e,t,n,r)}return n[o].exports}for(var i="function"==typeof require&&require,o=0;o<r.length;o++)s(r[o]);return s}({1:[function(require,module,exports){"use strict";var JSZipUtils={};function createStandardXHR(){try{return new window.XMLHttpRequest}catch(e){}}function createActiveXHR(){try{return new window.ActiveXObject("Microsoft.XMLHTTP")}catch(e){}}JSZipUtils._getBinaryFromXHR=function(xhr){return xhr.response||xhr.responseText};var createXHR="undefined"!=typeof window&&window.ActiveXObject?function(){return createStandardXHR()||createActiveXHR()}:createStandardXHR;JSZipUtils.getBinaryContent=function(path,options){var promise,resolve,reject,callback;options||(options={}),"function"==typeof options?(callback=options,options={}):"function"==typeof options.callback&&(callback=options.callback),callback||"undefined"==typeof Promise?(resolve=function(data){callback(null,data)},reject=function(err){callback(err,null)}):promise=new Promise(function(_resolve,_reject){resolve=_resolve,reject=_reject});try{var xhr=createXHR();xhr.open("GET",path,!0),"responseType"in xhr&&(xhr.responseType="arraybuffer"),xhr.overrideMimeType&&xhr.overrideMimeType("text/plain; charset=x-user-defined"),xhr.onreadystatechange=function(event){if(4===xhr.readyState)if(200===xhr.status||0===xhr.status)try{resolve(JSZipUtils._getBinaryFromXHR(xhr))}catch(err){reject(new Error(err))}else reject(new Error("Ajax error for "+path+" : "+this.status+" "+this.statusText))},xhr.onprogress=function(e){options.abortCheck&&options.abortCheck()&&xhr.abort(),options.progress&&options.progress({path:path,originalEvent:e,percent:e.loaded/e.total*100,loaded:e.loaded,total:e.total})},xhr.send()}catch(e){reject(new Error(e),null)}return promise},module.exports=JSZipUtils},{}]},{},[1])(1)});
//# sourceMappingURL=jszip-utils-phoenix.js.map
