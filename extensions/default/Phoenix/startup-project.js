/*
 * GNU AGPL-3.0 License
 *
 * Copyright (c) 2021 - present core.ai . All rights reserved.
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

/*globals Phoenix, JSZip, Filer*/

define(function (require, exports, module) {
    const ProjectManager          = brackets.getModule("project/ProjectManager");

    async function _ensureExistsAsync(path) {
        return new Promise((resolve, reject)=>{
            Phoenix.VFS.ensureExistsDir(path, (err)=>{
                if(err){
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    function _copyZippedItemToFS(path, item, destProjectDir) {
        return new Promise(async (resolve, reject) =>{
            let destPath = `${destProjectDir}${path}`;
            if(item.dir){
                await _ensureExistsAsync(destPath);
            } else {
                await _ensureExistsAsync(window.path.dirname(destPath));
                item.async("uint8array").then(function (data) {
                    window.fs.writeFile(destPath, Filer.Buffer.from(data), writeErr=>{
                        if(writeErr){
                            reject(writeErr);
                        } else {
                            resolve(destPath);
                        }
                    });
                }).catch(error=>{
                    reject(error);
                });
            }
        });
    }

    function _loadDefaultProjectFromZipFile(projectDir) {
        window.JSZipUtils.getBinaryContent('assets/default-project/en.zip', function(err, data) {
            if(err) {
                console.error("could not load phoenix default project from zip file!");
            } else {
                JSZip.loadAsync(data).then(function (zip) {
                    let keys = Object.keys(zip.files);
                    let allPromises=[];
                    keys.forEach(path => {
                        allPromises.push(_copyZippedItemToFS(path, zip.files[path], projectDir));
                    });
                    Promise.all(allPromises).then(()=>{
                        console.log("default project Setup complete: ", projectDir);
                    });
                });
            }
        });
    }

    function _setupStartupProject() {
        console.log("setting up startup project", ProjectManager.getWelcomeProjectPath());
        _loadDefaultProjectFromZipFile(ProjectManager.getWelcomeProjectPath());
    }

    exports.init = function () {
        if(!Phoenix.firstBoot){
            return;
        }
        _setupStartupProject();
    };
});
