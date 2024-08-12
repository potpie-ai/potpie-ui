/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/scrollparent";
exports.ids = ["vendor-chunks/scrollparent"];
exports.modules = {

/***/ "(ssr)/./node_modules/scrollparent/scrollparent.js":
/*!***************************************************!*\
  !*** ./node_modules/scrollparent/scrollparent.js ***!
  \***************************************************/
/***/ (function(module, exports) {

eval("var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function (root, factory) {\n  if (true) {\n    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),\n\t\t__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?\n\t\t(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),\n\t\t__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));\n  } else {}\n}(this, function () {\n  function isScrolling(node) {\n    var overflow = getComputedStyle(node, null).getPropertyValue(\"overflow\");\n\n    return overflow.indexOf(\"scroll\") > -1 || overflow.indexOf(\"auto\") > - 1;\n  }\n\n  function scrollParent(node) {\n    if (!(node instanceof HTMLElement || node instanceof SVGElement)) {\n      return undefined;\n    }\n\n    var current = node.parentNode;\n    while (current.parentNode) {\n      if (isScrolling(current)) {\n        return current;\n      }\n\n      current = current.parentNode;\n    }\n\n    return document.scrollingElement || document.documentElement;\n  }\n\n  return scrollParent;\n}));//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvc2Nyb2xscGFyZW50L3Njcm9sbHBhcmVudC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUNBLE1BQU0sSUFBMEM7QUFDaEQsSUFBSSxpQ0FBTyxFQUFFLG9DQUFFLE9BQU87QUFBQTtBQUFBO0FBQUEsa0dBQUM7QUFDdkIsSUFBSSxLQUFLLEVBSU47QUFDSCxDQUFDO0FBQ0Q7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0EsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL3JlYWN0Zmxvdy8uL25vZGVfbW9kdWxlcy9zY3JvbGxwYXJlbnQvc2Nyb2xscGFyZW50LmpzPzFjMDAiXSwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuU2Nyb2xscGFyZW50ID0gZmFjdG9yeSgpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gaXNTY3JvbGxpbmcobm9kZSkge1xuICAgIHZhciBvdmVyZmxvdyA9IGdldENvbXB1dGVkU3R5bGUobm9kZSwgbnVsbCkuZ2V0UHJvcGVydHlWYWx1ZShcIm92ZXJmbG93XCIpO1xuXG4gICAgcmV0dXJuIG92ZXJmbG93LmluZGV4T2YoXCJzY3JvbGxcIikgPiAtMSB8fCBvdmVyZmxvdy5pbmRleE9mKFwiYXV0b1wiKSA+IC0gMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNjcm9sbFBhcmVudChub2RlKSB7XG4gICAgaWYgKCEobm9kZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50IHx8IG5vZGUgaW5zdGFuY2VvZiBTVkdFbGVtZW50KSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICB2YXIgY3VycmVudCA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICB3aGlsZSAoY3VycmVudC5wYXJlbnROb2RlKSB7XG4gICAgICBpZiAoaXNTY3JvbGxpbmcoY3VycmVudCkpIHtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnQ7XG4gICAgICB9XG5cbiAgICAgIGN1cnJlbnQgPSBjdXJyZW50LnBhcmVudE5vZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIGRvY3VtZW50LnNjcm9sbGluZ0VsZW1lbnQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICB9XG5cbiAgcmV0dXJuIHNjcm9sbFBhcmVudDtcbn0pKTsiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/scrollparent/scrollparent.js\n");

/***/ })

};
;