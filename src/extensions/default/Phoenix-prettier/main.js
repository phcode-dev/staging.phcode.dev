define(function(require,exports,module){const AppInit=brackets.getModule("utils/AppInit"),Strings=brackets.getModule("strings"),FileUtils=brackets.getModule("file/FileUtils"),LanguageManager=brackets.getModule("language/LanguageManager"),BeautificationManager=brackets.getModule("features/BeautificationManager"),PreferencesManager=brackets.getModule("preferences/PreferencesManager"),Editor=brackets.getModule("editor/Editor").Editor,ExtensionsWorker=brackets.getModule("worker/ExtensionsWorker"),prefs=PreferencesManager.getExtensionPrefs("beautify");prefs.definePreference("options","object",{printWidth:80,semi:!0,trailingComma:"none",singleQuote:!1,quoteProps:"as-needed",bracketSameLine:!0,singleAttributePerLine:!1,proseWrap:"always"},{description:Strings.BEAUTIFY_OPTIONS,keys:{printWidth:{type:"number",description:Strings.BEAUTIFY_OPTION_PRINT_WIDTH,initial:80},semi:{type:"boolean",description:Strings.BEAUTIFY_OPTION_SEMICOLON,initial:!0},trailingComma:{type:"string",description:Strings.BEAUTIFY_OPTION_PRINT_TRAILING_COMMAS,values:["none","es5","all"],initial:"none"},singleQuote:{type:"boolean",description:Strings.BEAUTIFY_OPTION_SINGLE_QUOTE,initial:!1},quoteProps:{type:"string",description:Strings.BEAUTIFY_OPTION_QUOTE_PROPS,values:["as-needed","consistent","preserve"],initial:"as-needed"},proseWrap:{type:"string",description:Strings.BEAUTIFY_OPTION_PROSE_WRAP,values:["always","never","preserve"],initial:"always"},bracketSameLine:{type:"boolean",description:Strings.BEAUTIFY_OPTION_BRACKET_SAME_LINE,initial:!0},singleAttributePerLine:{type:"boolean",description:Strings.BEAUTIFY_OPTION_SINGLE_ATTRIBUTE_PER_LINE,initial:!1}}});const parsersForLanguage={html:"html",xml:"html",handlebars:"html",svg:"html",css:"css",less:"less",scss:"scss",javascript:"babel",jsx:"babel",json:"json-stringify",typescript:"typescript",php:"php",markdown:"markdown",gfm:"markdown",yaml:"yaml"};function _computePaddingForSelection(selectionLineText,chToStart){let trimmedLine=selectionLineText.trim(),padding=selectionLineText.substring(0,chToStart),firstLinePadding="";if(trimmedLine){let index=selectionLineText.indexOf(trimmedLine);index>chToStart&&(firstLinePadding=selectionLineText.substring(chToStart,index)),padding=selectionLineText.substring(0,index)}return{padding:padding,firstLinePadding:firstLinePadding}}function _fixTabs(text,padding,firstLinePadding){const result=text.split(/\r?\n/);if(!result||0===result.length)return text;let paddedText=firstLinePadding+result[0].trim(),length=result[result.length-1].trim()?result.length:result.length-1,lineEndingChar=FileUtils.sniffLineEndings(text)===FileUtils.LINE_ENDINGS_LF?"\n":"\r\n";for(let i=1;i<length;i++)paddedText=result[i].trim()?`${paddedText}${lineEndingChar}${padding}${result[i]}`:`${paddedText}${lineEndingChar}${result[i]}`;return paddedText}function _adjustPrintWidthOption(prettierParams,padding){let paddingPercent;padding.length/prettierParams.options.printWidth*100<70&&(prettierParams.options.printWidth=prettierParams.options.printWidth-padding.length)}function _trySelectionWithPartialText(editor,prettierParams){return new Promise((resolve,reject)=>{console.log("beautifying selection with partial text");let selection=editor.getSelection(),selectionLineText=editor.document.getLine(selection.start.line),{padding:padding,firstLinePadding:firstLinePadding}=_computePaddingForSelection(selectionLineText,selection.start.ch);_adjustPrintWidthOption(prettierParams,padding);let originalText=editor.document.getText();prettierParams.text=editor.getSelectedText(),ExtensionsWorker.execPeer("prettify",prettierParams).then(response=>{response&&response.text?resolve({originalText:originalText,changedText:_fixTabs(response.text,padding,firstLinePadding),ranges:{replaceStart:selection.start,replaceEnd:selection.end}}):reject()}).catch(reject)})}function _clone(obj){return Object.assign({},obj)}function beautifyEditorProvider(editor){return new Promise((resolve,reject)=>{let filepath=editor.document.file.fullPath,languageId=LanguageManager.getLanguageForPath(filepath).getId();_loadPlugins(languageId),console.log("Beautifying with language id: ",languageId);let selection=editor.getSelections();if(!parsersForLanguage[languageId]||selection.length>1)return void reject();let options=prefs.get("options"),indentWithTabs=Editor.getUseTabChar(filepath);Object.assign(options,{parser:parsersForLanguage[languageId],tabWidth:indentWithTabs?Editor.getTabSize():Editor.getSpaceUnits(),useTabs:indentWithTabs,filepath:filepath,endOfLine:"win"===Phoenix.platform?"crlf":"lf"});let prettierParams={text:editor.document.getText(),options:options};editor.hasSelection()?_trySelectionWithPartialText(editor,_clone(prettierParams)).then(resolve).catch(error=>{console.log("Could not prettify selection",error),reject(error)}):ExtensionsWorker.execPeer("prettify",prettierParams).then(response=>{response?resolve({originalText:prettierParams.text,changedText:response.text}):reject()}).catch(err=>{console.log("Could not prettify text",err),reject(err)})})}let loadedPlugins={};function _loadPlugins(languageId){!loadedPlugins[languageId]&&parsersForLanguage[languageId]&&ExtensionsWorker.execPeer("loadPrettierPlugin",parsersForLanguage[languageId]).catch(err=>{console.error("Error Loading Prettier Plugin",err)}),loadedPlugins[languageId]=!0}function beautifyTextProvider(textToBeautify,filePathOrFileName){return new Promise((resolve,reject)=>{let languageId=LanguageManager.getLanguageForPath(filePathOrFileName).getId();_loadPlugins(languageId),console.log("Beautifying text with language id: ",languageId);let options=prefs.get("options"),indentWithTabs=Editor.getUseTabChar(filePathOrFileName);Object.assign(options,{parser:parsersForLanguage[languageId],tabWidth:indentWithTabs?Editor.getTabSize():Editor.getSpaceUnits(),useTabs:indentWithTabs,filepath:filePathOrFileName});let prettierParams={text:textToBeautify,options:options};ExtensionsWorker.execPeer("prettify",prettierParams).then(response=>{response?resolve({originalText:textToBeautify,changedText:response.text}):reject()}).catch(err=>{console.log("Could not prettify text",err),reject(err)})})}AppInit.appReady(function(){ExtensionsWorker.loadScriptInWorker(`${module.uri}/../worker/prettier-helper.js`),BeautificationManager.registerBeautificationProvider(exports,Object.keys(parsersForLanguage))}),exports.beautifyEditorProvider=beautifyEditorProvider,exports.beautifyTextProvider=beautifyTextProvider});
//# sourceMappingURL=main.js.map
