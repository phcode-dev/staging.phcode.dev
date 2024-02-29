define(function(require,exports,module){var FileSystemError=require("filesystem/FileSystemError"),WatchedRoot=require("filesystem/WatchedRoot"),VISIT_DEFAULT_MAX_DEPTH=100,VISIT_DEFAULT_MAX_ENTRIES=2e5,nextId=0;function FileSystemEntry(path,fileSystem){this._setPath(path),this._fileSystem=fileSystem,this._id=nextId++}Object.defineProperties(FileSystemEntry.prototype,{fullPath:{get:function(){return this._path},set:function(){throw new Error("Cannot set fullPath")}},name:{get:function(){return this._name},set:function(){throw new Error("Cannot set name")}},parentPath:{get:function(){return this._parentPath},set:function(){throw new Error("Cannot set parentPath")}},id:{get:function(){return this._id},set:function(){throw new Error("Cannot set id")}},isFile:{get:function(){return this._isFile},set:function(){throw new Error("Cannot set isFile")}},isDirectory:{get:function(){return this._isDirectory},set:function(){throw new Error("Cannot set isDirectory")}},_impl:{get:function(){return this._fileSystem._impl},set:function(){throw new Error("Cannot set _impl")}}}),FileSystemEntry.prototype._stat=null,FileSystemEntry.prototype._fileSystem=null,FileSystemEntry.prototype._path=null,FileSystemEntry.prototype._name=null,FileSystemEntry.prototype._parentPath=null,FileSystemEntry.prototype._isFile=!1,FileSystemEntry.prototype._isDirectory=!1,FileSystemEntry.prototype._watchedRoot=void 0,FileSystemEntry.prototype._watchedRootFilterResult=void 0,FileSystemEntry.prototype._isWatched=function(relaxed){var watchedRoot=this._watchedRoot,filterResult=this._watchedRootFilterResult;if(!watchedRoot&&(watchedRoot=this._fileSystem._findWatchedRootForPath(this._path))){var parentEntry;if(this._watchedRoot=watchedRoot,watchedRoot.entry!==this)filterResult=!1!==this._fileSystem.getDirectoryForPath(this._parentPath)._isWatched()&&watchedRoot.filter(this._name,this._parentPath);else filterResult=!0;this._watchedRootFilterResult=filterResult}if(watchedRoot){if(watchedRoot.status===WatchedRoot.ACTIVE||relaxed&&watchedRoot.status===WatchedRoot.STARTING)return filterResult;this._watchedRoot=void 0,this._watchedRootFilterResult=!1,this._clearCachedData()}return!1},FileSystemEntry.prototype._setPath=function(newPath){var parts=newPath.split("/");this.isDirectory&&parts.pop(),this._name=parts[parts.length-1],parts.pop(),parts.length>0?this._parentPath=parts.join("/")+"/":this._parentPath=null,this._path=newPath;var watchedRoot=this._watchedRoot;watchedRoot&&(0===newPath.indexOf(watchedRoot.entry.fullPath)?this._watchedRootFilterResult=watchedRoot.filter(this._name,this._parentPath):(this._watchedRoot=null,this._watchedRootFilterResult=!1))},FileSystemEntry.prototype._clearCachedData=function(){this._stat=void 0},FileSystemEntry.prototype.toString=function(){return"["+(this.isDirectory?"Directory ":"File ")+this._path+"]"},FileSystemEntry.prototype.exists=function(callback){this._stat?callback(null,!0):this._impl.exists(this._path,function(err,exists){if(err)return this._clearCachedData(),void callback(err);exists||this._clearCachedData(),callback(null,exists)}.bind(this))},FileSystemEntry.prototype.existsAsync=async function(){let that=this;return new Promise((resolve,reject)=>{that.exists((err,exists)=>{err?reject(err):resolve(exists)})})},FileSystemEntry.prototype.stat=function(callback){this._stat?callback(null,this._stat):this._impl.stat(this._path,function(err,stat){if(err)return this._clearCachedData(),void callback(err);this._isWatched()&&(this._stat=stat),callback(null,stat)}.bind(this))},FileSystemEntry.prototype.statAsync=async function(){let that=this;return new Promise((resolve,reject)=>{that.stat((err,stat)=>{err?reject(err):resolve(stat)})})},FileSystemEntry.prototype.rename=function(newFullPath,callback){callback=callback||function(){},this.isDirectory&&(newFullPath=Phoenix.VFS.ensureTrailingSlash(newFullPath)),this._fileSystem._beginChange(),this._impl.rename(this._path,newFullPath,function(err){var oldFullPath=this._path;try{if(err)return this._clearCachedData(),void callback(err);this._fileSystem._handleRename(oldFullPath,newFullPath,this.isDirectory);try{callback(null)}finally{this._fileSystem._fireRenameEvent(oldFullPath,newFullPath)}}finally{this._fileSystem._endChange()}}.bind(this))},FileSystemEntry.prototype.unlinkAsync=function(){let that=this;return new Promise((resolve,reject)=>{that.unlink(err=>{err?reject(err):resolve()})})},FileSystemEntry.prototype.unlink=function(callback){callback=callback||function(){},this._fileSystem._beginChange(),this._clearCachedData(),this._impl.unlink(this._path,function(err){var parent=this._fileSystem.getDirectoryForPath(this.parentPath);this._fileSystem._handleDirectoryChange(parent,function(added,removed){try{callback(err)}finally{parent._isWatched()&&this._fileSystem._fireChangeEvent(parent,added,removed),this._fileSystem._endChange()}}.bind(this))}.bind(this))},FileSystemEntry.prototype.moveToTrash=function(callback){this._impl.moveToTrash?(callback=callback||function(){},this._fileSystem._beginChange(),this._clearCachedData(),this._impl.moveToTrash(this._path,function(err){var parent=this._fileSystem.getDirectoryForPath(this.parentPath);this._fileSystem._handleDirectoryChange(parent,function(added,removed){try{callback(err)}finally{parent._isWatched()&&this._fileSystem._fireChangeEvent(parent,added,removed),this._fileSystem._endChange()}}.bind(this))}.bind(this))):this.unlink(callback)},FileSystemEntry.prototype._visitHelper=function(stats,visitedPaths,visitor,options,_currentDepth=0){return new Promise((resolve,reject)=>{const self=this;let maxDepth=options.maxDepth,maxEntries=options.maxEntries,sortList=options.sortList,totalPathsVisited=visitedPaths._totalPathsVisited||0,shouldVisitChildren;if(self.isDirectory){var currentPath=stats.realPath||self.fullPath;if(visitedPaths.hasOwnProperty(currentPath))return void resolve();visitedPaths[currentPath]=!0}visitedPaths._totalPathsVisited>=maxEntries?reject(FileSystemError.TOO_MANY_ENTRIES):(visitedPaths._totalPathsVisited=totalPathsVisited+1,!visitor(self)||self.isFile||_currentDepth>=maxDepth?resolve():self.getContents(async function(err,entries,entriesStats){if(err)reject(err);else{for(let i=0;i<entriesStats.length;i++)entries[i]._entryStats=entriesStats[i];if(sortList){function compare(entry1,entry2){return entry1._name.toLocaleLowerCase().localeCompare(entry2._name.toLocaleLowerCase())}entries=entries.sort(compare)}try{for(let entry of entries)await entry._visitHelper(entry._entryStats,visitedPaths,visitor,options,_currentDepth+1);resolve()}catch(e){reject(e)}}}))})},FileSystemEntry.prototype.visit=function(visitor,options,callback){let self=this;"function"==typeof options?(callback=options,options={}):(void 0===options&&(options={}),callback=callback||function(){}),void 0===options.maxDepth&&(options.maxDepth=100),void 0===options.maxEntries&&(options.maxEntries=2e5),self.stat(function(err,stats){err?callback(err):self._visitHelper(stats,{},visitor,options).then(()=>{callback(null)}).catch(err=>{callback(err)})})},module.exports=FileSystemEntry});
//# sourceMappingURL=FileSystemEntry.js.map
