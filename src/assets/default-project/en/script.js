function onPageLoaded(){console.log("page loaded")}document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll(".play-button").forEach(function(button){button.addEventListener("click",function(){this.parentNode.querySelector("a").click()})})});
//# sourceMappingURL=script.js.map
