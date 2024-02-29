!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";CodeMirror.registerHelper("fold","markdown",function(cm,start){var maxDepth=100;function isHeader(lineNo){var tokentype=cm.getTokenTypeAt(CodeMirror.Pos(lineNo,0));return tokentype&&/\bheader\b/.test(tokentype)}function headerLevel(lineNo,line,nextLine){var match=line&&line.match(/^#+/);return match&&isHeader(lineNo)?match[0].length:(match=nextLine&&nextLine.match(/^[=\-]+\s*$/))&&isHeader(lineNo+1)?"="==nextLine[0]?1:2:maxDepth}var firstLine=cm.getLine(start.line),nextLine=cm.getLine(start.line+1),level=headerLevel(start.line,firstLine,nextLine);if(level!==maxDepth){for(var lastLineNo=cm.lastLine(),end=start.line,nextNextLine=cm.getLine(end+2);end<lastLineNo&&!(headerLevel(end+1,nextLine,nextNextLine)<=level);)++end,nextLine=nextNextLine,nextNextLine=cm.getLine(end+2);return{from:CodeMirror.Pos(start.line,firstLine.length),to:CodeMirror.Pos(end,cm.getLine(end).length)}}})});
//# sourceMappingURL=markdown-fold.js.map
