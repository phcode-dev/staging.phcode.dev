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

/**
 * Resizer is a Module utility to inject resizing capabilities to any element
 * inside Brackets.
 *
 * On initialization, Resizer discovers all nodes tagged as "vert-resizable"
 * and "horz-resizable" to add the resizer handler. Additionally, "top-resizer",
 * "bottom-resizer", "left-resizer" and "right-resizer" classes control the
 * position of the resizer on the element.
 *
 * An element can be made resizable at any time using the `makeResizable()` API.
 * Panel sizes are saved via preferences and restored when the DOM node becomes resizable
 * again in a subsequent launch.
 *
 * The resizable elements trigger a panelResizeStart, panelResizeUpdate and panelResizeEnd
 * event that can be used to create performance optimizations (such as hiding/showing elements
 * while resizing), custom layout logic, etc. See makeResizable() for details on the events.
 *
 * A resizable element can be collapsed/expanded using the `show`, `hide` and `toggle` APIs or
 * via user action. This triggers panelCollapsed/panelExpanded events - see makeResizable().
 */
define(function (require, exports, module) {


    var DIRECTION_VERTICAL = "vert";
    var DIRECTION_HORIZONTAL = "horz";

    var POSITION_TOP = "top";
    var POSITION_BOTTOM = "bottom";
    var POSITION_LEFT = "left";
    var POSITION_RIGHT = "right";
    var PREFS_PURE_CODE = "noDistractions";

    // Minimum size (height or width) for autodiscovered resizable panels
    var DEFAULT_MIN_SIZE = 100;

    const EVENT_PANEL_COLLAPSED = 'panelCollapsed',
        EVENT_PANEL_EXPANDED = 'panelExpanded',
        EVENT_PANEL_RESIZE_START = 'panelResizeStart',
        EVENT_PANEL_RESIZE_UPDATE = 'panelResizeUpdate',
        EVENT_PANEL_RESIZE_END = 'panelResizeEnd';

    // Load dependent modules
    var AppInit                 = require("utils/AppInit"),
        EventDispatcher         = require("utils/EventDispatcher"),
        ViewUtils               = require("utils/ViewUtils"),
        PreferencesManager      = require("preferences/PreferencesManager");

    var $mainView,
        $sideBar;

    var isResizing = false,
        isWindowResizing = false;

    /**
     * Shows a resizable element.
     * @param {DOMNode} element Html element to show if possible
     */
    function show(element) {
        var showFunc = $(element).data("show");
        if (showFunc) {
            showFunc.apply(element);
        }
    }

    /**
     * Hides a resizable element.
     * @param {DOMNode} element Html element to hide if possible
     */
    function hide(element) {
        var hideFunc = $(element).data("hide");
        if (hideFunc) {
            hideFunc.apply(element);
        }
    }

    /**
     * Changes the visibility state of a resizable element. The toggle
     * functionality is added when an element is made resizable.
     * @param {DOMNode} element Html element to toggle
     */
    function toggle(element) {
        if ($(element).is(":visible")) {
            hide(element);
        } else {
            show(element);
        }
    }

    /**
     * Removes the resizability of an element if it's resizable
     * @param {DOMNode} element Html element in which to remove sizing
     */
    function removeSizable(element) {
        var removeSizableFunc = $(element).data("removeSizable");
        if (removeSizableFunc) {
            removeSizableFunc.apply(element);
        }
    }

    /**
     * Updates the sizing div by resyncing to the sizing edge of the element
     * Call this method after manually changing the size of the element
     * @param {DOMNode} element Html element whose sizer should be resynchronized
     */
    function resyncSizer(element) {
        var resyncSizerFunc = $(element).data("resyncSizer");
        if (resyncSizerFunc) {
            resyncSizerFunc.apply(element);
        }
    }

    /**
     * Returns the visibility state of a resizable element.
     * @param {DOMNode} element Html element to toggle
     * @return {boolean} true if element is visible, false if it is not visible
     */
    function isVisible(element) {
        return $(element).is(":visible");
    }

    function _isPercentage(value) {
        return !$.isNumeric(value) && value.indexOf('%') > -1;
    }

    function _percentageToPixels(value, total) {
        return parseFloat(value.replace('%', '')) * (total / 100);
    }

    function _sideBarMaxSize() {
        var siblingsWidth = 0;
        $sideBar.siblings().not(".content").each(function (i, elem) {
            var $elem = $(elem);
            if ($elem.css("display") !== "none") {
                siblingsWidth += $elem.outerWidth();
            }
        });
        return $(".main-view").width() - siblingsWidth - 1;
    }

    /**
     * Adds resizing and (optionally) expand/collapse capabilities to a given html element. The element's size
     * & visibility are automatically saved & restored as a view-state preference.
     *
     * Resizing can be configured in two directions:
     *  - Vertical ("vert"): Resizes the height of the element
     *  - Horizontal ("horz"): Resizes the width of the element
     *
     * Resizer handlers can be positioned on the element at:
     *  - Top ("top") or bottom ("bottom") for vertical resizing
     *  - Left ("left") or right ("right") for horizontal resizing
     *
     * A resizable element triggers the following events while resizing:
     *  - panelResizeStart: When the resize starts. Passed the new size.
     *  - panelResizeUpdate: When the resize gets updated. Passed the new size.
     *  - panelResizeEnd: When the resize ends. Passed the final size.
     *  - panelCollapsed: When the panel gets collapsed (or hidden). Passed the last size
     *      before collapse. May occur without any resize events.
     *  - panelExpanded: When the panel gets expanded (or shown). Passed the initial size.
     *      May occur without any resize events.
     *
     * @param {!DOMNode} element DOM element which should be made resizable. Must have an id attribute, for
     *                          use as a preferences key.
     * @param {!string} direction Direction of the resize action: one of the DIRECTION_* constants.
     * @param {!string} position Which side of the element can be dragged: one of the POSITION_* constants
     *                          (TOP/BOTTOM for vertical resizing or LEFT/RIGHT for horizontal).
     * @param {?number} minSize Minimum size (width or height) of the element's outer dimensions, including
     *                          border & padding. Defaults to DEFAULT_MIN_SIZE.
     * @param {?boolean} collapsible Indicates the panel is collapsible on double click on the
     *                          resizer. Defaults to false.
     * @param {?string} forceLeft CSS selector indicating element whose 'left' should be locked to the
     *                          the resizable element's size (useful for siblings laid out to the right of
     *                          the element). Must lie in element's parent's subtree.
     * @param {?boolean} createdByWorkspaceManager For internal use only
     * @param {?boolean} usePercentages Maintain the size of the element as a percentage of its parent
     *                          the default is to maintain the size of the element in pixels
     * @param {?string} forceRight CSS selector indicating element whose 'right' should be locked to the
     *                          the resizable element's size (useful for siblings laid out to the left of
     *                          the element). Must lie in element's parent's subtree.
     * @param {?boolean} _attachToParent Attaches the resizer element to parent of the element rather than
     *                          to element itself. Attach the resizer to the parent *ONLY* if element has the
     *                          same offset as parent otherwise the resizer will be incorrectly positioned.
     *                          FOR INTERNAL USE ONLY
     * @param {?number=} initialSize  Optional Initial size of panel in px. If not given, panel will use minsize
     *      or current size.
     */
    function makeResizable(element, direction, position, minSize, collapsible,
                           forceLeft, createdByWorkspaceManager, usePercentages,
                           forceRight, _attachToParent, initialSize) {
        var $resizer            = $('<div class="' + direction + '-resizer"></div>'),
            $element            = $(element),
            $parent             = $element.parent(),
            $resizableElement   = $($element.find(".resizable-content:first")[0]),
            $body               = $(window.document.body),
            elementID           = $element.attr("id"),
            elementPrefs        = PreferencesManager.getViewState(elementID) || {},
            animationRequest    = null,
            directionProperty   = direction === DIRECTION_HORIZONTAL ? "clientX" : "clientY",
            directionIncrement  = (position === POSITION_TOP || position === POSITION_LEFT) ? 1 : -1,
            parentSizeFunction  = direction === DIRECTION_HORIZONTAL ? $parent.innerWidth : $parent.innerHeight,

            elementSizeFunction = function (newSize) {
                if (!newSize) {
                    // calling the function as a getter
                    if (direction === DIRECTION_HORIZONTAL) {
                        return this.width();
                    }
                    return this.height();

                } else if (!usePercentages) {
                    if (direction === DIRECTION_HORIZONTAL) {
                        return this.width(newSize);
                    }
                    return this.height(newSize);

                }
                    // calling the function as a setter
                var parentSize = parentSizeFunction.apply($parent),
                    percentage,
                    prop;

                if (direction === DIRECTION_HORIZONTAL) {
                    prop = "width";
                } else {
                    prop = "height";
                }
                percentage = newSize / parentSize;
                this.css(prop, (percentage * 100) + "%");

                return this; // chainable

            },

            resizerCSSPosition  = direction === DIRECTION_HORIZONTAL ? "left" : "top",
            contentSizeFunction = direction === DIRECTION_HORIZONTAL ? $resizableElement.width : $resizableElement.height;

        if (PreferencesManager.get(PREFS_PURE_CODE) &&
                ($element.hasClass("bottom-panel") || $element.hasClass("sidebar"))) {
            elementPrefs.visible = false;
        }

        if (!elementID) {
            console.error("Resizable panels must have a DOM id to use as a preferences key:", element);
            return;
        }
        // Detect legacy cases where panels in the editor area are created without using WorkspaceManager APIs
        if ($parent[0] && $parent.is(".content") && !createdByWorkspaceManager) {
            console.error("Resizable panels within the editor area should be created via WorkspaceManager.createBottomPanel(). \nElement:", element);
            return;
        }

        if (minSize === undefined) {
            minSize = DEFAULT_MIN_SIZE;
        }

        collapsible = collapsible || false;

        if (_attachToParent) {
            $parent.prepend($resizer);
        } else {
            $element.prepend($resizer);
        }
        // Important so min/max sizes behave predictably
        $element.css("box-sizing", "border-box");

        function adjustSibling(size) {
            if (forceLeft !== undefined) {
                $(forceLeft, $parent).css("left", size);
            } else if (forceRight !== undefined) {
                $(forceRight, $parent).css("right", size);
            }
        }

        function resizeElement(elementSize, contentSize) {
            elementSizeFunction.apply($element, [elementSize]);

            if ($resizableElement.length) {
                contentSizeFunction.apply($resizableElement, [contentSize]);
            }
        }

        // If the resizer is positioned right or bottom of the panel, we need to listen to
        // reposition it if the element size changes externally
        function repositionResizer(elementSize) {
            var resizerPosition = elementSize || 1;
            if (position === POSITION_RIGHT || position === POSITION_BOTTOM) {
                $resizer.css(resizerCSSPosition, resizerPosition);
            }
        }

        $element.data("removeSizable", function () {
            $resizer.off(".resizer");

            $element.removeData("show");
            $element.removeData("hide");
            $element.removeData("resyncSizer");
            $element.removeData("removeSizable");

            $resizer.remove();
        });

        $element.data("resyncSizer", function () {
            repositionResizer(elementSizeFunction.apply($element));
        });

        $element.data("show", function () {
            var elementOffset   = $element.offset(),
                elementSize     = elementSizeFunction.apply($element) || elementPrefs.size,
                contentSize     = contentSizeFunction.apply($resizableElement) || elementPrefs.contentSize;
            if(initialSize){
                elementSize = elementPrefs.size || initialSize;
            }
            if(elementSize<minSize){
                elementSize = minSize;
            }
            if(contentSize<elementSize){
                contentSize = elementSize;
            }

            // Resize the element before showing it again. If the panel was collapsed by dragging
            // the resizer, the size of the element should be 0, so we restore size in preferences
            resizeElement(elementSize, contentSize);

            $element.show();
            elementPrefs.visible = true;

            if (collapsible) {
                if (_attachToParent) {
                    $parent.prepend($resizer);
                } else {
                    $element.prepend($resizer);
                }
                if (position === POSITION_TOP) {
                    $resizer.css(resizerCSSPosition, "");
                } else if (position === POSITION_RIGHT) {
                    $resizer.css(resizerCSSPosition, elementOffset[resizerCSSPosition] + elementSize);
                }
            }

            adjustSibling(elementSize);

            $element.trigger(EVENT_PANEL_EXPANDED, [elementSize]);
            PreferencesManager.setViewState(elementID, elementPrefs, null, isResizing);
        });

        $element.data("hide", function () {
            var elementOffset   = $element.offset(),
                elementSize     = elementSizeFunction.apply($element),
                resizerSize     = elementSizeFunction.apply($resizer);

            $element.hide();
            elementPrefs.visible = false;
            if (collapsible) {
                $resizer.insertBefore($element);
                if (position === POSITION_RIGHT) {
                    $resizer.css(resizerCSSPosition, "");
                } else if (position === POSITION_TOP) {
                    $resizer.css(resizerCSSPosition, elementOffset[resizerCSSPosition] + elementSize - resizerSize);
                }
            }

            adjustSibling(0);

            $element.trigger(EVENT_PANEL_COLLAPSED, [elementSize]);
            PreferencesManager.setViewState(elementID, elementPrefs, null, isResizing);
        });


        $resizer.on("mousedown.resizer", function (e) {
            var $resizeShield   = $("<div class='resizing-container " + direction + "-resizing' />"),
                startPosition   = e[directionProperty],
                startSize       = $element.is(":visible") ? elementSizeFunction.apply($element) : 0,
                newSize         = startSize,
                previousSize    = startSize,
                baseSize        = 0,
                resizeStarted   = false;

            isResizing = true;
            $body.append($resizeShield);

            if ($resizableElement.length) {
                $element.children().not(".horz-resizer, .vert-resizer, .resizable-content").each(function (index, child) {
                    if (direction === DIRECTION_HORIZONTAL) {
                        baseSize += $(child).outerWidth();
                    } else {
                        baseSize += $(child).outerHeight();
                    }
                });
            }

            function doRedraw() {
                // only run this if the mouse is down so we don't constantly loop even
                // after we're done resizing.
                if (!isResizing) {
                    return;
                }

                // Check for real size changes to avoid unnecessary resizing and events
                if (newSize !== previousSize) {
                    previousSize = newSize;

                    if ($element.is(":visible")) {
                        if (newSize < 10) {
                            toggle($element);
                            elementSizeFunction.apply($element, [0]);
                        } else {
                            // Trigger resizeStarted just before the first successful resize update
                            if (!resizeStarted) {
                                resizeStarted = true;
                                $element.trigger(EVENT_PANEL_RESIZE_START, newSize);
                            }

                            // Resize the main element to the new size. If there is a content element,
                            // its size is the new size minus the size of the non-resizable elements
                            resizeElement(newSize, (newSize - baseSize));
                            adjustSibling(newSize);

                            $element.trigger(EVENT_PANEL_RESIZE_UPDATE, [newSize]);
                        }
                    } else if (newSize > 10) {
                        elementSizeFunction.apply($element, [newSize]);
                        toggle($element);

                        // Trigger resizeStarted after expanding the element if it was previously collapsed
                        if (!resizeStarted) {
                            resizeStarted = true;
                            $element.trigger(EVENT_PANEL_RESIZE_START, newSize);
                        }
                    }
                }

                animationRequest = window.requestAnimationFrame(doRedraw);
            }

            function onMouseMove(e) {
                // calculate newSize adding to startSize the difference
                // between starting and current position, capped at minSize
                newSize = Math.max(startSize + directionIncrement * (startPosition - e[directionProperty]), minSize);

                // respect max size if one provided (e.g. by WorkspaceManager)
                var maxSize = $element.data("maxsize");
                if (maxSize !== undefined) {
                    // if provided as percentage size convert it to a pixel size
                    if (_isPercentage(maxSize)) {
                        maxSize = _percentageToPixels(maxSize, _sideBarMaxSize());
                    }
                    newSize = Math.min(newSize, maxSize);
                }

                e.preventDefault();

                if (animationRequest === null) {
                    animationRequest = window.requestAnimationFrame(doRedraw);
                }
            }

            $(window.document).on("mousemove", onMouseMove);

            // If the element is marked as collapsible, check for double click
            // to toggle the element visibility
            if (collapsible) {
                $resizeShield.on("mousedown", function (e) {
                    $(window.document).off("mousemove", onMouseMove);
                    $resizeShield.off("mousedown");
                    $resizeShield.remove();
                    animationRequest = null;
                    toggle($element);
                });
            }

            function endResize(e) {
                if (isResizing) {

                    var elementSize	= elementSizeFunction.apply($element);
                    if ($element.is(":visible")) {
                        elementPrefs.size = elementSize;
                        if ($resizableElement.length) {
                            elementPrefs.contentSize = contentSizeFunction.apply($resizableElement);
                        }
                        PreferencesManager.setViewState(elementID, elementPrefs);
                        repositionResizer(elementSize);
                    }

                    isResizing = false;

                    if (resizeStarted) {
                        $element.trigger(EVENT_PANEL_RESIZE_END, [elementSize]);
                    }

                    // We wait 300ms to remove the resizer container to capture a mousedown
                    // on the container that would account for double click
                    window.setTimeout(function () {
                        $(window.document).off("mousemove", onMouseMove);
                        $resizeShield.off("mousedown");
                        $resizeShield.remove();
                        animationRequest = null;
                    }, 300);
                }
            }

            $(window.document).one("mouseup", endResize);

            e.preventDefault();
        });

        // Panel preferences initialization
        if (elementPrefs) {

            if (elementPrefs.size !== undefined) {
                elementSizeFunction.apply($element, [elementPrefs.size]);
            }

            if (elementPrefs.contentSize !== undefined) {
                contentSizeFunction.apply($resizableElement, [elementPrefs.contentSize]);
            }

            if (elementPrefs.visible !== undefined && !elementPrefs.visible) {
                hide($element);
            } else {
                adjustSibling(elementSizeFunction.apply($element));
                repositionResizer(elementSizeFunction.apply($element));
            }
        }
    }

    function updateResizeLimits() {
        var sideBarMaxSize = _sideBarMaxSize(),
            maxSize = $sideBar.data("maxsize"),
            width = false;

        if (maxSize !== undefined && _isPercentage(maxSize)) {
            sideBarMaxSize = _percentageToPixels(maxSize, sideBarMaxSize);
        }

        if ($sideBar.width() > sideBarMaxSize) {
            // Adjust the sideBar's width in case it exceeds the window's width when resizing the window.
            $sideBar.width(sideBarMaxSize);
            resyncSizer($sideBar);
            $(".content").css("left", $sideBar.width());
            $sideBar.trigger(EVENT_PANEL_RESIZE_START, $sideBar.width());
            $sideBar.trigger(EVENT_PANEL_RESIZE_UPDATE, [$sideBar.width()]);
            $sideBar.trigger(EVENT_PANEL_RESIZE_END, [$sideBar.width()]);
        }
    }

    function onWindowResize(e) {
        if ($sideBar.css("display") === "none") {
            return;
        }

        if (!isWindowResizing) {
            isWindowResizing = true;

            // We don't need any fancy debouncing here - we just need to react before the user can start
            // resizing any panels at the new window size. So just listen for first mousemove once the
            // window resize releases mouse capture.
            $(window.document).one("mousemove", function () {
                isWindowResizing = false;
                updateResizeLimits();
            });
        }
    }

    window.addEventListener("resize", onWindowResize, true);

    // Scan DOM for horz-resizable and vert-resizable classes and make them resizable
    AppInit.htmlReady(function () {
        var minSize = DEFAULT_MIN_SIZE;

        $mainView = $(".main-view");
        $sideBar = $("#sidebar");

        $(".vert-resizable").each(function (index, element) {

            if ($(element).data().minsize !== undefined) {
                minSize = $(element).data().minsize;
            }

            if ($(element).hasClass("top-resizer")) {
                makeResizable(element, DIRECTION_VERTICAL, POSITION_TOP, minSize, $(element).hasClass("collapsible"));
            }

            //if ($(element).hasClass("bottom-resizer")) {
            //    makeResizable(element, DIRECTION_VERTICAL, POSITION_BOTTOM, DEFAULT_MIN_SIZE);
            //}
        });

        $(".horz-resizable").each(function (index, element) {

            if ($(element).data().minsize !== undefined) {
                minSize = $(element).data().minsize;
            }

            //if ($(element).hasClass("left-resizer")) {
            //    makeResizable(element, DIRECTION_HORIZONTAL, POSITION_LEFT, DEFAULT_MIN_SIZE);
            //}

            if ($(element).hasClass("right-resizer")) {
                makeResizable(element, DIRECTION_HORIZONTAL, POSITION_RIGHT, minSize, $(element).hasClass("collapsible"), $(element).data().forceleft);
            }
        });

        // The main toolbar is only collapsible.
        if ($("#main-toolbar").hasClass("collapsible") && PreferencesManager.get(PREFS_PURE_CODE)) {
            ViewUtils.hideMainToolBar();
        }
    });

    EventDispatcher.makeEventDispatcher(exports);

    exports.makeResizable   = makeResizable;
    exports.removeSizable   = removeSizable;
    exports.resyncSizer     = resyncSizer;
    exports.toggle          = toggle;
    exports.show            = show;
    exports.hide            = hide;
    exports.isVisible       = isVisible;

    //Resizer Constants
    exports.DIRECTION_VERTICAL   = DIRECTION_VERTICAL;
    exports.DIRECTION_HORIZONTAL = DIRECTION_HORIZONTAL;
    exports.POSITION_TOP         = POSITION_TOP;
    exports.POSITION_RIGHT       = POSITION_RIGHT;
    exports.POSITION_BOTTOM      = POSITION_BOTTOM;
    exports.POSITION_LEFT        = POSITION_LEFT;

    // events
    exports.EVENT_PANEL_COLLAPSED = EVENT_PANEL_COLLAPSED;
    exports.EVENT_PANEL_EXPANDED = EVENT_PANEL_EXPANDED;
    exports.EVENT_PANEL_RESIZE_START = EVENT_PANEL_RESIZE_START;
    exports.EVENT_PANEL_RESIZE_UPDATE = EVENT_PANEL_RESIZE_UPDATE;
    exports.EVENT_PANEL_RESIZE_END = EVENT_PANEL_RESIZE_END;
});
