!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";function wordRegexp(words){return new RegExp("^(("+words.join(")|(")+"))\\b")}var wordOperators=wordRegexp(["and","or","not","is"]),commonKeywords=["as","assert","break","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","lambda","pass","raise","return","try","while","with","yield","in"],commonBuiltins=["abs","all","any","bin","bool","bytearray","callable","chr","classmethod","compile","complex","delattr","dict","dir","divmod","enumerate","eval","filter","float","format","frozenset","getattr","globals","hasattr","hash","help","hex","id","input","int","isinstance","issubclass","iter","len","list","locals","map","max","memoryview","min","next","object","oct","open","ord","pow","property","range","repr","reversed","round","set","setattr","slice","sorted","staticmethod","str","sum","super","tuple","type","vars","zip","__import__","NotImplemented","Ellipsis","__debug__"];function top(state){return state.scopes[state.scopes.length-1]}CodeMirror.registerHelper("hintWords","python",commonKeywords.concat(commonBuiltins)),CodeMirror.defineMode("python",function(conf,parserConf){for(var ERRORCLASS="error",delimiters=parserConf.delimiters||parserConf.singleDelimiters||/^[\(\)\[\]\{\}@,:`=;\.\\]/,operators=[parserConf.singleOperators,parserConf.doubleOperators,parserConf.doubleDelimiters,parserConf.tripleDelimiters,parserConf.operators||/^([-+*/%\/&|^]=?|[<>=]+|\/\/=?|\*\*=?|!=|[~!@]|\.\.\.)/],i=0;i<operators.length;i++)operators[i]||operators.splice(i--,1);var hangingIndent=parserConf.hangingIndent||conf.indentUnit,myKeywords=commonKeywords,myBuiltins=commonBuiltins;null!=parserConf.extra_keywords&&(myKeywords=myKeywords.concat(parserConf.extra_keywords)),null!=parserConf.extra_builtins&&(myBuiltins=myBuiltins.concat(parserConf.extra_builtins));var py3=!(parserConf.version&&Number(parserConf.version)<3);if(py3){var identifiers=parserConf.identifiers||/^[_A-Za-z\u00A1-\uFFFF][_A-Za-z0-9\u00A1-\uFFFF]*/;myKeywords=myKeywords.concat(["nonlocal","False","True","None","async","await"]),myBuiltins=myBuiltins.concat(["ascii","bytes","exec","print"]);var stringPrefixes=new RegExp("^(([rbuf]|(br)|(rb)|(fr)|(rf))?('{3}|\"{3}|['\"]))","i")}else{var identifiers=parserConf.identifiers||/^[_A-Za-z][_A-Za-z0-9]*/;myKeywords=myKeywords.concat(["exec","print"]),myBuiltins=myBuiltins.concat(["apply","basestring","buffer","cmp","coerce","execfile","file","intern","long","raw_input","reduce","reload","unichr","unicode","xrange","False","True","None"]);var stringPrefixes=new RegExp("^(([rubf]|(ur)|(br))?('{3}|\"{3}|['\"]))","i")}var keywords=wordRegexp(myKeywords),builtins=wordRegexp(myBuiltins),external;function tokenBase(stream,state){var sol=stream.sol()&&"\\"!=state.lastToken;if(sol&&(state.indent=stream.indentation()),sol&&"py"==top(state).type){var scopeOffset=top(state).offset;if(stream.eatSpace()){var lineOffset=stream.indentation();return lineOffset>scopeOffset?pushPyScope(state):lineOffset<scopeOffset&&dedent(stream,state)&&"#"!=stream.peek()&&(state.errorToken=!0),null}var style=tokenBaseInner(stream,state);return scopeOffset>0&&dedent(stream,state)&&(style+=" "+ERRORCLASS),style}return tokenBaseInner(stream,state)}function tokenBaseInner(stream,state,inFormat){if(stream.eatSpace())return null;if(!inFormat&&stream.match(/^#.*/))return"comment";if(stream.match(/^[0-9\.]/,!1)){var floatLiteral=!1;if(stream.match(/^[\d_]*\.\d+(e[\+\-]?\d+)?/i)&&(floatLiteral=!0),stream.match(/^[\d_]+\.\d*/)&&(floatLiteral=!0),stream.match(/^\.\d+/)&&(floatLiteral=!0),floatLiteral)return stream.eat(/J/i),"number";var intLiteral=!1;if(stream.match(/^0x[0-9a-f_]+/i)&&(intLiteral=!0),stream.match(/^0b[01_]+/i)&&(intLiteral=!0),stream.match(/^0o[0-7_]+/i)&&(intLiteral=!0),stream.match(/^[1-9][\d_]*(e[\+\-]?[\d_]+)?/)&&(stream.eat(/J/i),intLiteral=!0),stream.match(/^0(?![\dx])/i)&&(intLiteral=!0),intLiteral)return stream.eat(/L/i),"number"}var isFmtString;if(stream.match(stringPrefixes))return-1!==stream.current().toLowerCase().indexOf("f")?(state.tokenize=formatStringFactory(stream.current(),state.tokenize),state.tokenize(stream,state)):(state.tokenize=tokenStringFactory(stream.current(),state.tokenize),state.tokenize(stream,state));for(var i=0;i<operators.length;i++)if(stream.match(operators[i]))return"operator";return stream.match(delimiters)?"punctuation":"."==state.lastToken&&stream.match(identifiers)?"property":stream.match(keywords)||stream.match(wordOperators)?"keyword":stream.match(builtins)?"builtin":stream.match(/^(self|cls)\b/)?"variable-2":stream.match(identifiers)?"def"==state.lastToken||"class"==state.lastToken?"def":"variable":(stream.next(),inFormat?null:ERRORCLASS)}function formatStringFactory(delimiter,tokenOuter){for(;"rubf".indexOf(delimiter.charAt(0).toLowerCase())>=0;)delimiter=delimiter.substr(1);var singleline=1==delimiter.length,OUTCLASS="string";function tokenNestedExpr(depth){return function(stream,state){var inner=tokenBaseInner(stream,state,!0);return"punctuation"==inner&&("{"==stream.current()?state.tokenize=tokenNestedExpr(depth+1):"}"==stream.current()&&(state.tokenize=depth>1?tokenNestedExpr(depth-1):tokenString)),inner}}function tokenString(stream,state){for(;!stream.eol();)if(stream.eatWhile(/[^'"\{\}\\]/),stream.eat("\\")){if(stream.next(),singleline&&stream.eol())return OUTCLASS}else{if(stream.match(delimiter))return state.tokenize=tokenOuter,OUTCLASS;if(stream.match("{{"))return OUTCLASS;if(stream.match("{",!1))return state.tokenize=tokenNestedExpr(0),stream.current()?OUTCLASS:state.tokenize(stream,state);if(stream.match("}}"))return OUTCLASS;if(stream.match("}"))return ERRORCLASS;stream.eat(/['"]/)}if(singleline){if(parserConf.singleLineStringErrors)return ERRORCLASS;state.tokenize=tokenOuter}return OUTCLASS}return tokenString.isString=!0,tokenString}function tokenStringFactory(delimiter,tokenOuter){for(;"rubf".indexOf(delimiter.charAt(0).toLowerCase())>=0;)delimiter=delimiter.substr(1);var singleline=1==delimiter.length,OUTCLASS="string";function tokenString(stream,state){for(;!stream.eol();)if(stream.eatWhile(/[^'"\\]/),stream.eat("\\")){if(stream.next(),singleline&&stream.eol())return OUTCLASS}else{if(stream.match(delimiter))return state.tokenize=tokenOuter,OUTCLASS;stream.eat(/['"]/)}if(singleline){if(parserConf.singleLineStringErrors)return ERRORCLASS;state.tokenize=tokenOuter}return OUTCLASS}return tokenString.isString=!0,tokenString}function pushPyScope(state){for(;"py"!=top(state).type;)state.scopes.pop();state.scopes.push({offset:top(state).offset+conf.indentUnit,type:"py",align:null})}function pushBracketScope(stream,state,type){var align=stream.match(/^[\s\[\{\(]*(?:#|$)/,!1)?null:stream.column()+1;state.scopes.push({offset:state.indent+hangingIndent,type:type,align:align})}function dedent(stream,state){for(var indented=stream.indentation();state.scopes.length>1&&top(state).offset>indented;){if("py"!=top(state).type)return!0;state.scopes.pop()}return top(state).offset!=indented}function tokenLexer(stream,state){stream.sol()&&(state.beginningOfLine=!0,state.dedent=!1);var style=state.tokenize(stream,state),current=stream.current();if(state.beginningOfLine&&"@"==current)return stream.match(identifiers,!1)?"meta":py3?"operator":ERRORCLASS;if(/\S/.test(current)&&(state.beginningOfLine=!1),"variable"!=style&&"builtin"!=style||"meta"!=state.lastToken||(style="meta"),"pass"!=current&&"return"!=current||(state.dedent=!0),"lambda"==current&&(state.lambda=!0),":"==current&&!state.lambda&&"py"==top(state).type&&stream.match(/^\s*(?:#|$)/,!1)&&pushPyScope(state),1==current.length&&!/string|comment/.test(style)){var delimiter_index="[({".indexOf(current);if(-1!=delimiter_index&&pushBracketScope(stream,state,"])}".slice(delimiter_index,delimiter_index+1)),-1!=(delimiter_index="])}".indexOf(current))){if(top(state).type!=current)return ERRORCLASS;state.indent=state.scopes.pop().offset-hangingIndent}}return state.dedent&&stream.eol()&&"py"==top(state).type&&state.scopes.length>1&&state.scopes.pop(),style}return{startState:function(basecolumn){return{tokenize:tokenBase,scopes:[{offset:basecolumn||0,type:"py",align:null}],indent:basecolumn||0,lastToken:null,lambda:!1,dedent:0}},token:function(stream,state){var addErr=state.errorToken;addErr&&(state.errorToken=!1);var style=tokenLexer(stream,state);return style&&"comment"!=style&&(state.lastToken="keyword"==style||"punctuation"==style?stream.current():style),"punctuation"==style&&(style=null),stream.eol()&&state.lambda&&(state.lambda=!1),addErr?style+" "+ERRORCLASS:style},indent:function(state,textAfter){if(state.tokenize!=tokenBase)return state.tokenize.isString?CodeMirror.Pass:0;var scope=top(state),closing=scope.type==textAfter.charAt(0)||"py"==scope.type&&!state.dedent&&/^(else:|elif |except |finally:)/.test(textAfter);return null!=scope.align?scope.align-(closing?1:0):scope.offset-(closing?hangingIndent:0)},electricInput:/^\s*([\}\]\)]|else:|elif |except |finally:)$/,closeBrackets:{triples:"'\""},lineComment:"#",fold:"indent"}}),CodeMirror.defineMIME("text/x-python","python");var words=function(str){return str.split(" ")};CodeMirror.defineMIME("text/x-cython",{name:"python",extra_keywords:words("by cdef cimport cpdef ctypedef enum except extern gil include nogil property public readonly struct union DEF IF ELIF ELSE")})});
//# sourceMappingURL=python.js.map
