define(function(require,exports,module){let _serverProviders=[];function _providerSort(a,b){return b.priority-a.priority}function getServer(localPath){var provider,server,i;for(i=0;i<_serverProviders.length;i++)if((server=(provider=_serverProviders[i]).create()).canServe(localPath))return server;return null}function registerServer(provider,priority){if(provider.create){var providerObj={};return providerObj.create=provider.create,providerObj.priority=priority||0,_serverProviders.push(providerObj),_serverProviders.sort(_providerSort),providerObj}console.error("Incompatible live development server provider")}function removeServer(provider){var i;for(i=0;i<_serverProviders.length;i++)provider===_serverProviders[i]&&_serverProviders.splice(i,1)}const LIVE_PREVIEW_STATIC_SERVER_BASE_URL="https://phcode.live/",LIVE_PREVIEW_STATIC_SERVER_ORIGIN="https://phcode.live";function getStaticServerBaseURLs(){return{baseURL:LIVE_PREVIEW_STATIC_SERVER_BASE_URL,origin:LIVE_PREVIEW_STATIC_SERVER_ORIGIN,projectBaseURL:`${LIVE_PREVIEW_STATIC_SERVER_BASE_URL}vfs/PHOENIX_LIVE_PREVIEW_${Phoenix.PHOENIX_INSTANCE_ID}`}}exports.getProvider=getServer,exports.registerProvider=registerServer,exports.getServer=getServer,exports.registerServer=registerServer,exports.removeServer=removeServer,exports.getStaticServerBaseURLs=getStaticServerBaseURLs});
//# sourceMappingURL=LiveDevServerManager.js.map
