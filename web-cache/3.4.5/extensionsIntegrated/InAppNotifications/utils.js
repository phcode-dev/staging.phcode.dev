define(function(require,exports,module){const semver=require("thirdparty/semver.browser");function isValidForThisVersion(versionFilter){return semver.satisfies(brackets.metadata.apiVersion,versionFilter)}function isValidForThisPlatform(platformFilter){return!!((platformFilter=platformFilter.split(",")).includes("all")||platformFilter.includes(brackets.platform)&&Phoenix.browser.isTauri||platformFilter.includes("allDesktop")&&Phoenix.browser.isTauri||platformFilter.includes("firefox")&&Phoenix.browser.desktop.isFirefox&&!Phoenix.browser.isTauri||platformFilter.includes("chrome")&&Phoenix.browser.desktop.isChromeBased&&!Phoenix.browser.isTauri||platformFilter.includes("safari")&&Phoenix.browser.desktop.isSafari&&!Phoenix.browser.isTauri||platformFilter.includes("allBrowser")&&!Phoenix.browser.isTauri)}exports.isValidForThisVersion=isValidForThisVersion,exports.isValidForThisPlatform=isValidForThisPlatform});
//# sourceMappingURL=utils.js.map
