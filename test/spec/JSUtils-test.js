/*
 * GNU AGPL-3.0 License
 *
 * Copyright (c) 2021 - present core.ai . All rights reserved.
 * Original work Copyright (c) 2012 - 2021 Adobe Systems Incorporated. All rights reserved.
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://opensource.org/licenses/AGPL-3.0.
 *
 */

/*global describe, it, expect, beforeEach, afterEach, awaitsFor, awaitsForDone */

define(function (require, exports, module) {


    var JSUtils             = require("language/JSUtils"),
        FileSystem          = require("filesystem/FileSystem"),
        FileUtils           = require("file/FileUtils"),
        SpecRunnerUtils     = require("spec/SpecRunnerUtils");

    var testPath = SpecRunnerUtils.getTestPath("/spec/JSUtils-test-files"),
        doneLoading = false;

    var simpleJsFileEntry           = FileSystem.getFileForPath(testPath + "/simple.js");
    var trickyJsFileEntry           = FileSystem.getFileForPath(testPath + "/tricky.js");
    var invalidJsFileEntry          = FileSystem.getFileForPath(testPath + "/invalid.js");
    var jQueryJsFileEntry           = FileSystem.getFileForPath(testPath + "/jquery-1.7.js");
    var braceEndJsFileEntry         = FileSystem.getFileForPath(testPath + "/braceEnd.js");
    var eofJsFileEntry              = FileSystem.getFileForPath(testPath + "/eof.js");
    var eof2JsFileEntry             = FileSystem.getFileForPath(testPath + "/eof2.js");
    var es6ClassesFileEntry         = FileSystem.getFileForPath(testPath + "/es6-classes.js");
    var es6StaticsFileEntry         = FileSystem.getFileForPath(testPath + "/es6-static-methods.js");
    var es6InheritanceFileEntry     = FileSystem.getFileForPath(testPath + "/es6-inheritance.js");
    var es6GetterSetterFileEntry    = FileSystem.getFileForPath(testPath + "/es6-getter-setter.js");
    var es6AsyncAndArrowFileEntry   = FileSystem.getFileForPath(testPath + "/es6-async-arrow.js");

    function init(spec, fileEntry) {
        if (fileEntry) {
            FileUtils.readAsText(fileEntry)
                .done(function (text) {
                    spec.fileJsContent = text;
                })
                .always(function (text) {
                    doneLoading = true;
                });
        }
    }

    function cleanup(spec) {
        spec.fileJsContent = null;
    }


    describe("JSUtils", function () {

        describe("basics", function () {

            it("should parse an empty string", function () {
                var result = JSUtils.findAllMatchingFunctionsInText("", "myFunc");
                expect(result.length).toEqual(0);
            });
        });

        // TODO (jason-sanjose): use offset markup in these test files
        describe("line offsets", function () {

            afterEach(function () {
                cleanup(this);
            });

            // Checks the lines ranges of the results returned by JSUtils. Expects the numbers of
            // results to equal the length of 'ranges'; each entry in range gives the {start, end}
            // of the expected line range for that Nth result.

            function expectFunctionRanges(spec, jsCode, funcName, ranges) {
                var result = JSUtils.findAllMatchingFunctionsInText(jsCode, funcName);
                expect(result.length).toEqual(ranges.length);
                ranges.forEach(function (range, i) {
                    expect(result[i].lineStart).toEqual(range.start);
                    expect(result[i].lineEnd).toEqual(range.end);
                });
            }

            function expectNoFunction(jsCode, functionName) {
                var result = JSUtils.findAllMatchingFunctionsInText(jsCode, functionName);
                expect(result.length).toBe(0);
            }

            it("should not fail with SyntaxError: Escape sequence in keyword function", async function () {
                // https://github.com/acornjs/acorn/issues/1139
                // This tests fails for now till acorn loose fixes the root issue
                let result = JSUtils.findAllMatchingFunctionsInText('function unicodeTabAfter\\u0009() {}', "");
                expect(result.length).toEqual(0);
            });

            it("should return correct start and end line numbers for es6 class definitions and methods", async function () {
                doneLoading = false;
                init(this, es6ClassesFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "Shape", [ {start: 0, end: 9} ]);
                expectFunctionRanges(this, this.fileJsContent, "constructor", [ {start: 1, end: 4} ]);
                expectFunctionRanges(this, this.fileJsContent, "move", [ {start: 5, end: 8} ]);
            });

            it("should return correct start and end line numbers for es6 static class methods", async function () {
                doneLoading = false;
                init(this, es6StaticsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "Rectangle", [ {start: 0, end: 4} ]);
                expectFunctionRanges(this, this.fileJsContent, "defaultRectangle", [ {start: 1, end: 3} ]);
            });

            it("should return correct start and end line numbers for es6 class inheritance", async function () {
                doneLoading = false;
                init(this, es6InheritanceFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "Rectangle", [ {start: 0, end: 6} ]);
                expectFunctionRanges(this, this.fileJsContent, "Circle", [ {start: 7, end: 12} ]);
                expectFunctionRanges(this, this.fileJsContent, "constructor", [ {start: 1, end: 5}, {start: 8, end: 11} ]);
            });

            it("should return correct start and end line numbers for es6 class members getters/setters", async function () {
                doneLoading = false;
                init(this, es6GetterSetterFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "Rectangle", [ {start: 0, end: 10} ]);
                expectFunctionRanges(this, this.fileJsContent, "constructor", [ {start: 1, end: 4} ]);
                expectFunctionRanges(this, this.fileJsContent, "width", [ {start: 5, end: 5}, {start: 6, end: 6} ]);
                expectFunctionRanges(this, this.fileJsContent, "height", [ {start: 7, end: 7}, {start: 8, end: 8} ]);
                expectFunctionRanges(this, this.fileJsContent, "area", [ {start: 9, end: 9} ]);
            });

            it("should return correct start and end line numbers for es6 async and arrow function expressions", async function () {
                doneLoading = false;
                init(this, es6AsyncAndArrowFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "bar", [ {start: 1, end: 1} ]);
                expectFunctionRanges(this, this.fileJsContent, "fooAgain", [ {start: 3, end: 3} ]);
            });

            it("should return correct start and end line numbers for simple functions", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await  awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "simple1", [ {start: 0, end: 2} ]);
                expectFunctionRanges(this, this.fileJsContent, "simple2", [ {start: 7, end: 9} ]);
                expectFunctionRanges(this, this.fileJsContent, "simple3", [ {start: 11, end: 13} ]);
            });

            it("should return correct start and end line numbers for parameterized functions", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "param1", [ {start: 18, end: 19} ]);
                expectFunctionRanges(this, this.fileJsContent, "param2", [ {start: 24, end: 26} ]);
                expectFunctionRanges(this, this.fileJsContent, "param3", [ {start: 28, end: 32} ]);
            });

            it("should return correct start and end line numbers for single line functions", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "single1", [ {start: 35, end: 35} ]);
                expectFunctionRanges(this, this.fileJsContent, "single2", [ {start: 36, end: 36} ]);
                expectFunctionRanges(this, this.fileJsContent, "single3", [ {start: 37, end: 37} ]);
            });

            it("should return correct start and end line numbers for nested functions", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "nested1", [ {start: 42, end: 50} ]);
                expectFunctionRanges(this, this.fileJsContent, "nested2", [ {start: 44, end: 49} ]);
                expectFunctionRanges(this, this.fileJsContent, "nested3", [ {start: 47, end: 48} ]);
            });

            it("should return correct start and end line numbers for functions with keyword 'function' in name", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "my_function", [ {start: 56, end: 57} ]);
                expectFunctionRanges(this, this.fileJsContent, "function3",   [ {start: 58, end: 60} ]);
            });

            it("should return correct start and end line numbers for prototype method declarations", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "myMethod", [ {start: 66, end: 68} ]);
            });

            it("should handle various whitespace variations", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "noSpaceBeforeFunc", [ {start: 71, end: 71} ]);
                expectFunctionRanges(this, this.fileJsContent, "spaceBeforeColon", [ {start: 73, end: 75} ]);
                expectFunctionRanges(this, this.fileJsContent, "noSpaceAfterColon", [ {start: 77, end: 79} ]);
                expectFunctionRanges(this, this.fileJsContent, "fakePeriodBeforeFunction", [ {start: 82, end: 84} ]);
                expectFunctionRanges(this, this.fileJsContent, "noSpaceAfterFunction", [ {start: 86, end: 88} ]);
                expectFunctionRanges(this, this.fileJsContent, "noSpaceAfterFunction2", [ {start: 90, end: 92} ]);
                expectFunctionRanges(this, this.fileJsContent, "findMe", [ {start: 93, end: 93} ]);
            });

            it("should work with high-ascii characters in function names", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "highAscÍÍChars", [ {start: 95, end: 97} ]);
                expectFunctionRanges(this, this.fileJsContent, "moreHighAscÍÍChars", [ {start: 99, end: 101} ]);
                expectFunctionRanges(this, this.fileJsContent, "ÅsciiExtendedIdentifierStart", [ {start: 103, end: 104} ]);
            });

            it("should work with unicode characters in or around function names", async function () {
                doneLoading = false;
                init(this, simpleJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "ʸUnicodeModifierLettervalidIdentifierStart", [ {start: 106, end: 107} ]);
                expectFunctionRanges(this, this.fileJsContent, "unicodeModifierLettervalidIdentifierPartʸ", [ {start: 112, end: 113} ]);
            });

            it("should work when colliding with prototype properties", async function () { // #1390, #2813
                doneLoading = false;
                init(this, trickyJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectFunctionRanges(this, this.fileJsContent, "toString", [ {start: 1, end: 3} ]);
                expectFunctionRanges(this, this.fileJsContent, "length", [ {start: 6, end: 8} ]);
                expectFunctionRanges(this, this.fileJsContent, "hasOwnProperty", [ {start: 11, end: 13} ]);
            });

            it("should fail with invalid function names", async function () {
                doneLoading = false;
                init(this, invalidJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expectNoFunction(this.fileJsContent, "0digitIdentifierStart");
                expectNoFunction(this.fileJsContent, ".punctuationIdentifierStart");
                expectNoFunction(this.fileJsContent, "punctuation.IdentifierPart");
            });
        });

        describe("brace ends of functions", function () {
            beforeEach(async function () {
                doneLoading = false;
                init(this, braceEndJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);
            });

            afterEach(function () {
                cleanup(this);
            });

            function expectEndBrace(spec, funcName) {
                var startPos = spec.fileJsContent.indexOf("function " + funcName);
                expect(startPos).not.toBe(-1);

                var endPos = JSUtils._getFunctionEndOffset(spec.fileJsContent, startPos);
                var endMarker = spec.fileJsContent.slice(endPos);
                expect(endMarker.indexOf("//END " + funcName)).toBe(0);
            }

            it("should handle a simple function", function () {
                expectEndBrace(this, "simpleFunction");
            });
            it("should handle nested braces", function () {
                expectEndBrace(this, "nestedBraces");
            });
            it("should handle a nested function", function () {
                expectEndBrace(this, "nestedFunction");
            });
            it("should handle an end brace in a string", function () {
                expectEndBrace(this, "endBraceInString");
            });
            it("should handle an end brace in a single-quoted string", function () {
                expectEndBrace(this, "endBraceInSingleQuoteString");
            });
            it("should handle an end brace in a line comment", function () {
                expectEndBrace(this, "endBraceInLineComment");
            });
            it("should handle an end brace in a block comment", function () {
                expectEndBrace(this, "endBraceInBlockComment");
            });
            it("should handle an end brace in a multiline block comment", function () {
                expectEndBrace(this, "endBraceInMultilineBlockComment");
            });
            it("should handle an end brace in a regexp", function () {
                expectEndBrace(this, "endBraceInRegexp");
            });
            it("should handle a single-line function", function () {
                expectEndBrace(this, "singleLine");
            });
            it("should handle a single-line function with a fake brace", function () {
                expectEndBrace(this, "singleLineWithFakeBrace");
            });
            it("should handle a complicated case", function () {
                expectEndBrace(this, "itsComplicated");
            });
        });

        describe("brace end of function that ends at end of file", function () {
            it("should find the end of a function that ends exactly at the end of the file", async function () {
                doneLoading = false;
                init(this, eofJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expect(JSUtils._getFunctionEndOffset(this.fileJsContent, 0)).toBe(this.fileJsContent.length);
                cleanup(this);
            });
        });

        describe("end of function that's unclosed at end of file", function () {
            it("should find the end of a function that is unclosed at the end of the file", async function () {
                doneLoading = false;
                init(this, eof2JsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);

                expect(JSUtils._getFunctionEndOffset(this.fileJsContent, 0)).toBe(this.fileJsContent.length);
                cleanup(this);
            });
        });

        describe("with real-world jQuery JS code", function () {

            beforeEach(async function () {
                doneLoading = false;
                init(this, jQueryJsFileEntry);
                await awaitsFor(function () { return doneLoading; }, 1000);
            });

            afterEach(function () {
                cleanup(this);
            });

            it("should find the first instance of the pushStack function", function () {
                var funcNames = JSUtils.findAllMatchingFunctionsInText(this.fileJsContent, "pushStack");
                expect(funcNames).toBeTruthy();
                expect(funcNames.length).toBeGreaterThan(0);

                expect(funcNames[0]).toBeTruthy();
                expect(funcNames[0].lineStart).toBe(243);
                expect(funcNames[0].lineEnd).toBe(267);
            });

            it("should find all instances of the ready function", function () {
                var funcNames = JSUtils.findAllMatchingFunctionsInText(this.fileJsContent, "ready");
                //expect(funcNames.length).toBe(3);
                expect(funcNames.length).toBe(2);

                expect(funcNames[0].lineStart).toBe(276);
                expect(funcNames[0].lineEnd).toBe(284);
                expect(funcNames[1].lineStart).toBe(419);
                expect(funcNames[1].lineEnd).toBe(443);
                //expect(funcNames[2].lineStart).toBe(3422);    // not finding this one...
                //expect(funcNames[2].lineEnd).toBe(3425);
            });

            it("should return an empty array when findAllMatchingSelectors() can't find any matches", function () {
                var funcNames = JSUtils.findAllMatchingFunctionsInText(this.fileJsContent, "NO-SUCH-FUNCTION");
                expect(funcNames.length).toBe(0);
            });
        });

    }); // describe("JSUtils")
});
