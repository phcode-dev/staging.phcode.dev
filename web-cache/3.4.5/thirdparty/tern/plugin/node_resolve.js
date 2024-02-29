!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../lib/infer"),require("../lib/tern"),require("./commonjs"),require):"function"==typeof define&&define.amd?define(["../lib/infer","../lib/tern","./commonjs"],mod):mod(tern,tern)}(function(infer,tern,_,require){"use strict";function resolve(name,parentFile){var resolved=resolveToFile(name,parentFile);return resolved&&infer.cx().parent.normalizeFilename(resolved)}var findDeclaredDeps=function(){},resolveToFile;require?function(){var module_=require("module"),path=require("path"),fs=require("fs");function findPackageFile(dir){for(;;){try{return JSON.parse(fs.readFileSync(path.resolve(dir,"package.json")))}catch(e){}var shorter=path.dirname(dir);if(shorter==dir)return null;dir=shorter}}resolveToFile=function(name,parentFile){var projectDir=infer.cx().parent.projectDir,fullParent=path.resolve(projectDir,parentFile),parentDir=path.dirname(fullParent);/^\.\.?\//.test(name)&&(name=path.resolve(projectDir,parentDir,name));var parentModule={id:fullParent,paths:module_._nodeModulePaths(parentDir).concat(module_.globalPaths)};try{return module_._resolveFilename(name,parentModule)}catch(e){return null}},findDeclaredDeps=function(path,knownModules){var packageFile=findPackageFile(path);if(!packageFile)return null;function add(obj){for(var name in obj)name in knownModules||(knownModules[name]=null)}add(packageFile.dependencies),add(packageFile.devDependencies),add(packageFile.peerDependencies)}}():function(){function resolvePath(base,path){if("/"==path[0])return path;var slash=base.lastIndexOf("/"),m;for(slash>=0&&(path=base.slice(0,slash+1)+path);m=/[^\/]*[^\/\.][^\/]*\/\.\.\//.exec(path);)path=path.slice(0,m.index)+path.slice(m.index+m[0].length);return path.replace(/(^|[^\.])\.\//g,"$1")}resolveToFile=function(name,parentFile){return/^\.\.?\//.test(name)?resolvePath(parentFile,name):name}}(),tern.registerPlugin("node_resolve",function(server){server.loadPlugin("commonjs"),server.mod.modules.resolvers.push(resolve),findDeclaredDeps(server.projectDir,server.mod.modules.knownModules)})});
//# sourceMappingURL=node_resolve.js.map
