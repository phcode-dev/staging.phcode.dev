"use strict";function copyObj(obj,target,overwrite){for(var prop in target||(target={}),obj)!obj.hasOwnProperty(prop)||!1===overwrite&&target.hasOwnProperty(prop)||(target[prop]=obj[prop]);return target}function countColumn(string,end,tabSize,startIndex,startValue){null==end&&-1==(end=string.search(/[^\s\u00a0]/))&&(end=string.length);for(var i=startIndex||0,n=startValue||0;;){var nextTab=string.indexOf("\t",i);if(nextTab<0||nextTab>=end)return n+(end-i);n+=nextTab-i,n+=tabSize-n%tabSize,i=nextTab+1}}function nothing(){}function createObj(base,props){var inst;return Object.create?inst=Object.create(base):(nothing.prototype=base,inst=new nothing),props&&copyObj(props,inst),inst}var StringStream=function(string,tabSize,lineOracle){this.pos=this.start=0,this.string=string,this.tabSize=tabSize||8,this.lastColumnPos=this.lastColumnValue=0,this.lineStart=0,this.lineOracle=lineOracle};StringStream.prototype.eol=function(){return this.pos>=this.string.length},StringStream.prototype.sol=function(){return this.pos==this.lineStart},StringStream.prototype.peek=function(){return this.string.charAt(this.pos)||void 0},StringStream.prototype.next=function(){if(this.pos<this.string.length)return this.string.charAt(this.pos++)},StringStream.prototype.eat=function(match){var ch=this.string.charAt(this.pos),ok;if(ok="string"==typeof match?ch==match:ch&&(match.test?match.test(ch):match(ch)))return++this.pos,ch},StringStream.prototype.eatWhile=function(match){for(var start=this.pos;this.eat(match););return this.pos>start},StringStream.prototype.eatSpace=function(){for(var start=this.pos;/[\s\u00a0]/.test(this.string.charAt(this.pos));)++this.pos;return this.pos>start},StringStream.prototype.skipToEnd=function(){this.pos=this.string.length},StringStream.prototype.skipTo=function(ch){var found=this.string.indexOf(ch,this.pos);if(found>-1)return this.pos=found,!0},StringStream.prototype.backUp=function(n){this.pos-=n},StringStream.prototype.column=function(){return this.lastColumnPos<this.start&&(this.lastColumnValue=countColumn(this.string,this.start,this.tabSize,this.lastColumnPos,this.lastColumnValue),this.lastColumnPos=this.start),this.lastColumnValue-(this.lineStart?countColumn(this.string,this.lineStart,this.tabSize):0)},StringStream.prototype.indentation=function(){return countColumn(this.string,null,this.tabSize)-(this.lineStart?countColumn(this.string,this.lineStart,this.tabSize):0)},StringStream.prototype.match=function(pattern,consume,caseInsensitive){if("string"!=typeof pattern){var match=this.string.slice(this.pos).match(pattern);return match&&match.index>0?null:(match&&!1!==consume&&(this.pos+=match[0].length),match)}var cased=function(str){return caseInsensitive?str.toLowerCase():str},substr;if(cased(this.string.substr(this.pos,pattern.length))==cased(pattern))return!1!==consume&&(this.pos+=pattern.length),!0},StringStream.prototype.current=function(){return this.string.slice(this.start,this.pos)},StringStream.prototype.hideFirstChars=function(n,inner){this.lineStart+=n;try{return inner()}finally{this.lineStart-=n}},StringStream.prototype.lookAhead=function(n){var oracle=this.lineOracle;return oracle&&oracle.lookAhead(n)},StringStream.prototype.baseToken=function(){var oracle=this.lineOracle;return oracle&&oracle.baseToken(this.pos)};var modes={},mimeModes={};function defineMode(name,mode){arguments.length>2&&(mode.dependencies=Array.prototype.slice.call(arguments,2)),modes[name]=mode}function defineMIME(mime,spec){mimeModes[mime]=spec}function resolveMode(spec){if("string"==typeof spec&&mimeModes.hasOwnProperty(spec))spec=mimeModes[spec];else if(spec&&"string"==typeof spec.name&&mimeModes.hasOwnProperty(spec.name)){var found=mimeModes[spec.name];"string"==typeof found&&(found={name:found}),(spec=createObj(found,spec)).name=found.name}else{if("string"==typeof spec&&/^[\w\-]+\/[\w\-]+\+xml$/.test(spec))return resolveMode("application/xml");if("string"==typeof spec&&/^[\w\-]+\/[\w\-]+\+json$/.test(spec))return resolveMode("application/json")}return"string"==typeof spec?{name:spec}:spec||{name:"null"}}function getMode(options,spec){spec=resolveMode(spec);var mfactory=modes[spec.name];if(!mfactory)return getMode(options,"text/plain");var modeObj=mfactory(options,spec);if(modeExtensions.hasOwnProperty(spec.name)){var exts=modeExtensions[spec.name];for(var prop in exts)exts.hasOwnProperty(prop)&&(modeObj.hasOwnProperty(prop)&&(modeObj["_"+prop]=modeObj[prop]),modeObj[prop]=exts[prop])}if(modeObj.name=spec.name,spec.helperType&&(modeObj.helperType=spec.helperType),spec.modeProps)for(var prop$1 in spec.modeProps)modeObj[prop$1]=spec.modeProps[prop$1];return modeObj}var modeExtensions={};function extendMode(mode,properties){var exts;copyObj(properties,modeExtensions.hasOwnProperty(mode)?modeExtensions[mode]:modeExtensions[mode]={})}function copyState(mode,state){if(!0===state)return state;if(mode.copyState)return mode.copyState(state);var nstate={};for(var n in state){var val=state[n];val instanceof Array&&(val=val.concat([])),nstate[n]=val}return nstate}function innerMode(mode,state){for(var info;mode.innerMode&&(info=mode.innerMode(state))&&info.mode!=mode;)state=info.state,mode=info.mode;return info||{mode:mode,state:state}}function startState(mode,a1,a2){return!mode.startState||mode.startState(a1,a2)}var modeMethods={__proto__:null,modes:modes,mimeModes:mimeModes,defineMode:defineMode,defineMIME:defineMIME,resolveMode:resolveMode,getMode:getMode,modeExtensions:modeExtensions,extendMode:extendMode,copyState:copyState,innerMode:innerMode,startState:startState};for(var exported in exports.StringStream=StringStream,exports.countColumn=countColumn,modeMethods)exports[exported]=modeMethods[exported];require.cache[require.resolve("../../lib/codemirror")]=require.cache[require.resolve("./runmode.node")],require.cache[require.resolve("../../addon/runmode/runmode")]=require.cache[require.resolve("./runmode.node")],exports.defineMode("null",function(){return{token:function(stream){return stream.skipToEnd()}}}),exports.defineMIME("text/plain","null"),exports.registerHelper=exports.registerGlobalHelper=Math.min,exports.splitLines=function(string){return string.split(/\r?\n|\r/)},exports.defaults={indentUnit:2},function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){CodeMirror.runMode=function(string,modespec,callback,options){var mode=CodeMirror.getMode(CodeMirror.defaults,modespec),tabSize=options&&options.tabSize||CodeMirror.defaults.tabSize;if(callback.appendChild){var ie,ie_lt9=/MSIE \d/.test(navigator.userAgent)&&(null==document.documentMode||document.documentMode<9),node=callback,col=0;node.textContent="",callback=function(text,style){if("\n"==text)return node.appendChild(document.createTextNode(ie_lt9?"\r":text)),void(col=0);for(var content="",pos=0;;){var idx=text.indexOf("\t",pos);if(-1==idx){content+=text.slice(pos),col+=text.length-pos;break}col+=idx-pos,content+=text.slice(pos,idx);var size=tabSize-col%tabSize;col+=size;for(var i=0;i<size;++i)content+=" ";pos=idx+1}if(style){var sp=node.appendChild(document.createElement("span"));sp.className="cm-"+style.replace(/ +/g," cm-"),sp.appendChild(document.createTextNode(content))}else node.appendChild(document.createTextNode(content))}}for(var lines=CodeMirror.splitLines(string),state=options&&options.state||CodeMirror.startState(mode),i=0,e=lines.length;i<e;++i){i&&callback("\n");var stream=new CodeMirror.StringStream(lines[i],null,{lookAhead:function(n){return lines[i+n]},baseToken:function(){}});for(!stream.string&&mode.blankLine&&mode.blankLine(state);!stream.eol();){var style=mode.token(stream,state);callback(stream.current(),style,i,stream.start,state,mode),stream.start=stream.pos}}}});
//# sourceMappingURL=runmode.node.js.map
