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

/*global describe, beforeEach, afterEach, it, awaitsForDone, expect, beforeAll, afterAll */

define(function (require, exports, module) {


    // Load dependent modules
    var SpecRunnerUtils = require("spec/SpecRunnerUtils"),
        KeyEvent        = require("utils/KeyEvent"),
        Commands        = require("command/Commands"),
        EditorManager,      // loaded from brackets.test
        CommandManager,
        CodeHintManager,
        KeyBindingManager;

    var testPath = SpecRunnerUtils.getTestPath("/spec/CodeHint-test-files"),
        testWindow;

    describe("integration:CodeHintManager", function () {

        /**
         * Performs setup for a code hint test. Opens a file and set pos.
         *
         * @param {!string} openFile Project relative file path to open in a main editor.
         * @param {!number|Array} openPos The pos within openFile to place the IP, or an array
         *      representing a multiple selection to set.
         */
        async function initCodeHintTest(openFile, openPos) {
            await SpecRunnerUtils.loadProjectInTestWindow(testPath);

            var promise = SpecRunnerUtils.openProjectFiles([openFile]);
            await awaitsForDone(promise);

            var editor = EditorManager.getCurrentFullEditor();
            if (Array.isArray(openPos)) {
                editor.setSelections(openPos);
            } else {
                editor.setCursorPos(openPos.line, openPos.ch);
            }
        }

        beforeAll(async function () {
            testWindow = await SpecRunnerUtils.createTestWindowAndRun();
            // Load module instances from brackets.test
            CodeHintManager     = testWindow.brackets.test.CodeHintManager;
            EditorManager       = testWindow.brackets.test.EditorManager;
            CommandManager      = testWindow.brackets.test.CommandManager;
            KeyBindingManager   = testWindow.brackets.test.KeyBindingManager;
        }, 30000);

        afterAll(async function () {
            testWindow          = null;
            CodeHintManager     = null;
            EditorManager       = null;
            CommandManager      = null;
            KeyBindingManager   = null;
            await SpecRunnerUtils.closeTestWindow();
        });

        afterEach(function () {
            testWindow.closeAllFiles();
        });

        function invokeCodeHints() {
            CommandManager.execute(Commands.SHOW_CODE_HINTS);
        }

        // Note: these don't request hint results - they only examine hints that might already be open
        function expectNoHints() {
            var codeHintList = CodeHintManager._getCodeHintList();
            expect(codeHintList).toBeFalsy();
        }

        function expectSomeHints() {
            var codeHintList = CodeHintManager._getCodeHintList();
            expect(codeHintList).toBeTruthy();
            expect(codeHintList.isOpen()).toBe(true);
            return codeHintList;
        }

        // TODO: There seems to be an issue with CodeHintManager._removeHintProvider because of which the tests
        // added for "Hint Provider Registration" are interfering with this test case
        // (mock provider added for new language shows up for RegExp, even though no code hint should show up)
        // I am unable to reproduce this in a real scenario though/
        // This is the reason this test case is being added before the registration test cases.
        // We need to either figure out whats going wrong with register or change the RegExp code hint fix to bail
        // before HintUtils (Something like the fix for no code hints for multiple selection)
        describe("RegExp codehint tests", function () {
            it("should not show codehints for regular expression in a script block in html", async function () {
                var editor,
                    pos = {line: 8, ch: 30};

                // Place cursor inside a sample regular expression
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("test1.html", pos);

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();
                invokeCodeHints();
                expectNoHints();
                editor = null;
            });

            it("should not show codehints for regular expression in a Javascript file", async function () {
                var editor,
                    pos = {line: 2, ch: 30};

                // Place cursor inside a sample regular expression
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("testRegExp.js", pos);

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();
                invokeCodeHints();
                expectNoHints();
                editor = null;
            });
        });

        describe("Hint Provider Registration", function () {
            beforeEach(async function () {
                await initCodeHintTest("test1.html", {line: 0, ch: 0});
            });

            var mockProvider = {
                hasHints: function (editor, implicitChar) {
                    return true;
                },
                getHints: function (implicitChar) {
                    return { hints: ["mock hint"], match: null, selectInitial: false };
                },
                insertHint: function (hint) { }
            };

            function expectMockHints() {
                var codeHintList = expectSomeHints();
                expect(codeHintList.hints[0]).toBe("mock hint");
                expect(codeHintList.hints.length).toBe(1);
            }

            it("should register provider for a new language", async function () {
                CodeHintManager.registerHintProvider(mockProvider, ["clojure"], 0);

                // Ensure no hints in language we didn't register for
                invokeCodeHints();
                expectNoHints();

                // Expect hints in language we did register for
                var promise = CommandManager.execute(Commands.FILE_OPEN, { fullPath: SpecRunnerUtils.makeAbsolute("test.clj") });
                await awaitsForDone(promise);
                invokeCodeHints();
                expectMockHints();

                CodeHintManager._removeHintProvider(mockProvider, ["clojure"], 0);
            });

            it("should register higher-priority provider for existing language", function () {
                CodeHintManager.registerHintProvider(mockProvider, ["html"], 1);

                // Expect hints to replace default HTML hints
                var editor = EditorManager.getCurrentFullEditor();
                editor.setCursorPos(3, 1);
                invokeCodeHints();
                expectMockHints();

                CodeHintManager._removeHintProvider(mockProvider, ["html"], 1);
            });

            it("should register \"all\" languages provider", async function () {
                CodeHintManager.registerHintProvider(mockProvider, ["all"], 0);

                // Expect hints in language that already had hints (when not colliding with original provider)
                invokeCodeHints();
                expectMockHints();

                // Expect hints in language that had no hints before
                var promise = CommandManager.execute(Commands.FILE_OPEN, { fullPath: SpecRunnerUtils.makeAbsolute("test.clj") });
                await awaitsForDone(promise);
                invokeCodeHints();
                expectMockHints();

                CodeHintManager._removeHintProvider(mockProvider, ["all"], 0);
            });
        });


        describe("HTML Tests", function () {

            it("should show code hints menu and insert text at IP", async function () {
                var editor,
                    pos = {line: 3, ch: 1},
                    lineBefore,
                    lineAfter;

                // minimal markup with an open '<' before IP
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("test1.html", pos);

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();

                // get text before insert operation
                lineBefore = editor.document.getLine(pos.line);

                invokeCodeHints();
                expectSomeHints();

                // simulate Enter key to insert code hint into doc
                var e = $.Event("keydown");
                e.keyCode = KeyEvent.DOM_VK_RETURN;

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();

                CodeHintManager._getCodeHintList()._keydownHook(e);

                // doesn't matter what was inserted, but line should be different
                var newPos = editor.getCursorPos();
                lineAfter = editor.document.getLine(newPos.line);
                expect(lineBefore).not.toEqual(lineAfter);

                // and popup should auto-close
                expectNoHints();

                editor = null;
            });

            it("should go to next hint with ctrl+space", async function () {
                var editor,
                    pos = {line: 3, ch: 1},
                    hintBefore,
                    hintAfter;

                // minimal markup with an open '<' before IP
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("test1.html", pos);

                // simulate ctrl+space key to make sure it goes to next hint
                var e = $.Event("keydown");
                e.keyCode = KeyEvent.DOM_VK_SPACE;
                e.ctrlKey = true;

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();

                invokeCodeHints();
                var codeHintList = expectSomeHints();
                hintBefore = codeHintList.selectedIndex;

                // make sure hint list starts at 0
                expect(hintBefore).toEqual(0);

                // simulate ctrl+space keyhook
                CodeHintManager._getCodeHintList()._keydownHook(e);
                hintAfter = codeHintList.selectedIndex;

                // selectedIndex should be one more after doing ctrl+space key event.
                expect(hintBefore).toEqual(hintAfter-1);

                editor = null;
            });

            it("should loop to first hint when ctrl+space at last hint", async function () {
                var editor,
                    pos = {line: 3, ch: 1},
                    hintBefore,
                    hintAfter;

                // minimal markup with an open '<' before IP
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("test1.html", pos);

                // simulate ctrl+space key to make sure it goes to next hint
                var e = $.Event("keydown");
                e.keyCode = KeyEvent.DOM_VK_UP;

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();

                invokeCodeHints();

                // simulate up keyhook to send it to last hint
                CodeHintManager._getCodeHintList()._keydownHook(e);

                var codeHintList = expectSomeHints();
                hintBefore = codeHintList.selectedIndex;
                var numberOfHints = codeHintList.$hintMenu.find("li").length-1;

                // should be at last hint
                expect(hintBefore).toEqual(numberOfHints);

                // call ctrl+space to loop it to first hint
                e.keyCode = KeyEvent.DOM_VK_SPACE;
                e.ctrlKey = true;

                // simulate ctrl+space keyhook to send it to first hint
                CodeHintManager._getCodeHintList()._keydownHook(e);
                hintAfter = codeHintList.selectedIndex;

                // should now be at hint 0
                expect(hintAfter).toEqual(0);

                editor = null;
            });

            it("should not show code hints if there is a multiple selection", async function () {
                // minimal markup with an open '<' before IP
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("test1.html", [
                    {start: {line: 3, ch: 1}, end: {line: 3, ch: 1}, primary: true},
                    {start: {line: 4, ch: 1}, end: {line: 4, ch: 1}}
                ]);

                invokeCodeHints();
                expectNoHints();
            });

            it("should dismiss existing code hints if selection changes to a multiple selection", async function () {
                var editor;

                await initCodeHintTest("test1.html", {line: 3, ch: 1});

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();

                invokeCodeHints();
                expectSomeHints();

                editor.setSelections([
                    {start: {line: 3, ch: 1}, end: {line: 3, ch: 1}, primary: true},
                    {start: {line: 4, ch: 1}, end: {line: 4, ch: 1}}
                ]);
                expectNoHints();
            });

            it("should dismiss code hints menu with Esc key", async function () {
                var pos = {line: 3, ch: 1};

                // minimal markup with an open '<' before IP
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("test1.html", pos);

                invokeCodeHints();

                // verify list is open
                expectSomeHints();

                // simulate Esc key to dismiss code hints menu
                var key = KeyEvent.DOM_VK_ESCAPE,
                    element = testWindow.$(".dropdown.open")[0];
                SpecRunnerUtils.simulateKeyEvent(key, "keydown", element);

                // verify list is no longer open
                expectNoHints();
            });

            it("should dismiss code hints menu when launching a command", async function () {
                var editor,
                    pos = {line: 3, ch: 1};

                // minimal markup with an open '<' before IP
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("test1.html", pos);

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();

                editor.document.replaceRange("di", pos);
                invokeCodeHints();

                // verify list is open
                expectSomeHints();

                // Call Undo command to remove "di" and then verify no code hints
                CommandManager.execute(Commands.EDIT_UNDO);

                // verify list is no longer open
                expectNoHints();

                editor = null;
            });

            it("should stop handling keydowns if closed by a click outside", async function () {
                var editor,
                    pos = {line: 3, ch: 1};

                // minimal markup with an open '<' before IP
                // Note: line for pos is 0-based and editor lines numbers are 1-based
                await initCodeHintTest("test1.html", pos);

                editor = EditorManager.getCurrentFullEditor();
                expect(editor).toBeTruthy();

                editor.document.replaceRange("di", pos);
                invokeCodeHints();

                // verify list is open
                expectSomeHints();

                // get the document text and make sure it doesn't change if we
                // click outside and then keydown
                var text = editor.document.getText();

                testWindow.$("body").click();
                KeyBindingManager._handleKeyEvent({
                    keyCode: KeyEvent.DOM_VK_ENTER,
                    stopImmediatePropagation: function () { },
                    stopPropagation: function () { },
                    preventDefault: function () { }
                });

                // Verify that after the keydown, the session is closed
                // (not just the hint popup). Because of #1381, we don't
                // actually have a way to close the session as soon as the
                // popup is dismissed by Bootstrap, so we do so on the next
                // keydown. Eventually, once that's fixed, we should be able
                // to move this expectNoHints() up after the click.
                expectNoHints();
                expect(editor.document.getText()).toEqual(text);

                editor = null;
            });
        });
    });
});
