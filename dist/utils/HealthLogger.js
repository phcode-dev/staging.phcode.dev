/*
 * GNU AGPL-3.0 License
 *
 * Copyright (c) 2021 - present core.ai . All rights reserved.
 * Original work Copyright (c) 2015 - 2021 Adobe Systems Incorporated. All rights reserved.
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
 *  Utilities functions related to Health Data logging
 */
/*global Map*/
define(function (require, exports, module) {


    var PreferencesManager          = require("preferences/PreferencesManager"),
        LanguageManager             = require("language/LanguageManager"),
        FileUtils                   = require("file/FileUtils"),
        PerfUtils                   = require("utils/PerfUtils"),
        FindUtils                   = require("search/FindUtils"),
        StringUtils                 = require("utils/StringUtils"),
        EventDispatcher             = require("utils/EventDispatcher"),

        HEALTH_DATA_STATE_KEY       = "HealthData.Logs",
        logHealthData               = true,
        analyticsEventMap           = new Map();

    var commonStrings = { USAGE: "usage",
        FILE_OPEN: "fileOpen",
        FILE_NEW: "newfile",
        FILE_SAVE: "fileSave",
        FILE_CLOSE: "fileClose",
        LANGUAGE_CHANGE: "languageChange",
        LANGUAGE_SERVER_PROTOCOL: "languageServerProtocol",
        CODE_HINTS: "codeHints",
        PARAM_HINTS: "parameterHints",
        JUMP_TO_DEF: "jumpToDefinition"
    };

    EventDispatcher.makeEventDispatcher(exports);

    /**
     * Init: creates the health log preference keys in the state.json file
     */
    function init() {
        PreferencesManager.stateManager.definePreference(HEALTH_DATA_STATE_KEY, "object", {});
    }

    /**
     * All the logging functions should be disabled if this returns false
     * @return {boolean} true if health data can be logged
     */
    function shouldLogHealthData() {
        return logHealthData;
    }

    /**
     * Return all health data logged till now stored in the state prefs
     * @return {Object} Health Data aggregated till now
     */
    function getStoredHealthData() {
        var storedData = PreferencesManager.getViewState(HEALTH_DATA_STATE_KEY) || {};
        return storedData;
    }

    /**
     * Return the aggregate of all health data logged till now from all sources
     * @return {Object} Health Data aggregated till now
     */
    function getAggregatedHealthData() {
        var healthData = getStoredHealthData();
        $.extend(healthData, PerfUtils.getHealthReport());
        $.extend(healthData, FindUtils.getHealthReport());
        return healthData;
    }

    /**
     * Sets the health data
     * @param {Object} dataObject The object to be stored as health data
     */
    function setHealthData(dataObject) {
        if (!shouldLogHealthData()) {
            return;
        }
        PreferencesManager.setViewState(HEALTH_DATA_STATE_KEY, dataObject);
    }

    /**
     * Returns health data logged for the given key
     * @return {Object} Health Data object for the key or undefined if no health data stored
     */
    function getHealthDataLog(key) {
        var healthData = getStoredHealthData();
        return healthData[key];
    }

    /**
     * Sets the health data for the given key
     * @param {Object} dataObject The object to be stored as health data for the key
     */
    function setHealthDataLog(key, dataObject) {
        var healthData = getStoredHealthData();
        healthData[key] = dataObject;
        setHealthData(healthData);
    }

    /**
     * Clears all the health data recorded till now
     */
    function clearHealthData() {
        PreferencesManager.setViewState(HEALTH_DATA_STATE_KEY, {});
        //clear the performance related health data also
        PerfUtils.clear();
    }

    /**
     * Enable or disable health data logs
     * @param {boolean} enabled true to enable health logs
     */
    function setHealthLogsEnabled(enabled) {
        logHealthData = enabled;
        if (!enabled) {
            clearHealthData();
        }
    }

    /**
     * Whenever a file is opened call this function. The function will record the number of times
     * the standard file types have been opened. We only log the standard filetypes
     * @param {String} filePath          The path of the file to be registered
     * @param {boolean} addedToWorkingSet set to true if extensions of files added to the
     *                                    working set needs to be logged
     */
    function fileOpened(filePath, addedToWorkingSet, encoding) {
        if (!shouldLogHealthData()) {
            return;
        }
        var fileExtension = FileUtils.getFileExtension(filePath),
            language = LanguageManager.getLanguageForPath(filePath),
            healthData = getStoredHealthData(),
            fileExtCountMap = [];
        healthData.fileStats = healthData.fileStats || {
            openedFileExt: {},
            workingSetFileExt: {},
            openedFileEncoding: {}
        };
        if (language.getId() !== "unknown") {
            fileExtCountMap = addedToWorkingSet ? healthData.fileStats.workingSetFileExt : healthData.fileStats.openedFileExt;
            if (!fileExtCountMap[fileExtension]) {
                fileExtCountMap[fileExtension] = 0;
            }
            fileExtCountMap[fileExtension]++;
            setHealthData(healthData);
        }
        if (encoding) {
            var fileEncCountMap = healthData.fileStats.openedFileEncoding;
            if (!fileEncCountMap) {
                healthData.fileStats.openedFileEncoding = {};
                fileEncCountMap = healthData.fileStats.openedFileEncoding;
            }
            if (!fileEncCountMap[encoding]) {
                fileEncCountMap[encoding] = 0;
            }
            fileEncCountMap[encoding]++;
            setHealthData(healthData);
        }


        sendAnalyticsData(commonStrings.USAGE + commonStrings.FILE_OPEN + language._name,
                            commonStrings.USAGE,
                            commonStrings.FILE_OPEN,
                            language._name.toLowerCase()
                         );

    }

    /**
     * Whenever a file is saved call this function.
     * The function will send the analytics Data
     * We only log the standard filetypes and fileSize
     * @param {String} filePath The path of the file to be registered
     */
    function fileSaved(docToSave) {
        if (!docToSave) {
            return;
        }
        var fileType = docToSave.language ? docToSave.language._name : "";
        sendAnalyticsData(commonStrings.USAGE + commonStrings.FILE_SAVE + fileType,
                            commonStrings.USAGE,
                            commonStrings.FILE_SAVE,
                            fileType.toLowerCase()
                         );
    }

    /**
     * Whenever a file is closed call this function.
     * The function will send the analytics Data.
     * We only log the standard filetypes and fileSize
     * @param {String} filePath The path of the file to be registered
     */
    function fileClosed(file) {
        if (!file) {
            return;
        }
        var language = LanguageManager.getLanguageForPath(file._path),
            size = -1;

        function _sendData(fileSize) {
            var subType = "";

            if(fileSize/1024 <= 1) {

                if(fileSize < 0) {
                    subType = "";
                }
                if(fileSize <= 10) {
                    subType = "Size_0_10KB";
                } else if (fileSize <= 50) {
                    subType = "Size_10_50KB";
                } else if (fileSize <= 100) {
                    subType = "Size_50_100KB";
                } else if (fileSize <= 500) {
                    subType = "Size_100_500KB";
                } else {
                    subType = "Size_500KB_1MB";
                }

            } else {
                fileSize = fileSize/1024;
                if(fileSize <= 2) {
                    subType = "Size_1_2MB";
                } else if(fileSize <= 5) {
                    subType = "Size_2_5MB";
                } else {
                    subType = "Size_Above_5MB";
                }
            }

            sendAnalyticsData(commonStrings.USAGE + commonStrings.FILE_CLOSE + language._name + subType,
                                commonStrings.USAGE,
                                commonStrings.FILE_CLOSE,
                                language._name.toLowerCase(),
                                subType
                             );
        }

        file.stat(function(err, fileStat) {
            if(!err) {
                size = fileStat.size.valueOf()/1024;
            }
            _sendData(size);
        });
    }

    /**
     * Sets the project details(a probably unique prjID, number of files in the project and the node cache size) in the health log
     * The name of the project is never saved into the health data log, only the hash(name) is for privacy requirements.
     * @param {string} projectName The name of the project
     * @param {number} numFiles    The number of file in the project
     * @param {number} cacheSize   The node file cache memory consumed by the project
     */
    function setProjectDetail(projectName, numFiles, cacheSize) {
        var projectNameHash = StringUtils.hashCode(projectName),
            FIFLog = getHealthDataLog("ProjectDetails");
        if (!FIFLog) {
            FIFLog = {};
        }
        FIFLog["prj" + projectNameHash] = {
            numFiles: numFiles,
            cacheSize: cacheSize
        };
        setHealthDataLog("ProjectDetails", FIFLog);
    }

    /**
     * Increments health log count for a particular kind of search done
     * @param {string} searchType The kind of search type that needs to be logged- should be a js var compatible string
     */
    function searchDone(searchType) {
        var searchDetails = getHealthDataLog("searchDetails");
        if (!searchDetails) {
            searchDetails = {};
        }
        if (!searchDetails[searchType]) {
            searchDetails[searchType] = 0;
        }
        searchDetails[searchType]++;
        setHealthDataLog("searchDetails", searchDetails);
    }

     /**
     * Notifies the HealthData extension to send Analytics Data to server
     * @param{Object} eventParams Event Data to be sent to Analytics Server
     */
    function notifyHealthManagerToSendData(eventParams) {
        exports.trigger("SendAnalyticsData", eventParams);
    }

    /**
     * Send Analytics Data
     * @param {string} eventCategory The kind of Event Category that
     * needs to be logged- should be a js var compatible string
     * @param {string} eventSubCategory The kind of Event Sub Category that
     * needs to be logged- should be a js var compatible string
     * @param {string} eventType The kind of Event Type that needs to be logged- should be a js var compatible string
     * @param {string} eventSubType The kind of Event Sub Type that
     * needs to be logged- should be a js var compatible string
     */
    function sendAnalyticsData(eventName, eventCategory, eventSubCategory, eventType, eventSubType) {
        var isEventDataAlreadySent = analyticsEventMap.get(eventName),
            isHDTracking   = PreferencesManager.getExtensionPrefs("healthData").get("healthDataTracking"),
            eventParams = {};

        if (isHDTracking && !isEventDataAlreadySent && eventName && eventCategory) {
            eventParams =  {
                eventName: eventName,
                eventCategory: eventCategory,
                eventSubCategory: eventSubCategory || "",
                eventType: eventType || "",
                eventSubType: eventSubType || ""
            };
            notifyHealthManagerToSendData(eventParams);
        }
    }

    // Define public API
    exports.getHealthDataLog          = getHealthDataLog;
    exports.setHealthDataLog          = setHealthDataLog;
    exports.getAggregatedHealthData   = getAggregatedHealthData;
    exports.clearHealthData           = clearHealthData;
    exports.fileOpened                = fileOpened;
    exports.fileSaved                 = fileSaved;
    exports.fileClosed                = fileClosed;
    exports.setProjectDetail          = setProjectDetail;
    exports.searchDone                = searchDone;
    exports.setHealthLogsEnabled      = setHealthLogsEnabled;
    exports.shouldLogHealthData       = shouldLogHealthData;
    exports.init                      = init;
    exports.sendAnalyticsData         = sendAnalyticsData;

    // constants
    // searchType for searchDone()
    exports.SEARCH_INSTANT            = "searchInstant";
    exports.SEARCH_ON_RETURN_KEY      = "searchOnReturnKey";
    exports.SEARCH_REPLACE_ALL        = "searchReplaceAll";
    exports.SEARCH_NEXT_PAGE          = "searchNextPage";
    exports.SEARCH_PREV_PAGE          = "searchPrevPage";
    exports.SEARCH_LAST_PAGE          = "searchLastPage";
    exports.SEARCH_FIRST_PAGE         = "searchFirstPage";
    exports.SEARCH_REGEXP             = "searchRegExp";
    exports.SEARCH_CASE_SENSITIVE     = "searchCaseSensitive";
    // A new search context on search bar up-Gives an idea of number of times user did a discrete search
    exports.SEARCH_NEW                = "searchNew";
    exports.commonStrings = commonStrings;
    exports.analyticsEventMap = analyticsEventMap;
});
