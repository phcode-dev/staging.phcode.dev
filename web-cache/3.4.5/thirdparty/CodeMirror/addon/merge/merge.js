!function(mod){"object"==typeof exports&&"object"==typeof module?mod(require("../../lib/codemirror")):"function"==typeof define&&define.amd?define(["../../lib/codemirror","diff_match_patch"],mod):mod(CodeMirror)}(function(CodeMirror){"use strict";var Pos=CodeMirror.Pos,svgNS="http://www.w3.org/2000/svg";function DiffView(mv,type){this.mv=mv,this.type=type,this.classes="left"==type?{chunk:"CodeMirror-merge-l-chunk",start:"CodeMirror-merge-l-chunk-start",end:"CodeMirror-merge-l-chunk-end",insert:"CodeMirror-merge-l-inserted",del:"CodeMirror-merge-l-deleted",connect:"CodeMirror-merge-l-connect"}:{chunk:"CodeMirror-merge-r-chunk",start:"CodeMirror-merge-r-chunk-start",end:"CodeMirror-merge-r-chunk-end",insert:"CodeMirror-merge-r-inserted",del:"CodeMirror-merge-r-deleted",connect:"CodeMirror-merge-r-connect"}}function ensureDiff(dv){dv.diffOutOfDate&&(dv.diff=getDiff(dv.orig.getValue(),dv.edit.getValue(),dv.mv.options.ignoreWhitespace),dv.chunks=getChunks(dv.diff),dv.diffOutOfDate=!1,CodeMirror.signal(dv.edit,"updateDiff",dv.diff))}DiffView.prototype={constructor:DiffView,init:function(pane,orig,options){this.edit=this.mv.edit,(this.edit.state.diffViews||(this.edit.state.diffViews=[])).push(this),this.orig=CodeMirror(pane,copyObj({value:orig,readOnly:!this.mv.options.allowEditingOriginals},copyObj(options))),"align"==this.mv.options.connect&&(this.edit.state.trackAlignable||(this.edit.state.trackAlignable=new TrackAlignable(this.edit)),this.orig.state.trackAlignable=new TrackAlignable(this.orig)),this.lockButton.title=this.edit.phrase("Toggle locked scrolling"),this.lockButton.setAttribute("aria-label",this.lockButton.title),this.orig.state.diffViews=[this];var classLocation=options.chunkClassLocation||"background";"[object Array]"!=Object.prototype.toString.call(classLocation)&&(classLocation=[classLocation]),this.classes.classLocation=classLocation,this.diff=getDiff(asString(orig),asString(options.value),this.mv.options.ignoreWhitespace),this.chunks=getChunks(this.diff),this.diffOutOfDate=this.dealigned=!1,this.needsScrollSync=null,this.showDifferences=!1!==options.showDifferences},registerEvents:function(otherDv){this.forceUpdate=registerUpdate(this),setScrollLock(this,!0,!1),registerScroll(this,otherDv)},setShowDifferences:function(val){(val=!1!==val)!=this.showDifferences&&(this.showDifferences=val,this.forceUpdate("full"))}};var updating=!1;function registerUpdate(dv){var edit={from:0,to:0,marked:[]},orig={from:0,to:0,marked:[]},debounceChange,updatingFast=!1;function update(mode){updating=!0,updatingFast=!1,"full"==mode&&(dv.svg&&clear(dv.svg),dv.copyButtons&&clear(dv.copyButtons),clearMarks(dv.edit,edit.marked,dv.classes),clearMarks(dv.orig,orig.marked,dv.classes),edit.from=edit.to=orig.from=orig.to=0),ensureDiff(dv),dv.showDifferences&&(updateMarks(dv.edit,dv.diff,edit,DIFF_INSERT,dv.classes),updateMarks(dv.orig,dv.diff,orig,DIFF_DELETE,dv.classes)),"align"==dv.mv.options.connect&&alignChunks(dv),makeConnections(dv),null!=dv.needsScrollSync&&syncScroll(dv,dv.needsScrollSync),updating=!1}function setDealign(fast){updating||(dv.dealigned=!0,set(fast))}function set(fast){updating||updatingFast||(clearTimeout(debounceChange),!0===fast&&(updatingFast=!0),debounceChange=setTimeout(update,!0===fast?20:250))}function change(_cm,change){dv.diffOutOfDate||(dv.diffOutOfDate=!0,edit.from=edit.to=orig.from=orig.to=0),setDealign(change.text.length-1!=change.to.line-change.from.line)}function swapDoc(){dv.diffOutOfDate=!0,dv.dealigned=!0,update("full")}return dv.edit.on("change",change),dv.orig.on("change",change),dv.edit.on("swapDoc",swapDoc),dv.orig.on("swapDoc",swapDoc),"align"==dv.mv.options.connect&&(CodeMirror.on(dv.edit.state.trackAlignable,"realign",setDealign),CodeMirror.on(dv.orig.state.trackAlignable,"realign",setDealign)),dv.edit.on("viewportChange",function(){set(!1)}),dv.orig.on("viewportChange",function(){set(!1)}),update(),update}function registerScroll(dv,otherDv){dv.edit.on("scroll",function(){syncScroll(dv,!0)&&makeConnections(dv)}),dv.orig.on("scroll",function(){syncScroll(dv,!1)&&makeConnections(dv),otherDv&&syncScroll(otherDv,!0)&&makeConnections(otherDv)})}function syncScroll(dv,toOrig){if(dv.diffOutOfDate)return dv.lockScroll&&null==dv.needsScrollSync&&(dv.needsScrollSync=toOrig),!1;if(dv.needsScrollSync=null,!dv.lockScroll)return!0;var editor,other,now=+new Date;if(toOrig?(editor=dv.edit,other=dv.orig):(editor=dv.orig,other=dv.edit),editor.state.scrollSetBy==dv&&(editor.state.scrollSetAt||0)+250>now)return!1;var sInfo=editor.getScrollInfo();if("align"==dv.mv.options.connect)targetPos=sInfo.top;else{var halfScreen=.5*sInfo.clientHeight,midY=sInfo.top+halfScreen,mid=editor.lineAtHeight(midY,"local"),around=chunkBoundariesAround(dv.chunks,mid,toOrig),off=getOffsets(editor,toOrig?around.edit:around.orig),offOther=getOffsets(other,toOrig?around.orig:around.edit),ratio=(midY-off.top)/(off.bot-off.top),targetPos=offOther.top-halfScreen+ratio*(offOther.bot-offOther.top),botDist,mix;if(targetPos>sInfo.top&&(mix=sInfo.top/halfScreen)<1)targetPos=targetPos*mix+sInfo.top*(1-mix);else if((botDist=sInfo.height-sInfo.clientHeight-sInfo.top)<halfScreen){var otherInfo=other.getScrollInfo(),botDistOther;otherInfo.height-otherInfo.clientHeight-targetPos>botDist&&(mix=botDist/halfScreen)<1&&(targetPos=targetPos*mix+(otherInfo.height-otherInfo.clientHeight-botDist)*(1-mix))}}return other.scrollTo(sInfo.left,targetPos),other.state.scrollSetAt=now,other.state.scrollSetBy=dv,!0}function getOffsets(editor,around){var bot=around.after;return null==bot&&(bot=editor.lastLine()+1),{top:editor.heightAtLine(around.before||0,"local"),bot:editor.heightAtLine(bot,"local")}}function setScrollLock(dv,val,action){dv.lockScroll=val,val&&0!=action&&syncScroll(dv,DIFF_INSERT)&&makeConnections(dv),(val?CodeMirror.addClass:CodeMirror.rmClass)(dv.lockButton,"CodeMirror-merge-scrolllock-enabled")}function removeClass(editor,line,classes){for(var locs=classes.classLocation,i=0;i<locs.length;i++)editor.removeLineClass(line,locs[i],classes.chunk),editor.removeLineClass(line,locs[i],classes.start),editor.removeLineClass(line,locs[i],classes.end)}function clearMarks(editor,arr,classes){for(var i=0;i<arr.length;++i){var mark=arr[i];mark instanceof CodeMirror.TextMarker?mark.clear():mark.parent&&removeClass(editor,mark,classes)}arr.length=0}function updateMarks(editor,diff,state,type,classes){var vp=editor.getViewport();editor.operation(function(){state.from==state.to||vp.from-state.to>20||state.from-vp.to>20?(clearMarks(editor,state.marked,classes),markChanges(editor,diff,type,state.marked,vp.from,vp.to,classes),state.from=vp.from,state.to=vp.to):(vp.from<state.from&&(markChanges(editor,diff,type,state.marked,vp.from,state.from,classes),state.from=vp.from),vp.to>state.to&&(markChanges(editor,diff,type,state.marked,state.to,vp.to,classes),state.to=vp.to))})}function addClass(editor,lineNr,classes,main,start,end){for(var locs=classes.classLocation,line=editor.getLineHandle(lineNr),i=0;i<locs.length;i++)main&&editor.addLineClass(line,locs[i],classes.chunk),start&&editor.addLineClass(line,locs[i],classes.start),end&&editor.addLineClass(line,locs[i],classes.end);return line}function markChanges(editor,diff,type,marks,from,to,classes){var pos=Pos(0,0),top=Pos(from,0),bot=editor.clipPos(Pos(to-1)),cls=type==DIFF_DELETE?classes.del:classes.insert;function markChunk(start,end){for(var bfrom=Math.max(from,start),bto=Math.min(to,end),i=bfrom;i<bto;++i)marks.push(addClass(editor,i,classes,!0,i==start,i==end-1));start==end&&bfrom==end&&bto==end&&(bfrom?marks.push(addClass(editor,bfrom-1,classes,!1,!1,!0)):marks.push(addClass(editor,bfrom,classes,!1,!0,!1)))}for(var chunkStart=0,pending=!1,i=0;i<diff.length;++i){var part=diff[i],tp=part[0],str=part[1];if(tp==DIFF_EQUAL){var cleanFrom=pos.line+(startOfLineClean(diff,i)?0:1);moveOver(pos,str);var cleanTo=pos.line+(endOfLineClean(diff,i)?1:0);cleanTo>cleanFrom&&(pending&&(markChunk(chunkStart,cleanFrom),pending=!1),chunkStart=cleanTo)}else if(pending=!0,tp==type){var end=moveOver(pos,str,!0),a=posMax(top,pos),b=posMin(bot,end);posEq(a,b)||marks.push(editor.markText(a,b,{className:cls})),pos=end}}pending&&markChunk(chunkStart,pos.line+1)}function makeConnections(dv){if(dv.showDifferences){if(dv.svg){clear(dv.svg);var w=dv.gap.offsetWidth;attrs(dv.svg,"width",w,"height",dv.gap.offsetHeight)}dv.copyButtons&&clear(dv.copyButtons);for(var vpEdit=dv.edit.getViewport(),vpOrig=dv.orig.getViewport(),outerTop=dv.mv.wrap.getBoundingClientRect().top,sTopEdit=outerTop-dv.edit.getScrollerElement().getBoundingClientRect().top+dv.edit.getScrollInfo().top,sTopOrig=outerTop-dv.orig.getScrollerElement().getBoundingClientRect().top+dv.orig.getScrollInfo().top,i=0;i<dv.chunks.length;i++){var ch=dv.chunks[i];ch.editFrom<=vpEdit.to&&ch.editTo>=vpEdit.from&&ch.origFrom<=vpOrig.to&&ch.origTo>=vpOrig.from&&drawConnectorsForChunk(dv,ch,sTopOrig,sTopEdit,w)}}}function getMatchingOrigLine(editLine,chunks){for(var editStart=0,origStart=0,i=0;i<chunks.length;i++){var chunk=chunks[i];if(chunk.editTo>editLine&&chunk.editFrom<=editLine)return null;if(chunk.editFrom>editLine)break;editStart=chunk.editTo,origStart=chunk.origTo}return origStart+(editLine-editStart)}function alignableFor(cm,chunks,isOrig){for(var tracker=cm.state.trackAlignable,start=cm.firstLine(),trackI=0,result=[],i=0;;i++){for(var chunk=chunks[i],chunkStart=chunk?isOrig?chunk.origFrom:chunk.editFrom:1e9;trackI<tracker.alignable.length;trackI+=2){var n=tracker.alignable[trackI]+1;if(!(n<=start)){if(!(n<=chunkStart))break;result.push(n)}}if(!chunk)break;result.push(start=isOrig?chunk.origTo:chunk.editTo)}return result}function mergeAlignable(result,origAlignable,chunks,setIndex){var rI=0,origI=0,chunkI=0,diff=0;outer:for(;;rI++){var nextR=result[rI],nextO=origAlignable[origI];if(!nextR&&null==nextO)break;for(var rLine=nextR?nextR[0]:1e9,oLine=null==nextO?1e9:nextO;chunkI<chunks.length;){var chunk=chunks[chunkI];if(chunk.origFrom<=oLine&&chunk.origTo>oLine){origI++,rI--;continue outer}if(chunk.editTo>rLine){if(chunk.editFrom<=rLine)continue outer;break}diff+=chunk.origTo-chunk.origFrom-(chunk.editTo-chunk.editFrom),chunkI++}if(rLine==oLine-diff)nextR[setIndex]=oLine,origI++;else if(rLine<oLine-diff)nextR[setIndex]=rLine+diff;else{var record=[oLine-diff,null,null];record[setIndex]=oLine,result.splice(rI,0,record),origI++}}}function findAlignedLines(dv,other){var alignable=alignableFor(dv.edit,dv.chunks,!1),result=[];if(other)for(var i=0,j=0;i<other.chunks.length;i++){for(var n=other.chunks[i].editTo;j<alignable.length&&alignable[j]<n;)j++;j!=alignable.length&&alignable[j]==n||alignable.splice(j++,0,n)}for(var i=0;i<alignable.length;i++)result.push([alignable[i],null,null]);return mergeAlignable(result,alignableFor(dv.orig,dv.chunks,!0),dv.chunks,1),other&&mergeAlignable(result,alignableFor(other.orig,other.chunks,!0),other.chunks,2),result}function alignChunks(dv,force){if(dv.dealigned||force){if(!dv.orig.curOp)return dv.orig.operation(function(){alignChunks(dv,force)});dv.dealigned=!1;var other=dv.mv.left==dv?dv.mv.right:dv.mv.left;other&&(ensureDiff(other),other.dealigned=!1);for(var linesToAlign=findAlignedLines(dv,other),aligners=dv.mv.aligners,i=0;i<aligners.length;i++)aligners[i].clear();aligners.length=0;var cm=[dv.edit,dv.orig],scroll=[],offset=[];other&&cm.push(other.orig);for(var i=0;i<cm.length;i++)scroll.push(cm[i].getScrollInfo().top),offset.push(-cm[i].getScrollerElement().getBoundingClientRect().top);(offset[0]!=offset[1]||3==cm.length&&offset[1]!=offset[2])&&alignLines(cm,offset,[0,0,0],aligners);for(var ln=0;ln<linesToAlign.length;ln++)alignLines(cm,offset,linesToAlign[ln],aligners);for(var i=0;i<cm.length;i++)cm[i].scrollTo(null,scroll[i])}}function alignLines(cm,cmOffset,lines,aligners){for(var maxOffset=-1e8,offset=[],i=0;i<cm.length;i++)if(null!=lines[i]){var off=cm[i].heightAtLine(lines[i],"local")-cmOffset[i];offset[i]=off,maxOffset=Math.max(maxOffset,off)}for(var i=0;i<cm.length;i++)if(null!=lines[i]){var diff=maxOffset-offset[i];diff>1&&aligners.push(padAbove(cm[i],lines[i],diff))}}function padAbove(cm,line,size){var above=!0;line>cm.lastLine()&&(line--,above=!1);var elt=document.createElement("div");return elt.className="CodeMirror-merge-spacer",elt.style.height=size+"px",elt.style.minWidth="1px",cm.addLineWidget(line,elt,{height:size,above:above,mergeSpacer:!0,handleMouseEvents:!0})}function drawConnectorsForChunk(dv,chunk,sTopOrig,sTopEdit,w){var flip="left"==dv.type,top=dv.orig.heightAtLine(chunk.origFrom,"local",!0)-sTopOrig;if(dv.svg){var topLpx=top,topRpx=dv.edit.heightAtLine(chunk.editFrom,"local",!0)-sTopEdit;if(flip){var tmp=topLpx;topLpx=topRpx,topRpx=tmp}var botLpx=dv.orig.heightAtLine(chunk.origTo,"local",!0)-sTopOrig,botRpx=dv.edit.heightAtLine(chunk.editTo,"local",!0)-sTopEdit;if(flip){var tmp=botLpx;botLpx=botRpx,botRpx=tmp}var curveTop=" C "+w/2+" "+topRpx+" "+w/2+" "+topLpx+" "+(w+2)+" "+topLpx,curveBot=" C "+w/2+" "+botLpx+" "+w/2+" "+botRpx+" -1 "+botRpx;attrs(dv.svg.appendChild(document.createElementNS(svgNS,"path")),"d","M -1 "+topRpx+curveTop+" L "+(w+2)+" "+botLpx+curveBot+" z","class",dv.classes.connect)}if(dv.copyButtons){var copy=dv.copyButtons.appendChild(elt("div","left"==dv.type?"⇝":"⇜","CodeMirror-merge-copy")),editOriginals=dv.mv.options.allowEditingOriginals;if(copy.title=dv.edit.phrase(editOriginals?"Push to left":"Revert chunk"),copy.chunk=chunk,copy.style.top=(chunk.origTo>chunk.origFrom?top:dv.edit.heightAtLine(chunk.editFrom,"local")-sTopEdit)+"px",copy.setAttribute("role","button"),copy.setAttribute("tabindex","0"),copy.setAttribute("aria-label",copy.title),editOriginals){var topReverse=dv.edit.heightAtLine(chunk.editFrom,"local")-sTopEdit,copyReverse=dv.copyButtons.appendChild(elt("div","right"==dv.type?"⇝":"⇜","CodeMirror-merge-copy-reverse"));copyReverse.title="Push to right",copyReverse.chunk={editFrom:chunk.origFrom,editTo:chunk.origTo,origFrom:chunk.editFrom,origTo:chunk.editTo},copyReverse.style.top=topReverse+"px","right"==dv.type?copyReverse.style.left="2px":copyReverse.style.right="2px",copyReverse.setAttribute("role","button"),copyReverse.setAttribute("tabindex","0"),copyReverse.setAttribute("aria-label",copyReverse.title)}}}function copyChunk(dv,to,from,chunk){if(!dv.diffOutOfDate){var origStart=chunk.origTo>from.lastLine()?Pos(chunk.origFrom-1):Pos(chunk.origFrom,0),origEnd=Pos(chunk.origTo,0),editStart=chunk.editTo>to.lastLine()?Pos(chunk.editFrom-1):Pos(chunk.editFrom,0),editEnd=Pos(chunk.editTo,0),handler=dv.mv.options.revertChunk;handler?handler(dv.mv,from,origStart,origEnd,to,editStart,editEnd):to.replaceRange(from.getRange(origStart,origEnd),editStart,editEnd)}}var MergeView=CodeMirror.MergeView=function(node,options){if(!(this instanceof MergeView))return new MergeView(node,options);this.options=options;var origLeft=options.origLeft,origRight=null==options.origRight?options.orig:options.origRight,hasLeft=null!=origLeft,hasRight=null!=origRight,panes=1+(hasLeft?1:0)+(hasRight?1:0),wrap=[],left=this.left=null,right=this.right=null,self=this;if(hasLeft){left=this.left=new DiffView(this,"left");var leftPane=elt("div",null,"CodeMirror-merge-pane CodeMirror-merge-left");wrap.push(leftPane),wrap.push(buildGap(left))}var editPane=elt("div",null,"CodeMirror-merge-pane CodeMirror-merge-editor");if(wrap.push(editPane),hasRight){right=this.right=new DiffView(this,"right"),wrap.push(buildGap(right));var rightPane=elt("div",null,"CodeMirror-merge-pane CodeMirror-merge-right");wrap.push(rightPane)}(hasRight?rightPane:editPane).className+=" CodeMirror-merge-pane-rightmost",wrap.push(elt("div",null,null,"height: 0; clear: both;"));var wrapElt=this.wrap=node.appendChild(elt("div",wrap,"CodeMirror-merge CodeMirror-merge-"+panes+"pane"));this.edit=CodeMirror(editPane,copyObj(options)),left&&left.init(leftPane,origLeft,options),right&&right.init(rightPane,origRight,options),options.collapseIdentical&&this.editor().operation(function(){collapseIdenticalStretches(self,options.collapseIdentical)}),"align"==options.connect&&(this.aligners=[],alignChunks(this.left||this.right,!0)),left&&left.registerEvents(right),right&&right.registerEvents(left);var onResize=function(){left&&makeConnections(left),right&&makeConnections(right)};CodeMirror.on(window,"resize",onResize);var resizeInterval=setInterval(function(){for(var p=wrapElt.parentNode;p&&p!=document.body;p=p.parentNode);p||(clearInterval(resizeInterval),CodeMirror.off(window,"resize",onResize))},5e3)},dmp;function buildGap(dv){var lock=dv.lockButton=elt("div",null,"CodeMirror-merge-scrolllock");lock.setAttribute("role","button"),lock.setAttribute("tabindex","0");var lockWrap=elt("div",[lock],"CodeMirror-merge-scrolllock-wrap");CodeMirror.on(lock,"click",function(){setScrollLock(dv,!dv.lockScroll)}),CodeMirror.on(lock,"keyup",function(e){"Enter"===e.key&&setScrollLock(dv,!dv.lockScroll)});var gapElts=[lockWrap];if(!1!==dv.mv.options.revertButtons){function copyButtons(e){var node=e.target||e.srcElement;node.chunk&&("CodeMirror-merge-copy-reverse"!=node.className?copyChunk(dv,dv.edit,dv.orig,node.chunk):copyChunk(dv,dv.orig,dv.edit,node.chunk))}dv.copyButtons=elt("div",null,"CodeMirror-merge-copybuttons-"+dv.type),CodeMirror.on(dv.copyButtons,"click",copyButtons),CodeMirror.on(dv.copyButtons,"keyup",function(e){"Enter"===e.key&&copyButtons(e)}),gapElts.unshift(dv.copyButtons)}if("align"!=dv.mv.options.connect){var svg=document.createElementNS&&document.createElementNS(svgNS,"svg");svg&&!svg.createSVGRect&&(svg=null),dv.svg=svg,svg&&gapElts.push(svg)}return dv.gap=elt("div",gapElts,"CodeMirror-merge-gap")}function asString(obj){return"string"==typeof obj?obj:obj.getValue()}function getDiff(a,b,ignoreWhitespace){dmp||(dmp=new diff_match_patch);for(var diff=dmp.diff_main(a,b),i=0;i<diff.length;++i){var part=diff[i];(ignoreWhitespace?/[^ \t]/.test(part[1]):part[1])?i&&diff[i-1][0]==part[0]&&(diff.splice(i--,1),diff[i][1]+=part[1]):diff.splice(i--,1)}return diff}function getChunks(diff){var chunks=[];if(!diff.length)return chunks;for(var startEdit=0,startOrig=0,edit=Pos(0,0),orig=Pos(0,0),i=0;i<diff.length;++i){var part=diff[i],tp=part[0];if(tp==DIFF_EQUAL){var startOff=!startOfLineClean(diff,i)||edit.line<startEdit||orig.line<startOrig?1:0,cleanFromEdit=edit.line+startOff,cleanFromOrig=orig.line+startOff;moveOver(edit,part[1],null,orig);var endOff=endOfLineClean(diff,i)?1:0,cleanToEdit=edit.line+endOff,cleanToOrig=orig.line+endOff;cleanToEdit>cleanFromEdit&&(i&&chunks.push({origFrom:startOrig,origTo:cleanFromOrig,editFrom:startEdit,editTo:cleanFromEdit}),startEdit=cleanToEdit,startOrig=cleanToOrig)}else moveOver(tp==DIFF_INSERT?edit:orig,part[1])}return(startEdit<=edit.line||startOrig<=orig.line)&&chunks.push({origFrom:startOrig,origTo:orig.line+1,editFrom:startEdit,editTo:edit.line+1}),chunks}function endOfLineClean(diff,i){if(i==diff.length-1)return!0;var next=diff[i+1][1];return!(1==next.length&&i<diff.length-2||10!=next.charCodeAt(0))&&(i==diff.length-2||((next=diff[i+2][1]).length>1||i==diff.length-3)&&10==next.charCodeAt(0))}function startOfLineClean(diff,i){if(0==i)return!0;var last=diff[i-1][1];return 10==last.charCodeAt(last.length-1)&&(1==i||10==(last=diff[i-2][1]).charCodeAt(last.length-1))}function chunkBoundariesAround(chunks,n,nInEdit){for(var beforeE,afterE,beforeO,afterO,i=0;i<chunks.length;i++){var chunk=chunks[i],fromLocal=nInEdit?chunk.editFrom:chunk.origFrom,toLocal=nInEdit?chunk.editTo:chunk.origTo;null==afterE&&(fromLocal>n?(afterE=chunk.editFrom,afterO=chunk.origFrom):toLocal>n&&(afterE=chunk.editTo,afterO=chunk.origTo)),toLocal<=n?(beforeE=chunk.editTo,beforeO=chunk.origTo):fromLocal<=n&&(beforeE=chunk.editFrom,beforeO=chunk.origFrom)}return{edit:{before:beforeE,after:afterE},orig:{before:beforeO,after:afterO}}}function collapseSingle(cm,from,to){cm.addLineClass(from,"wrap","CodeMirror-merge-collapsed-line");var widget=document.createElement("span");widget.className="CodeMirror-merge-collapsed-widget",widget.title=cm.phrase("Identical text collapsed. Click to expand.");var mark=cm.markText(Pos(from,0),Pos(to-1),{inclusiveLeft:!0,inclusiveRight:!0,replacedWith:widget,clearOnEnter:!0});function clear(){mark.clear(),cm.removeLineClass(from,"wrap","CodeMirror-merge-collapsed-line")}return mark.explicitlyCleared&&clear(),CodeMirror.on(widget,"click",clear),mark.on("clear",clear),CodeMirror.on(widget,"click",clear),{mark:mark,clear:clear}}function collapseStretch(size,editors){var marks=[];function clear(){for(var i=0;i<marks.length;i++)marks[i].clear()}for(var i=0;i<editors.length;i++){var editor=editors[i],mark=collapseSingle(editor.cm,editor.line,editor.line+size);marks.push(mark),mark.mark.on("clear",clear)}return marks[0].mark}function unclearNearChunks(dv,margin,off,clear){for(var i=0;i<dv.chunks.length;i++)for(var chunk=dv.chunks[i],l=chunk.editFrom-margin;l<chunk.editTo+margin;l++){var pos=l+off;pos>=0&&pos<clear.length&&(clear[pos]=!1)}}function collapseIdenticalStretches(mv,margin){"number"!=typeof margin&&(margin=2);for(var clear=[],edit=mv.editor(),off=edit.firstLine(),l=off,e=edit.lastLine();l<=e;l++)clear.push(!0);mv.left&&unclearNearChunks(mv.left,margin,off,clear),mv.right&&unclearNearChunks(mv.right,margin,off,clear);for(var i=0;i<clear.length;i++)if(clear[i]){for(var line=i+off,size=1;i<clear.length-1&&clear[i+1];i++,size++);if(size>margin){var editors=[{line:line,cm:edit}];mv.left&&editors.push({line:getMatchingOrigLine(line,mv.left.chunks),cm:mv.left.orig}),mv.right&&editors.push({line:getMatchingOrigLine(line,mv.right.chunks),cm:mv.right.orig});var mark=collapseStretch(size,editors);mv.options.onCollapse&&mv.options.onCollapse(mv,line,size,mark)}}}function elt(tag,content,className,style){var e=document.createElement(tag);if(className&&(e.className=className),style&&(e.style.cssText=style),"string"==typeof content)e.appendChild(document.createTextNode(content));else if(content)for(var i=0;i<content.length;++i)e.appendChild(content[i]);return e}function clear(node){for(var count=node.childNodes.length;count>0;--count)node.removeChild(node.firstChild)}function attrs(elt){for(var i=1;i<arguments.length;i+=2)elt.setAttribute(arguments[i],arguments[i+1])}function copyObj(obj,target){for(var prop in target||(target={}),obj)obj.hasOwnProperty(prop)&&(target[prop]=obj[prop]);return target}function moveOver(pos,str,copy,other){for(var out=copy?Pos(pos.line,pos.ch):pos,at=0;;){var nl=str.indexOf("\n",at);if(-1==nl)break;++out.line,other&&++other.line,at=nl+1}return out.ch=(at?0:out.ch)+(str.length-at),other&&(other.ch=(at?0:other.ch)+(str.length-at)),out}MergeView.prototype={constructor:MergeView,editor:function(){return this.edit},rightOriginal:function(){return this.right&&this.right.orig},leftOriginal:function(){return this.left&&this.left.orig},setShowDifferences:function(val){this.right&&this.right.setShowDifferences(val),this.left&&this.left.setShowDifferences(val)},rightChunks:function(){if(this.right)return ensureDiff(this.right),this.right.chunks},leftChunks:function(){if(this.left)return ensureDiff(this.left),this.left.chunks}};var F_WIDGET=1,F_WIDGET_BELOW=2,F_MARKER=4;function TrackAlignable(cm){this.cm=cm,this.alignable=[],this.height=cm.doc.height;var self=this;cm.on("markerAdded",function(_,marker){if(marker.collapsed){var found=marker.find(1);null!=found&&self.set(found.line,F_MARKER)}}),cm.on("markerCleared",function(_,marker,_min,max){null!=max&&marker.collapsed&&self.check(max,F_MARKER,self.hasMarker)}),cm.on("markerChanged",this.signal.bind(this)),cm.on("lineWidgetAdded",function(_,widget,lineNo){widget.mergeSpacer||(widget.above?self.set(lineNo-1,F_WIDGET_BELOW):self.set(lineNo,F_WIDGET))}),cm.on("lineWidgetCleared",function(_,widget,lineNo){widget.mergeSpacer||(widget.above?self.check(lineNo-1,F_WIDGET_BELOW,self.hasWidgetBelow):self.check(lineNo,F_WIDGET,self.hasWidget))}),cm.on("lineWidgetChanged",this.signal.bind(this)),cm.on("change",function(_,change){var start=change.from.line,nBefore=change.to.line-change.from.line,nAfter=change.text.length-1,end=start+nAfter;(nBefore||nAfter)&&self.map(start,nBefore,nAfter),self.check(end,F_MARKER,self.hasMarker),(nBefore||nAfter)&&self.check(change.from.line,F_MARKER,self.hasMarker)}),cm.on("viewportChange",function(){self.cm.doc.height!=self.height&&self.signal()})}function posMin(a,b){return(a.line-b.line||a.ch-b.ch)<0?a:b}function posMax(a,b){return(a.line-b.line||a.ch-b.ch)>0?a:b}function posEq(a,b){return a.line==b.line&&a.ch==b.ch}function findPrevDiff(chunks,start,isOrig){for(var i=chunks.length-1;i>=0;i--){var chunk=chunks[i],to=(isOrig?chunk.origTo:chunk.editTo)-1;if(to<start)return to}}function findNextDiff(chunks,start,isOrig){for(var i=0;i<chunks.length;i++){var chunk=chunks[i],from=isOrig?chunk.origFrom:chunk.editFrom;if(from>start)return from}}function goNearbyDiff(cm,dir){var found=null,views=cm.state.diffViews,line=cm.getCursor().line;if(views)for(var i=0;i<views.length;i++){var dv=views[i],isOrig=cm==dv.orig;ensureDiff(dv);var pos=dir<0?findPrevDiff(dv.chunks,line,isOrig):findNextDiff(dv.chunks,line,isOrig);null==pos||null!=found&&!(dir<0?pos>found:pos<found)||(found=pos)}if(null==found)return CodeMirror.Pass;cm.setCursor(found,0)}TrackAlignable.prototype={signal:function(){CodeMirror.signal(this,"realign"),this.height=this.cm.doc.height},set:function(n,flags){for(var pos=-1;pos<this.alignable.length;pos+=2){var diff=this.alignable[pos]-n;if(0==diff){if((this.alignable[pos+1]&flags)==flags)return;return this.alignable[pos+1]|=flags,void this.signal()}if(diff>0)break}this.signal(),this.alignable.splice(pos,0,n,flags)},find:function(n){for(var i=0;i<this.alignable.length;i+=2)if(this.alignable[i]==n)return i;return-1},check:function(n,flag,pred){var found=this.find(n);if(-1!=found&&this.alignable[found+1]&flag&&!pred.call(this,n)){this.signal();var flags=this.alignable[found+1]&~flag;flags?this.alignable[found+1]=flags:this.alignable.splice(found,2)}},hasMarker:function(n){var handle=this.cm.getLineHandle(n);if(handle.markedSpans)for(var i=0;i<handle.markedSpans.length;i++)if(handle.markedSpans[i].marker.collapsed&&null!=handle.markedSpans[i].to)return!0;return!1},hasWidget:function(n){var handle=this.cm.getLineHandle(n);if(handle.widgets)for(var i=0;i<handle.widgets.length;i++)if(!handle.widgets[i].above&&!handle.widgets[i].mergeSpacer)return!0;return!1},hasWidgetBelow:function(n){if(n==this.cm.lastLine())return!1;var handle=this.cm.getLineHandle(n+1);if(handle.widgets)for(var i=0;i<handle.widgets.length;i++)if(handle.widgets[i].above&&!handle.widgets[i].mergeSpacer)return!0;return!1},map:function(from,nBefore,nAfter){for(var diff=nAfter-nBefore,to=from+nBefore,widgetFrom=-1,widgetTo=-1,i=0;i<this.alignable.length;i+=2){var n=this.alignable[i];n==from&&this.alignable[i+1]&F_WIDGET_BELOW&&(widgetFrom=i),n==to&&this.alignable[i+1]&F_WIDGET_BELOW&&(widgetTo=i),n<=from||(n<to?this.alignable.splice(i--,2):this.alignable[i]+=diff)}if(widgetFrom>-1){var flags=this.alignable[widgetFrom+1];flags==F_WIDGET_BELOW?this.alignable.splice(widgetFrom,2):this.alignable[widgetFrom+1]=flags&~F_WIDGET_BELOW}widgetTo>-1&&nAfter&&this.set(from+nAfter,F_WIDGET_BELOW)}},CodeMirror.commands.goNextDiff=function(cm){return goNearbyDiff(cm,1)},CodeMirror.commands.goPrevDiff=function(cm){return goNearbyDiff(cm,-1)}});
//# sourceMappingURL=merge.js.map
