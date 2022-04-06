/*
 * GNU AGPL-3.0 License
 *
 * Copyright (c) 2021 - present core.ai . All rights reserved.
 * Original work Copyright (c) 2013 - 2021 Adobe Systems Incorporated. All rights reserved.
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

/**
 * FileIndex is an internal module used by FileSystem to maintain an index of all files and directories.
 *
 * This module is *only* used by FileSystem, and should not be called directly.
 */
define(function (require, exports, module) {


    var FileUtils = require("file/FileUtils");

    /**
     * @constructor
     */
    function FileIndex() {
        this._index = {};
        this._doNotRemoveItems = {};
    }

    /**
     * Master index
     *
     * @type {Object.<string, File|Directory>} Maps a fullPath to a File or Directory object
     */
    FileIndex.prototype._index = null;

    FileIndex.prototype._doNotRemoveItems = null;

    /**
     * Clear the file index cache.
     */
    FileIndex.prototype.clear = function () {
        this._index = {};
        this._doNotRemoveItems = {};
    };

    /**
     * Will prevent the file from being removed from index. However, it is reset when index is cleared.
     */
    FileIndex.prototype.doNotRemoveFromIndex = function (filePath) {
        this._doNotRemoveItems[filePath] = true;
    };

    /**
     * Visits every entry in the entire index; no stopping condition.
     * @param {!function(FileSystemEntry, string):void} Called with an entry and its fullPath
     */
    FileIndex.prototype.visitAll = function (visitor) {
        var path;
        for (path in this._index) {
            if (this._index.hasOwnProperty(path)) {
                visitor(this._index[path], path);
            }
        }
    };

    /**
     * Add an entry.
     *
     * @param {FileSystemEntry} entry The entry to add.
     */
    FileIndex.prototype.addEntry = function (entry) {
        this._index[entry.fullPath] = entry;
    };

    /**
     * Remove an entry.
     *
     * @param {FileSystemEntry} entry The entry to remove.
     */
    FileIndex.prototype.removeEntry = function (entry) {
        var path = entry.fullPath,
            property;
        if(this._doNotRemoveItems[path]){
            return;
        }

        function replaceMember(property) {
            var member = entry[property];
            if (typeof member === "function") {
                entry[property] = function () {
                    console.warn("FileSystemEntry used after being removed from index: ", path);
                    return member.apply(entry, arguments);
                };
            }
        }

        delete this._index[path];

        for (property in entry) {
            if (entry.hasOwnProperty(property)) {
                replaceMember(property);
            }
        }
    };

    /**
     * Notify the index that an entry has been renamed. This updates
     * all affected entries in the index.
     *
     * @param {string} oldPath
     * @param {string} newPath
     * @param {boolean} isDirectory
     */
    FileIndex.prototype.entryRenamed = function (oldPath, newPath, isDirectory) {
        var path,
            renameMap = {},
            oldParentPath = FileUtils.getParentPath(oldPath),
            newParentPath = FileUtils.getParentPath(newPath);

        // Find all entries affected by the rename and put into a separate map.
        for (path in this._index) {
            if (this._index.hasOwnProperty(path)) {
                // See if we have a match. For directories, see if the path
                // starts with the old name. This is safe since paths always end
                // with '/'. For files, see if there is an exact match between
                // the path and the old name.
                if (isDirectory ? path.indexOf(oldPath) === 0 : path === oldPath) {
                    renameMap[path] = newPath + path.substr(oldPath.length);
                }
            }
        }

        // Do the rename.
        for (path in renameMap) {
            if (renameMap.hasOwnProperty(path)) {
                var item = this._index[path];

                // Sanity check to make sure the item and path still match
                console.assert(item.fullPath === path);

                delete this._index[path];
                this._index[renameMap[path]] = item;
                item._setPath(renameMap[path]);
            }
        }


        // If file path is changed, i.e the file is moved
        // Remove the moved entry from old Directory and add it to new Directory
        if (oldParentPath !== newParentPath) {
            var oldDirectory = this._index[oldParentPath],
                newDirectory = this._index[newParentPath],
                renamedEntry;

            if (oldDirectory && oldDirectory._contents) {
                oldDirectory._contents = oldDirectory._contents.filter(function(entry) {
                    if (entry.fullPath === newPath) {
                        renamedEntry = entry;
                        return false;
                    }
                    return true;
                });
            }

            if (newDirectory && newDirectory._contents && renamedEntry) {
                renamedEntry._setPath(newPath);
                newDirectory._contents.push(renamedEntry);
            }
        }
    };

    /**
     * Returns the cached entry for the specified path, or undefined
     * if the path has not been cached.
     *
     * @param {string} path The path of the entry to return.
     * @return {File|Directory} The entry for the path, or undefined if it hasn't
     *              been cached yet.
     */
    FileIndex.prototype.getEntry = function (path) {
        return this._index[path];
    };

    // Export public API
    module.exports = FileIndex;
});
