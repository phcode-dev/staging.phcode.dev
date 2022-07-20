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

/*global describe, it, expect, afterEach, awaitsFor, awaitsForDone, beforeAll, afterAll, awaits */

define(function (require, exports, module) {


    var ProjectManager,     // Load from brackets.test
        CommandManager,     // Load from brackets.test
        FileSystem,         // Load from brackets.test
        Dialogs             = require("widgets/Dialogs"),
        Commands            = require("command/Commands"),
        FileSystemError     = require("filesystem/FileSystemError"),
        SpecRunnerUtils     = require("spec/SpecRunnerUtils"),
        _                   = require("thirdparty/lodash");


    describe("integration:ProjectManager", function () {

        var testPath = SpecRunnerUtils.getTestPath("/spec/ProjectManager-test-files"),
            tempDir  = SpecRunnerUtils.getTempDirectory(),
            testWindow,
            brackets;

        beforeAll(async function () {
            await SpecRunnerUtils.createTempDirectory();

            // copy files to temp directory
            await awaitsForDone(SpecRunnerUtils.copyPath(testPath, tempDir), "copy temp files");

            await awaitsForDone(SpecRunnerUtils.rename(tempDir + "/git/", tempDir + "/.git/"), "move files");

            testWindow = await SpecRunnerUtils.createTestWindowAndRun();

            // Load module instances from brackets.test
            brackets       = testWindow.brackets;
            ProjectManager = testWindow.brackets.test.ProjectManager;
            CommandManager = testWindow.brackets.test.CommandManager;
            FileSystem     = testWindow.brackets.test.FileSystem;

            await SpecRunnerUtils.loadProjectInTestWindow(tempDir);
        });

        afterAll(async function () {
            testWindow     = null;
            brackets       = null;
            ProjectManager = null;
            CommandManager = null;
            await SpecRunnerUtils.closeTestWindow();
            await SpecRunnerUtils.removeTempDirectory();
        });

        afterEach(function () {
            testWindow.closeAllFiles();
        });

        async function waitForDialog() {
            var $dlg;
            await awaitsFor(function () {
                $dlg = testWindow.$(".modal.instance");
                return $dlg.length > 0;
            }, 300, "dialog to appear");
        }

        describe("createNewItem", function () {
            it("should create a new file with a given name", async function () {
                var didCreate = false, gotError = false;

                // skip rename
                ProjectManager.createNewItem(tempDir, "Untitled.js", true)
                    .done(function () { didCreate = true; })
                    .fail(function () { gotError = true; });
                await awaitsFor(function () { return didCreate && !gotError; }, "ProjectManager.createNewItem() timeout", 5000);

                var error, stat, complete = false;
                var filePath = tempDir + "/Untitled.js";
                var file = FileSystem.getFileForPath(filePath);

                file.stat(function (err, _stat) {
                    error = err;
                    stat = _stat;
                    complete = true;
                });

                await awaitsFor(function () { return complete; }, 1000);

                expect(error).toBeFalsy();
                expect(stat.isFile).toBe(true);
            });

            it("should fail when a file already exists", async function () {
                var didCreate = false, gotError = false;

                // skip rename
                ProjectManager.createNewItem(tempDir, "file.js", true)
                    .done(function () { didCreate = true; })
                    .fail(function () { gotError = true; });
                await awaitsFor(function () { return !didCreate && gotError; }, "ProjectManager.createNewItem() timeout", 5000);
                await waitForDialog();

                expect(gotError).toBeTruthy();
                expect(didCreate).toBeFalsy();

                SpecRunnerUtils.clickDialogButton(Dialogs.DIALOG_BTN_OK);
            });

            it("should fail when a file name matches a directory that already exists", async function () {
                var didCreate = false, gotError = false;

                // skip rename
                ProjectManager.createNewItem(tempDir, "directory", true)
                    .done(function () { didCreate = true; })
                    .fail(function () { gotError = true; });
                await awaitsFor(function () { return !didCreate && gotError; }, "ProjectManager.createNewItem() timeout", 5000);
                await waitForDialog();

                expect(gotError).toBeTruthy();
                expect(didCreate).toBeFalsy();

                await SpecRunnerUtils.clickDialogButton(Dialogs.DIALOG_BTN_OK);
            });

            it("should fail when file name contains special characters", async function () {
                var chars = "/?*:<>\\|\"";  // invalid characters on Windows
                var i = 0;
                var len = 0;
                var charAt, didCreate, gotError;

                if (brackets.platform === "mac") {
                    chars = "?*|:";
                } else if (brackets.platform === "linux") {
                    chars = "?*|/";
                }
                len = chars.length;

                function createFile() {
                    // skip rename
                    ProjectManager.createNewItem(tempDir, "file" + charAt + ".js", true)
                        .done(function () { didCreate = true; })
                        .fail(function () { gotError = true; });
                }

                function waitForFileCreate() {
                    return !didCreate && gotError;
                }

                async function assertFile() {
                    expect(gotError).toBeTruthy();
                    expect(didCreate).toBeFalsy();

                    await SpecRunnerUtils.clickDialogButton(Dialogs.DIALOG_BTN_OK);
                }

                for (i = 0; i < len; i++) {
                    didCreate = false;
                    gotError = false;
                    charAt = chars.charAt(i);

                    createFile();
                    await awaitsFor(waitForFileCreate, "ProjectManager.createNewItem() timeout", 5000);
                    await waitForDialog();

                    await assertFile();
                }
            });

            it("should fail when file name is invalid", async function () {
                var files = ['com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
                    'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
                    'nul', 'con', 'prn', 'aux', '.', '..', '...'];
                var i = 0;
                var len = files.length;
                var fileAt, didCreate, gotError;

                function createFile() {
                    // skip rename
                    ProjectManager.createNewItem(tempDir, fileAt, true)
                        .done(function () { didCreate = true; })
                        .fail(function () { gotError = true; });
                }

                function waitForFileCreate() {
                    return didCreate || gotError;
                }

                async function assertFile() {
                    expect(gotError).toBeTruthy();
                    expect(didCreate).toBeFalsy();

                    await SpecRunnerUtils.clickDialogButton(Dialogs.DIALOG_BTN_OK);
                }

                for (i = 0; i < len; i++) {
                    didCreate = false;
                    gotError = false;
                    fileAt = files[i];

                    createFile();
                    await awaitsFor(waitForFileCreate, "ProjectManager.createNewItem() timeout", 5000);
                    await waitForDialog();

                    await assertFile();
                }
            }, 30000);

            // Issue #10183 -- Brackets writing to filtered directories could cause them to appear
            // in the file tree
            it("should not display excluded entry when resolved and written to", async function () {
                var opFailed = false,
                    doneResolving = false,
                    doneWriting = false,
                    entry;

                var found = testWindow.$(".jstree-brackets span:contains(\".git\")").length;
                expect(found).toBe(0);

                FileSystem.resolve(ProjectManager.getProjectRoot().fullPath + ".git/", function (err, e, stat) {
                    if (err) {
                        opFailed = true;
                        return;
                    }
                    entry = e;
                    doneResolving = true;
                });

                await awaitsFor(function () {
                    return !opFailed && doneResolving;
                }, "FileSystem.resolve()", 500);

                var file = FileSystem.getFileForPath(entry.fullPath + "test");
                file.write("hi there!", function (err) {
                    if (err) {
                        opFailed = true;
                        return;
                    }
                    doneWriting = true;
                });

                await awaitsFor(function () {
                    return !opFailed && doneWriting;
                }, "create a file under .git", 500);

                // wait for the fs event to propagate to the project model
                await awaits(500);

                found = testWindow.$(".jstree-brackets span:contains(\".git\")").length;
                let    sanity = testWindow.$(".jstree-brackets span:contains(\"file\") + span:contains(\".js\")").length;
                expect(sanity).toBe(1);
                expect(found).toBe(0);

            });

        });

        describe("deleteItem", function () {
            it("should delete the selected file in the project tree", async function () {
                var complete    = false,
                    newFile     = FileSystem.getFileForPath(tempDir + "/brackets_unittests_delete_me.js"),
                    selectedFile,
                    error,
                    stat;

                // Create a file and select it in the project tree.
                complete = false;
                ProjectManager.createNewItem(tempDir, "brackets_unittests_delete_me.js", true)
                    .always(function () { complete = true; });
                await awaitsFor(function () { return complete; }, "ProjectManager.createNewItem() timeout", 5000);

                complete = false;
                newFile.stat(function (err, _stat) {
                    error = err;
                    stat = _stat;
                    complete = true;
                });
                await awaitsFor(function () { return complete; }, 1000);
                // give some time for fle to be opened and visible in files panel. Ideally, we should be hooking on to
                // editor file changed event. If this pops up in the future.
                let waitDone = false;
                setTimeout(()=>{waitDone = true;}, 1000);
                await awaitsFor(function () { return waitDone; }, 1500);

                // Verify the existence of the new file and make sure it is selected in the project tree.
                expect(error).toBeFalsy();
                expect(stat.isFile).toBe(true);
                selectedFile = ProjectManager.getSelectedItem();
                expect(selectedFile.fullPath).toBe(tempDir + "/brackets_unittests_delete_me.js");

                // delete the new file
                var promise = ProjectManager.deleteItem(selectedFile);
                await awaitsForDone(promise, "ProjectManager.deleteItem() timeout", 5000);

                // Verify that file no longer exists.
                complete = false;
                newFile.stat(function (err, _stat) {
                    error = err;
                    stat = _stat;
                    complete = true;
                });
                await awaitsFor(function () { return complete; }, 1000);

                expect(error).toBe(FileSystemError.NOT_FOUND);

                // Verify that some other file is selected in the project tree.
                var curSelectedFile = ProjectManager.getSelectedItem();
                expect(curSelectedFile).not.toBe(selectedFile);
            });

            it("should delete the selected folder and all items in it.", async function () {
                var complete        = false,
                    rootFolderName  = tempDir + "/toDelete1/",
                    rootFolderEntry = FileSystem.getDirectoryForPath(rootFolderName),
                    error,
                    stat,
                    promise;

                // Delete the root folder and all files/folders in it.
                promise = ProjectManager.deleteItem(rootFolderEntry);
                await awaitsForDone(promise, "ProjectManager.deleteItem() timeout", 5000);

                // Verify that the root folder no longer exists.
                var rootFolder = FileSystem.getDirectoryForPath(rootFolderName);
                complete = false;
                rootFolder.stat(function (err, _stat) {
                    error = err;
                    stat = _stat;
                    complete = true;
                });
                await awaitsFor(function () { return complete; }, 1000);

                expect(error).toBe(FileSystemError.NOT_FOUND);

                // Verify that some other file is selected in the project tree.
                var curSelectedFile = ProjectManager.getSelectedItem();
                expect(curSelectedFile).not.toBe(rootFolderEntry);
            });
        });

        describe("Selection indicator", function () {

            function getItemName(fullPath) {
                if (fullPath === null) {
                    return null;
                }

                var isFolder      = _.last(fullPath) === "/",
                    withoutSlash  = isFolder ? fullPath.substr(0, fullPath.length - 1) : fullPath;

                return _.last(withoutSlash.split("/"));
            }

            function expectSelected(fullPath) {
                var $projectTreeItems = testWindow.$("#project-files-container > div > div > ul").children(),
                    $selectedItem     = $projectTreeItems.find("a.jstree-clicked");

                var name = getItemName(fullPath);

                if (!name) {
                    expect($selectedItem.length).toBe(0);
                } else {
                    expect($selectedItem.length).toBe(1);
                    expect($selectedItem.text().trim()).toBe(name);
                }
            }

            /**
             * ProjectManager pauses between renders for performance reasons. For some tests,
             * we'll need to wait for the next render.
             */
            async function waitForRenderDebounce() {
                await awaits(ProjectManager._RENDER_DEBOUNCE_TIME);
            }

            it("should deselect after opening file not rendered in tree", async function () {
                var promise,
                    exposedFile   = tempDir + "/file.js",
                    unexposedFile = tempDir + "/directory/interiorfile.js";

                promise = CommandManager.execute(Commands.FILE_OPEN, { fullPath: exposedFile });
                await awaitsForDone(promise);
                await waitForRenderDebounce();
                expectSelected(exposedFile);

                promise = CommandManager.execute(Commands.FILE_OPEN, { fullPath: unexposedFile });
                await awaitsForDone(promise);
                await waitForRenderDebounce();
                expectSelected(null);
            });

            function findExtantNode(fullPath) {
                var $treeItems = testWindow.$("#project-files-container li"),
                    $result;

                var name = getItemName(fullPath);

                $treeItems.is(function () {
                    var $treeNode = testWindow.$(this);
                    if ($treeNode.children("a").text().trim() === name) {
                        $result = $treeNode;
                        return true;
                    }
                    return false;
                });
                return $result;
            }

            async function toggleFolder(fullPath, open) {
                var $treeNode = findExtantNode(fullPath);

                var expectedClass = open ? "jstree-open" : "jstree-closed";
                expect($treeNode.hasClass(expectedClass)).toBe(false);

                $treeNode.children("a").children("span").click();

                // if a folder has never been expanded before, this will be async
                await awaitsFor(function () {
                    return $treeNode.hasClass(expectedClass);
                }, (open ? "Open" : "Close") + " tree node", 1000);
            }

            it("should reselect previously selected file when made visible again", async function () {
                var promise,
                    initialFile  = tempDir + "/file.js",
                    folder       = tempDir + "/directory/",
                    fileInFolder = tempDir + "/directory/interiorfile.js";

                promise = CommandManager.execute(Commands.FILE_OPEN, { fullPath: initialFile });
                await awaitsForDone(promise);
                await waitForRenderDebounce();
                expectSelected(initialFile);
                await toggleFolder(folder, true);     // open folder
                // open file in folder
                promise = CommandManager.execute(Commands.FILE_OPEN, { fullPath: fileInFolder });
                await awaitsForDone(promise);
                await waitForRenderDebounce();
                expectSelected(fileInFolder);
                await toggleFolder(folder, false);    // close folder
                await toggleFolder(folder, true);     // open folder again
                await waitForRenderDebounce();
                expectSelected(fileInFolder);
                await toggleFolder(folder, false);    // close folder
            });

            it("should deselect after opening file hidden in tree, but select when made visible again", async function () {
                var promise,
                    initialFile  = tempDir + "/file.js",
                    folder       = tempDir + "/directory/",
                    fileInFolder = tempDir + "/directory/interiorfile.js";

                promise = CommandManager.execute(Commands.FILE_OPEN, { fullPath: initialFile });
                await awaitsForDone(promise);
                await waitForRenderDebounce();
                expectSelected(initialFile);
                await toggleFolder(folder, true);     // open folder
                await toggleFolder(folder, false);    // close folder
                promise = CommandManager.execute(Commands.FILE_OPEN, { fullPath: fileInFolder });
                await awaitsForDone(promise);// open file in folder
                await waitForRenderDebounce();
                expectSelected(null);
                await toggleFolder(folder, true);     // open folder again
                await waitForRenderDebounce();
                expectSelected(fileInFolder);
                await toggleFolder(folder, false);    // close folder
            });
        });

        describe("File Display", function () {
            it("should not show useless directory entries", function () {
                var shouldShow = ProjectManager.shouldShow;
                var makeEntry = function (name) {
                    return { name: name };
                };

                expect(shouldShow(makeEntry(".git"))).toBe(false);
                expect(shouldShow(makeEntry(".svn"))).toBe(false);
                expect(shouldShow(makeEntry(".DS_Store"))).toBe(false);
                expect(shouldShow(makeEntry("Thumbs.db"))).toBe(false);
                expect(shouldShow(makeEntry(".hg"))).toBe(false);
                expect(shouldShow(makeEntry(".gitmodules"))).toBe(false);
                expect(shouldShow(makeEntry(".gitignore"))).toBe(true);
                expect(shouldShow(makeEntry("foobar"))).toBe(true);
                expect(shouldShow(makeEntry("pyc.py"))).toBe(true);
                expect(shouldShow(makeEntry("module.pyc"))).toBe(false);
                expect(shouldShow(makeEntry(".gitattributes"))).toBe(true);
                expect(shouldShow(makeEntry("CVS"))).toBe(false);
                expect(shouldShow(makeEntry(".cvsignore"))).toBe(true);
                expect(shouldShow(makeEntry(".hgignore"))).toBe(true);
                expect(shouldShow(makeEntry(".hgtags"))).toBe(false);

            });
        });

        describe("Project Busy spinner", function () {
            it("should show project busy spinner", function () {
                let spinner = testWindow.$("#project-operations-spinner");
                let isVisible = spinner.is(":visible");
                expect(isVisible).toBe(false);

                ProjectManager.setProjectBusy(true, "hello world");
                let spinnerMessage = spinner.attr("title");
                expect(spinnerMessage).toBe("hello world");
                isVisible = spinner.is(":visible");
                expect(isVisible).toBe(true);

                ProjectManager.setProjectBusy(true, "second status");
                spinnerMessage = spinner.attr("title");
                expect(spinnerMessage).toBe("hello world, second status");
                isVisible = spinner.is(":visible");
                expect(isVisible).toBe(true);

                ProjectManager.setProjectBusy(false, "second status");
                spinnerMessage = spinner.attr("title");
                expect(spinnerMessage).toBe("hello world");
                isVisible = spinner.is(":visible");
                expect(isVisible).toBe(true);

                ProjectManager.setProjectBusy(true, "third status");
                spinnerMessage = spinner.attr("title");
                expect(spinnerMessage).toBe("hello world, third status");
                isVisible = spinner.is(":visible");
                expect(isVisible).toBe(true);

                ProjectManager.setProjectBusy(false, "hello world");
                spinnerMessage = spinner.attr("title");
                expect(spinnerMessage).toBe("third status");
                isVisible = spinner.is(":visible");
                expect(isVisible).toBe(true);

                ProjectManager.setProjectBusy(false, "third status");
                isVisible = spinner.is(":visible");
                expect(isVisible).toBe(false);
            });
        });

    });
});
