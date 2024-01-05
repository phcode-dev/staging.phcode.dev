define(function(require,exports,module){var SpecRunnerUtils=brackets.getModule("spec/SpecRunnerUtils"),CommandManager,Commands,Dialogs,EditorManager,DocumentManager,MainViewManager,FileSystem;describe("integration:CloseOthers extension",function(){var testPath=SpecRunnerUtils.getTestPath("/spec/Extension-test-project-files/"),testWindow,$,docSelectIndex,cmdToRun,brackets;async function createUntitled(count){async function doCreateUntitled(content){var promise=CommandManager.execute(Commands.FILE_NEW_UNTITLED);promise.done(function(untitledDoc){untitledDoc.replaceRange(content,{line:0,ch:0})}),await awaitsForDone(promise,"FILE_NEW_UNTITLED")}var i;for(i=0;i<count;i++)await doCreateUntitled(String(i))}async function expectAndDelete(fullPath){var promise=SpecRunnerUtils.resolveNativeFileSystemPath(fullPath);await awaitsForDone(promise,"Verify file exists: "+fullPath);var promise=SpecRunnerUtils.deletePath(fullPath);await awaitsForDone(promise,"Remove testfile "+fullPath,5e3)}function getFilename(i){return testPath+"test_closeothers"+i+".js"}async function runCloseOthers(){var ws=MainViewManager.getWorkingSet(MainViewManager.ACTIVE_PANE),promise;ws.length>docSelectIndex&&(DocumentManager.getDocumentForPath(ws[docSelectIndex].fullPath).done(function(doc){MainViewManager._edit(MainViewManager.ACTIVE_PANE,doc)}),promise=CommandManager.execute(cmdToRun),await awaitsForDone(promise,cmdToRun),expect(MainViewManager.getCurrentlyViewedPath(MainViewManager.ACTIVE_PANE)).toEqual(ws[docSelectIndex].fullPath,"Path of document in editor after close others command should be the document that was selected"))}beforeEach(async function(){testWindow=await SpecRunnerUtils.createTestWindowAndRun(),$=testWindow.$,brackets=testWindow.brackets,DocumentManager=testWindow.brackets.test.DocumentManager,MainViewManager=testWindow.brackets.test.MainViewManager,CommandManager=testWindow.brackets.test.CommandManager,EditorManager=testWindow.brackets.test.EditorManager,Dialogs=testWindow.brackets.test.Dialogs,Commands=testWindow.brackets.test.Commands,FileSystem=testWindow.brackets.test.FileSystem,await SpecRunnerUtils.loadProjectInTestWindow(testPath),await createUntitled(5);var fileI=0;spyOn(FileSystem,"showSaveDialog").and.callFake(function(dialogTitle,initialPath,proposedNewName,callback){callback(void 0,getFilename(fileI)),fileI++});var promise=CommandManager.execute(Commands.FILE_SAVE_ALL);await awaitsForDone(promise,"FILE_SAVE_ALL",5e3)},3e4),afterEach(async function(){for(let i of[0,1,2,3,4])await expectAndDelete(getFilename(i));testWindow=null,$=null,brackets=null,EditorManager=null,await SpecRunnerUtils.closeTestWindow()},3e4),it("Close others",async function(){docSelectIndex=2,cmdToRun="file.close_others",await runCloseOthers(),expect(MainViewManager.getWorkingSet(MainViewManager.ACTIVE_PANE).length).toEqual(1)}),it("Close others above",async function(){docSelectIndex=2,cmdToRun="file.close_above",await runCloseOthers(),expect(MainViewManager.getWorkingSet(MainViewManager.ACTIVE_PANE).length).toEqual(3)}),it("Close others below",async function(){docSelectIndex=1,cmdToRun="file.close_below",await runCloseOthers(),expect(MainViewManager.getWorkingSet(MainViewManager.ACTIVE_PANE).length).toEqual(2)})})});
//# sourceMappingURL=unittests.js.map
