!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";CodeMirror.defineMode("xquery",function(){var keywords=function(){function kw(type){return{type:type,style:"keyword"}}for(var operator=kw("operator"),atom={type:"atom",style:"atom"},punctuation,qualifier={type:"axis_specifier",style:"qualifier"},kwObj={",":{type:"punctuation",style:null}},basic=["after","all","allowing","ancestor","ancestor-or-self","any","array","as","ascending","at","attribute","base-uri","before","boundary-space","by","case","cast","castable","catch","child","collation","comment","construction","contains","content","context","copy","copy-namespaces","count","decimal-format","declare","default","delete","descendant","descendant-or-self","descending","diacritics","different","distance","document","document-node","element","else","empty","empty-sequence","encoding","end","entire","every","exactly","except","external","first","following","following-sibling","for","from","ftand","ftnot","ft-option","ftor","function","fuzzy","greatest","group","if","import","in","inherit","insensitive","insert","instance","intersect","into","invoke","is","item","language","last","lax","least","let","levels","lowercase","map","modify","module","most","namespace","next","no","node","nodes","no-inherit","no-preserve","not","occurs","of","only","option","order","ordered","ordering","paragraph","paragraphs","parent","phrase","preceding","preceding-sibling","preserve","previous","processing-instruction","relationship","rename","replace","return","revalidation","same","satisfies","schema","schema-attribute","schema-element","score","self","sensitive","sentence","sentences","sequence","skip","sliding","some","stable","start","stemming","stop","strict","strip","switch","text","then","thesaurus","times","to","transform","treat","try","tumbling","type","typeswitch","union","unordered","update","updating","uppercase","using","validate","value","variable","version","weight","when","where","wildcards","window","with","without","word","words","xquery"],i=0,l=basic.length;i<l;i++)kwObj[basic[i]]=kw(basic[i]);for(var types=["xs:anyAtomicType","xs:anySimpleType","xs:anyType","xs:anyURI","xs:base64Binary","xs:boolean","xs:byte","xs:date","xs:dateTime","xs:dateTimeStamp","xs:dayTimeDuration","xs:decimal","xs:double","xs:duration","xs:ENTITIES","xs:ENTITY","xs:float","xs:gDay","xs:gMonth","xs:gMonthDay","xs:gYear","xs:gYearMonth","xs:hexBinary","xs:ID","xs:IDREF","xs:IDREFS","xs:int","xs:integer","xs:item","xs:java","xs:language","xs:long","xs:Name","xs:NCName","xs:negativeInteger","xs:NMTOKEN","xs:NMTOKENS","xs:nonNegativeInteger","xs:nonPositiveInteger","xs:normalizedString","xs:NOTATION","xs:numeric","xs:positiveInteger","xs:precisionDecimal","xs:QName","xs:short","xs:string","xs:time","xs:token","xs:unsignedByte","xs:unsignedInt","xs:unsignedLong","xs:unsignedShort","xs:untyped","xs:untypedAtomic","xs:yearMonthDuration"],i=0,l=types.length;i<l;i++)kwObj[types[i]]=atom;for(var operators=["eq","ne","lt","le","gt","ge",":=","=",">",">=","<","<=",".","|","?","and","or","div","idiv","mod","*","/","+","-"],i=0,l=operators.length;i<l;i++)kwObj[operators[i]]=operator;for(var axis_specifiers=["self::","attribute::","child::","descendant::","descendant-or-self::","parent::","ancestor::","ancestor-or-self::","following::","preceding::","following-sibling::","preceding-sibling::"],i=0,l=axis_specifiers.length;i<l;i++)kwObj[axis_specifiers[i]]=qualifier;return kwObj}();function chain(stream,state,f){return state.tokenize=f,f(stream,state)}function tokenBase(stream,state){var ch=stream.next(),mightBeFunction=!1,isEQName=isEQNameAhead(stream);if("<"==ch){if(stream.match("!--",!0))return chain(stream,state,tokenXMLComment);if(stream.match("![CDATA",!1))return state.tokenize=tokenCDATA,"tag";if(stream.match("?",!1))return chain(stream,state,tokenPreProcessing);var isclose=stream.eat("/");stream.eatSpace();for(var tagName="",c;c=stream.eat(/[^\s\u00a0=<>\"\'\/?]/);)tagName+=c;return chain(stream,state,tokenTag(tagName,isclose))}if("{"==ch)return pushStateStack(state,{type:"codeblock"}),null;if("}"==ch)return popStateStack(state),null;if(isInXmlBlock(state))return">"==ch?"tag":"/"==ch&&stream.eat(">")?(popStateStack(state),"tag"):"variable";if(/\d/.test(ch))return stream.match(/^\d*(?:\.\d*)?(?:E[+\-]?\d+)?/),"atom";if("("===ch&&stream.eat(":"))return pushStateStack(state,{type:"comment"}),chain(stream,state,tokenComment);if(isEQName||'"'!==ch&&"'"!==ch){if("$"===ch)return chain(stream,state,tokenVariable);if(":"===ch&&stream.eat("="))return"keyword";if("("===ch)return pushStateStack(state,{type:"paren"}),null;if(")"===ch)return popStateStack(state),null;if("["===ch)return pushStateStack(state,{type:"bracket"}),null;if("]"===ch)return popStateStack(state),null;var known=keywords.propertyIsEnumerable(ch)&&keywords[ch];if(isEQName&&'"'===ch)for(;'"'!==stream.next(););if(isEQName&&"'"===ch)for(;"'"!==stream.next(););known||stream.eatWhile(/[\w\$_-]/);var foundColon=stream.eat(":");!stream.eat(":")&&foundColon&&stream.eatWhile(/[\w\$_-]/),stream.match(/^[ \t]*\(/,!1)&&(mightBeFunction=!0);var word=stream.current();return known=keywords.propertyIsEnumerable(word)&&keywords[word],mightBeFunction&&!known&&(known={type:"function_call",style:"variable def"}),isInXmlConstructor(state)?(popStateStack(state),"variable"):("element"!=word&&"attribute"!=word&&"axis_specifier"!=known.type||pushStateStack(state,{type:"xmlconstructor"}),known?known.style:"variable")}return chain(stream,state,tokenString(ch))}function tokenComment(stream,state){for(var maybeEnd=!1,maybeNested=!1,nestedCount=0,ch;ch=stream.next();){if(")"==ch&&maybeEnd){if(!(nestedCount>0)){popStateStack(state);break}nestedCount--}else":"==ch&&maybeNested&&nestedCount++;maybeEnd=":"==ch,maybeNested="("==ch}return"comment"}function tokenString(quote,f){return function(stream,state){var ch;if(isInString(state)&&stream.current()==quote)return popStateStack(state),f&&(state.tokenize=f),"string";if(pushStateStack(state,{type:"string",name:quote,tokenize:tokenString(quote,f)}),stream.match("{",!1)&&isInXmlAttributeBlock(state))return state.tokenize=tokenBase,"string";for(;ch=stream.next();){if(ch==quote){popStateStack(state),f&&(state.tokenize=f);break}if(stream.match("{",!1)&&isInXmlAttributeBlock(state))return state.tokenize=tokenBase,"string"}return"string"}}function tokenVariable(stream,state){var isVariableChar=/[\w\$_-]/;if(stream.eat('"')){for(;'"'!==stream.next(););stream.eat(":")}else stream.eatWhile(isVariableChar),stream.match(":=",!1)||stream.eat(":");return stream.eatWhile(isVariableChar),state.tokenize=tokenBase,"variable"}function tokenTag(name,isclose){return function(stream,state){return stream.eatSpace(),isclose&&stream.eat(">")?(popStateStack(state),state.tokenize=tokenBase,"tag"):(stream.eat("/")||pushStateStack(state,{type:"tag",name:name,tokenize:tokenBase}),stream.eat(">")?(state.tokenize=tokenBase,"tag"):(state.tokenize=tokenAttribute,"tag"))}}function tokenAttribute(stream,state){var ch=stream.next();return"/"==ch&&stream.eat(">")?(isInXmlAttributeBlock(state)&&popStateStack(state),isInXmlBlock(state)&&popStateStack(state),"tag"):">"==ch?(isInXmlAttributeBlock(state)&&popStateStack(state),"tag"):"="==ch?null:'"'==ch||"'"==ch?chain(stream,state,tokenString(ch,tokenAttribute)):(isInXmlAttributeBlock(state)||pushStateStack(state,{type:"attribute",tokenize:tokenAttribute}),stream.eat(/[a-zA-Z_:]/),stream.eatWhile(/[-a-zA-Z0-9_:.]/),stream.eatSpace(),(stream.match(">",!1)||stream.match("/",!1))&&(popStateStack(state),state.tokenize=tokenBase),"attribute")}function tokenXMLComment(stream,state){for(var ch;ch=stream.next();)if("-"==ch&&stream.match("->",!0))return state.tokenize=tokenBase,"comment"}function tokenCDATA(stream,state){for(var ch;ch=stream.next();)if("]"==ch&&stream.match("]",!0))return state.tokenize=tokenBase,"comment"}function tokenPreProcessing(stream,state){for(var ch;ch=stream.next();)if("?"==ch&&stream.match(">",!0))return state.tokenize=tokenBase,"comment meta"}function isInXmlBlock(state){return isIn(state,"tag")}function isInXmlAttributeBlock(state){return isIn(state,"attribute")}function isInXmlConstructor(state){return isIn(state,"xmlconstructor")}function isInString(state){return isIn(state,"string")}function isEQNameAhead(stream){return'"'===stream.current()?stream.match(/^[^\"]+\"\:/,!1):"'"===stream.current()&&stream.match(/^[^\"]+\'\:/,!1)}function isIn(state,type){return state.stack.length&&state.stack[state.stack.length-1].type==type}function pushStateStack(state,newState){state.stack.push(newState)}function popStateStack(state){state.stack.pop();var reinstateTokenize=state.stack.length&&state.stack[state.stack.length-1].tokenize;state.tokenize=reinstateTokenize||tokenBase}return{startState:function(){return{tokenize:tokenBase,cc:[],stack:[]}},token:function(stream,state){return stream.eatSpace()?null:state.tokenize(stream,state);var style},blockCommentStart:"(:",blockCommentEnd:":)"}}),CodeMirror.defineMIME("application/xquery","xquery")});
//# sourceMappingURL=xquery.js.map
