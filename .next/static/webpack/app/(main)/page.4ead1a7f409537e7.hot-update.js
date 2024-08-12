"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("app/(main)/page",{

/***/ "(app-pages-browser)/./app/(main)/page.tsx":
/*!*****************************!*\
  !*** ./app/(main)/page.tsx ***!
  \*****************************/
/***/ (function(module, __webpack_exports__, __webpack_require__) {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/jsx-dev-runtime.js\");\n/* harmony import */ var _contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/contexts/HeaderContext */ \"(app-pages-browser)/./contexts/HeaderContext.tsx\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/index.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _components_ui_card__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/ui/card */ \"(app-pages-browser)/./components/ui/card.tsx\");\n/* harmony import */ var next_navigation__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! next/navigation */ \"(app-pages-browser)/./node_modules/next/dist/api/navigation.js\");\n/* harmony import */ var _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @/contexts/AuthContext */ \"(app-pages-browser)/./contexts/AuthContext.tsx\");\n/* harmony import */ var posthog_js_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! posthog-js/react */ \"(app-pages-browser)/./node_modules/posthog-js/react/dist/esm/index.js\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! react-redux */ \"(app-pages-browser)/./node_modules/react-redux/dist/react-redux.mjs\");\n/* harmony import */ var _lib_state_branch_branch__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @/lib/state/branch/branch */ \"(app-pages-browser)/./lib/state/branch/branch.ts\");\n/* __next_internal_client_entry_do_not_use__ default auto */ \nvar _s = $RefreshSig$();\n\n\n\n\n\n\n\n\n\nconst MyProjects = ()=>{\n    _s();\n    const { user } = (0,_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__.useAuthContext)();\n    const { setHeaderTitle } = (0,_contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__.useHeader)();\n    const [endpointLists, setendpointLists] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)();\n    const dispatch = (0,react_redux__WEBPACK_IMPORTED_MODULE_8__.useDispatch)();\n    const { push } = (0,next_navigation__WEBPACK_IMPORTED_MODULE_4__.useRouter)();\n    const githubAppUrl = \"https://github.com/apps/\" + \"getmomentum-dev\" + \"/installations/select_target?setup_action=install\";\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        dispatch((0,_lib_state_branch_branch__WEBPACK_IMPORTED_MODULE_7__.setbranch)(\"\"));\n        setHeaderTitle(\"My Projects\");\n    });\n    const posthog = (0,posthog_js_react__WEBPACK_IMPORTED_MODULE_6__.usePostHog)();\n    const pathname = (0,next_navigation__WEBPACK_IMPORTED_MODULE_4__.usePathname)();\n    const searchParams = (0,next_navigation__WEBPACK_IMPORTED_MODULE_4__.useSearchParams)();\n    const popupRef = (0,react__WEBPACK_IMPORTED_MODULE_2__.useRef)(null);\n    const openPopup = ()=>{\n        posthog.capture(\"github login clicked\");\n        popupRef.current = window.open(githubAppUrl, \"_blank\", \"width=1000,height=700\");\n    };\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        if (user) {\n            // Identify the user in PostHog\n            posthog.identify(user.email, {\n                email: user.email,\n                name: user.displayName\n            });\n        }\n    }, [\n        user\n    ]);\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        if (pathname && posthog) {\n            let url = window.origin + pathname;\n            if (searchParams.toString()) {\n                url = url + \"?\".concat(searchParams.toString());\n            }\n            posthog.capture(\"$pageview\", {\n                $current_url: url,\n                $current_user: user\n            });\n        }\n    }, [\n        pathname,\n        searchParams,\n        posthog\n    ]);\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        /*\n    This method listens for messages from the opened window,\n    currently this is not doing anything but implement passing of install_id here\n    and reload repositories on home page\n    */ // sessionStorage.removeItem(\"project_info\");\n        const handleMessage = (event)=>{\n            if (event.origin !== window.location.origin) {\n                return;\n            }\n        };\n        window.addEventListener(\"message\", handleMessage);\n        return ()=>{\n            window.removeEventListener(\"message\", handleMessage);\n        };\n    }, []);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        className: \"flex flex-col mt-4 space-y-10 px-7\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"ml-2\",\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h1\", {\n                        className: \"text-primary font-bold text-2xl\",\n                        children: [\n                            \"Hey \",\n                            user.displayName,\n                            \"!\"\n                        ]\n                    }, void 0, true, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 107,\n                        columnNumber: 9\n                    }, undefined),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h2\", {\n                        className: \"text-primary text-xl mt-2\",\n                        children: \"This is sample landing page for hundredmarks.ai\"\n                    }, void 0, false, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 110,\n                        columnNumber: 9\n                    }, undefined)\n                ]\n            }, void 0, true, {\n                fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                lineNumber: 106,\n                columnNumber: 7\n            }, undefined),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"w-full -ml-4 h-full flex flex-wrap gap-10\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ui_card__WEBPACK_IMPORTED_MODULE_3__.Card, {\n                    onClick: ()=>openPopup(),\n                    className: \"scale-90 h-[14rem] bg-card cursor-pointer w-[23rem] border-2 grid place-items-center rounded-b-sm rounded-sm border-input\",\n                    children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"span\", {\n                        children: \"CLICK HERE TO TEST SAMPLE APP INSTALLATION\"\n                    }, void 0, false, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 119,\n                        columnNumber: 11\n                    }, undefined)\n                }, void 0, false, {\n                    fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                    lineNumber: 115,\n                    columnNumber: 9\n                }, undefined)\n            }, void 0, false, {\n                fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                lineNumber: 114,\n                columnNumber: 7\n            }, undefined)\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n        lineNumber: 105,\n        columnNumber: 5\n    }, undefined);\n};\n_s(MyProjects, \"HCHh6CLWkyvlYCb9v1Z1SJiFL0c=\", false, function() {\n    return [\n        _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__.useAuthContext,\n        _contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__.useHeader,\n        react_redux__WEBPACK_IMPORTED_MODULE_8__.useDispatch,\n        next_navigation__WEBPACK_IMPORTED_MODULE_4__.useRouter,\n        posthog_js_react__WEBPACK_IMPORTED_MODULE_6__.usePostHog,\n        next_navigation__WEBPACK_IMPORTED_MODULE_4__.usePathname,\n        next_navigation__WEBPACK_IMPORTED_MODULE_4__.useSearchParams\n    ];\n});\n_c = MyProjects;\n/* harmony default export */ __webpack_exports__[\"default\"] = (MyProjects);\nvar _c;\n$RefreshReg$(_c, \"MyProjects\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2FwcC8obWFpbikvcGFnZS50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUNxRDtBQUN1QjtBQUNQO0FBRXpCO0FBS21CO0FBWVA7QUFDVjtBQUVKO0FBQ1k7QUFFdEQsTUFBTWEsYUFBYTs7SUFDakIsTUFBTSxFQUFFQyxJQUFJLEVBQUUsR0FBR0wscUVBQWNBO0lBQy9CLE1BQU0sRUFBRU0sY0FBYyxFQUFFLEdBQUdmLGtFQUFTQTtJQUNwQyxNQUFNLENBQUNnQixlQUFlQyxpQkFBaUIsR0FBR2IsK0NBQVFBO0lBQ2xELE1BQU1jLFdBQVdQLHdEQUFXQTtJQUM1QixNQUFNLEVBQUVRLElBQUksRUFBRSxHQUFHYiwwREFBU0E7SUFDMUIsTUFBTWMsZUFDSiw2QkFDQUMsaUJBQXVDLEdBQ3ZDO0lBQ0ZuQixnREFBU0EsQ0FBQztRQUNSZ0IsU0FBU04sbUVBQVNBLENBQUM7UUFDbkJHLGVBQWU7SUFDakI7SUFNQSxNQUFNUyxVQUFVZCw0REFBVUE7SUFDMUIsTUFBTWUsV0FBV2xCLDREQUFXQTtJQUM1QixNQUFNbUIsZUFBZWxCLGdFQUFlQTtJQUVwQyxNQUFNbUIsV0FBV3hCLDZDQUFNQSxDQUFnQjtJQUN2QyxNQUFNeUIsWUFBWTtRQUNoQkosUUFBUUssT0FBTyxDQUFDO1FBQ2hCRixTQUFTRyxPQUFPLEdBQUdDLE9BQU9DLElBQUksQ0FDNUJaLGNBQ0EsVUFDQTtJQUVKO0lBRUFsQixnREFBU0EsQ0FBQztRQUNSLElBQUlZLE1BQU07WUFDUiwrQkFBK0I7WUFDL0JVLFFBQVFTLFFBQVEsQ0FBQ25CLEtBQUtvQixLQUFLLEVBQUU7Z0JBQzNCQSxPQUFPcEIsS0FBS29CLEtBQUs7Z0JBQ2pCQyxNQUFNckIsS0FBS3NCLFdBQVc7WUFFeEI7UUFDRjtJQUNGLEdBQUc7UUFBQ3RCO0tBQUs7SUFFVFosZ0RBQVNBLENBQUM7UUFDUixJQUFJdUIsWUFBWUQsU0FBUztZQUN2QixJQUFJYSxNQUFNTixPQUFPTyxNQUFNLEdBQUdiO1lBQzFCLElBQUlDLGFBQWFhLFFBQVEsSUFBSTtnQkFDM0JGLE1BQU1BLE1BQU0sSUFBNEIsT0FBeEJYLGFBQWFhLFFBQVE7WUFDdkM7WUFDQWYsUUFBUUssT0FBTyxDQUFDLGFBQWE7Z0JBQzNCVyxjQUFjSDtnQkFDZEksZUFBZTNCO1lBQ2pCO1FBQ0Y7SUFDRixHQUFHO1FBQUNXO1FBQVVDO1FBQWNGO0tBQVE7SUFFcEN0QixnREFBU0EsQ0FBQztRQUNSOzs7O0lBSUEsR0FDQSw2Q0FBNkM7UUFDN0MsTUFBTXdDLGdCQUFnQixDQUFDQztZQUNyQixJQUFJQSxNQUFNTCxNQUFNLEtBQUtQLE9BQU9hLFFBQVEsQ0FBQ04sTUFBTSxFQUFFO2dCQUMzQztZQUNGO1FBQ0Y7UUFDQVAsT0FBT2MsZ0JBQWdCLENBQUMsV0FBV0g7UUFDbkMsT0FBTztZQUNMWCxPQUFPZSxtQkFBbUIsQ0FBQyxXQUFXSjtRQUN4QztJQUNGLEdBQUcsRUFBRTtJQUVMLHFCQUNFLDhEQUFDSztRQUFJQyxXQUFVOzswQkFDYiw4REFBQ0Q7Z0JBQUlDLFdBQVU7O2tDQUNiLDhEQUFDQzt3QkFBR0QsV0FBVTs7NEJBQWtDOzRCQUN6Q2xDLEtBQUtzQixXQUFXOzRCQUFDOzs7Ozs7O2tDQUV4Qiw4REFBQ2M7d0JBQUdGLFdBQVU7a0NBQTRCOzs7Ozs7Ozs7Ozs7MEJBSTVDLDhEQUFDRDtnQkFBSUMsV0FBVTswQkFDYiw0RUFBQzNDLHFEQUFJQTtvQkFDSDhDLFNBQVMsSUFBTXZCO29CQUNmb0IsV0FBWTs4QkFFWiw0RUFBQ0k7a0NBQUs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFNaEI7R0FoR012Qzs7UUFDYUosaUVBQWNBO1FBQ0pULDhEQUFTQTtRQUVuQlcsb0RBQVdBO1FBQ1hMLHNEQUFTQTtRQWNWSSx3REFBVUE7UUFDVEgsd0RBQVdBO1FBQ1BDLDREQUFlQTs7O0tBckJoQ0s7QUFrR04sK0RBQWVBLFVBQVVBLEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vYXBwLyhtYWluKS9wYWdlLnRzeD9hMjc1Il0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIGNsaWVudFwiO1xuaW1wb3J0IHsgdXNlSGVhZGVyIH0gZnJvbSBcIkAvY29udGV4dHMvSGVhZGVyQ29udGV4dFwiO1xuaW1wb3J0IFJlYWN0LCB7IHVzZUVmZmVjdCwgdXNlTGF5b3V0RWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBDYXJkLCBDYXJkQ29udGVudCwgQ2FyZEZvb3RlciB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvY2FyZFwiO1xuaW1wb3J0IHsgU2tlbGV0b24gfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3NrZWxldG9uXCI7XG5pbXBvcnQgeyB1c2VSb3V0ZXIgfSBmcm9tIFwibmV4dC9uYXZpZ2F0aW9uXCI7XG5pbXBvcnQgeyB1c2VRdWVyeSB9IGZyb20gXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIjtcbmltcG9ydCBheGlvcyBmcm9tIFwiQC9hcHAvYXBpL2ludGVyY2VwdG9ycy9odHRwSW50ZXJjZXB0b3JcIjtcbmltcG9ydCBkYXlqcyBmcm9tIFwiZGF5anNcIjtcbmltcG9ydCBQcm9maWxlUGljdHVyZSBmcm9tIFwiQC9jb21wb25lbnRzL0xheW91dHMvbWlub3JzL1Byb2ZpbGVQaWN0dXJlXCI7XG5pbXBvcnQgeyB1c2VQYXRobmFtZSwgdXNlU2VhcmNoUGFyYW1zIH0gZnJvbSBcIm5leHQvbmF2aWdhdGlvblwiO1xuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9idXR0b25cIjtcbmltcG9ydCB7IFBsdXMsIFJvdGF0ZUN3LCBUcmlhbmdsZUFsZXJ0IH0gZnJvbSBcImx1Y2lkZS1yZWFjdFwiO1xuaW1wb3J0IHtcbiAgRGlhbG9nLFxuICBEaWFsb2dDb250ZW50LFxuICBEaWFsb2dEZXNjcmlwdGlvbixcbiAgRGlhbG9nRm9vdGVyLFxuICBEaWFsb2dIZWFkZXIsXG4gIERpYWxvZ1RpdGxlLFxuICBEaWFsb2dUcmlnZ2VyLFxufSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2RpYWxvZ1wiO1xuaW1wb3J0IHsgdXNlQXV0aENvbnRleHQgfSBmcm9tIFwiQC9jb250ZXh0cy9BdXRoQ29udGV4dFwiO1xuaW1wb3J0IHsgdXNlUG9zdEhvZyB9IGZyb20gXCJwb3N0aG9nLWpzL3JlYWN0XCI7XG5pbXBvcnQgeyB0b2FzdCB9IGZyb20gXCJzb25uZXJcIjtcbmltcG9ydCB7IHVzZURpc3BhdGNoIH0gZnJvbSBcInJlYWN0LXJlZHV4XCI7XG5pbXBvcnQgeyBzZXRicmFuY2ggfSBmcm9tIFwiQC9saWIvc3RhdGUvYnJhbmNoL2JyYW5jaFwiO1xuXG5jb25zdCBNeVByb2plY3RzID0gKCkgPT4ge1xuICBjb25zdCB7IHVzZXIgfSA9IHVzZUF1dGhDb250ZXh0KCk7XG4gIGNvbnN0IHsgc2V0SGVhZGVyVGl0bGUgfSA9IHVzZUhlYWRlcigpO1xuICBjb25zdCBbZW5kcG9pbnRMaXN0cywgc2V0ZW5kcG9pbnRMaXN0c10gPSB1c2VTdGF0ZTxhbnk+KCk7XG4gIGNvbnN0IGRpc3BhdGNoID0gdXNlRGlzcGF0Y2goKTtcbiAgY29uc3QgeyBwdXNoIH0gPSB1c2VSb3V0ZXIoKTtcbiAgY29uc3QgZ2l0aHViQXBwVXJsID1cbiAgICBcImh0dHBzOi8vZ2l0aHViLmNvbS9hcHBzL1wiICtcbiAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19HSVRIVUJfQVBQX05BTUUgK1xuICAgIFwiL2luc3RhbGxhdGlvbnMvc2VsZWN0X3RhcmdldD9zZXR1cF9hY3Rpb249aW5zdGFsbFwiO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGRpc3BhdGNoKHNldGJyYW5jaChcIlwiKSk7XG4gICAgc2V0SGVhZGVyVGl0bGUoXCJNeSBQcm9qZWN0c1wiKTtcbiAgfSk7XG4gIGludGVyZmFjZSBFbmRwb2ludCB7XG4gICAgaWRlbnRpZmllcjogc3RyaW5nO1xuICAgIGVudHJ5UG9pbnQ6IHN0cmluZztcbiAgfVxuICBcbiAgY29uc3QgcG9zdGhvZyA9IHVzZVBvc3RIb2coKTtcbiAgY29uc3QgcGF0aG5hbWUgPSB1c2VQYXRobmFtZSgpO1xuICBjb25zdCBzZWFyY2hQYXJhbXMgPSB1c2VTZWFyY2hQYXJhbXMoKTtcblxuICBjb25zdCBwb3B1cFJlZiA9IHVzZVJlZjxXaW5kb3cgfCBudWxsPihudWxsKTtcbiAgY29uc3Qgb3BlblBvcHVwID0gKCkgPT4ge1xuICAgIHBvc3Rob2cuY2FwdHVyZShcImdpdGh1YiBsb2dpbiBjbGlja2VkXCIpO1xuICAgIHBvcHVwUmVmLmN1cnJlbnQgPSB3aW5kb3cub3BlbihcbiAgICAgIGdpdGh1YkFwcFVybCxcbiAgICAgIFwiX2JsYW5rXCIsXG4gICAgICBcIndpZHRoPTEwMDAsaGVpZ2h0PTcwMFwiXG4gICAgKTtcbiAgfTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICh1c2VyKSB7XG4gICAgICAvLyBJZGVudGlmeSB0aGUgdXNlciBpbiBQb3N0SG9nXG4gICAgICBwb3N0aG9nLmlkZW50aWZ5KHVzZXIuZW1haWwsIHtcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXG4gICAgICAgIG5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXG4gICAgICAgIC8vIFRPRE86IEFkZGl0aW9uYWwgdXNlciBwcm9wZXJ0aWVzIGNhbiBiZSBzZXQgaGVyZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCBbdXNlcl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHBhdGhuYW1lICYmIHBvc3Rob2cpIHtcbiAgICAgIGxldCB1cmwgPSB3aW5kb3cub3JpZ2luICsgcGF0aG5hbWU7XG4gICAgICBpZiAoc2VhcmNoUGFyYW1zLnRvU3RyaW5nKCkpIHtcbiAgICAgICAgdXJsID0gdXJsICsgYD8ke3NlYXJjaFBhcmFtcy50b1N0cmluZygpfWA7XG4gICAgICB9XG4gICAgICBwb3N0aG9nLmNhcHR1cmUoXCIkcGFnZXZpZXdcIiwge1xuICAgICAgICAkY3VycmVudF91cmw6IHVybCxcbiAgICAgICAgJGN1cnJlbnRfdXNlcjogdXNlcixcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwgW3BhdGhuYW1lLCBzZWFyY2hQYXJhbXMsIHBvc3Rob2ddKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIC8qXG4gICAgVGhpcyBtZXRob2QgbGlzdGVucyBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgb3BlbmVkIHdpbmRvdyxcbiAgICBjdXJyZW50bHkgdGhpcyBpcyBub3QgZG9pbmcgYW55dGhpbmcgYnV0IGltcGxlbWVudCBwYXNzaW5nIG9mIGluc3RhbGxfaWQgaGVyZVxuICAgIGFuZCByZWxvYWQgcmVwb3NpdG9yaWVzIG9uIGhvbWUgcGFnZVxuICAgICovXG4gICAgLy8gc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShcInByb2plY3RfaW5mb1wiKTtcbiAgICBjb25zdCBoYW5kbGVNZXNzYWdlID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC5vcmlnaW4gIT09IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGhhbmRsZU1lc3NhZ2UpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgaGFuZGxlTWVzc2FnZSk7XG4gICAgfTtcbiAgfSwgW10pO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIG10LTQgc3BhY2UteS0xMCBweC03XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1sLTJcIj5cbiAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeSBmb250LWJvbGQgdGV4dC0yeGxcIj5cbiAgICAgICAgICBIZXkge3VzZXIuZGlzcGxheU5hbWV9IVxuICAgICAgICA8L2gxPlxuICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5IHRleHQteGwgbXQtMlwiPlxuICAgICAgICAgIFRoaXMgaXMgc2FtcGxlIGxhbmRpbmcgcGFnZSBmb3IgaHVuZHJlZG1hcmtzLmFpXG4gICAgICAgIDwvaDI+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIC1tbC00IGgtZnVsbCBmbGV4IGZsZXgtd3JhcCBnYXAtMTBcIj5cbiAgICAgICAgPENhcmRcbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvcGVuUG9wdXAoKX1cbiAgICAgICAgICBjbGFzc05hbWU9e2BzY2FsZS05MCBoLVsxNHJlbV0gYmctY2FyZCBjdXJzb3ItcG9pbnRlciB3LVsyM3JlbV0gYm9yZGVyLTIgZ3JpZCBwbGFjZS1pdGVtcy1jZW50ZXIgcm91bmRlZC1iLXNtIHJvdW5kZWQtc20gYm9yZGVyLWlucHV0YH1cbiAgICAgICAgPlxuICAgICAgICAgIDxzcGFuPkNMSUNLIEhFUkUgVE8gVEVTVCBTQU1QTEUgQVBQIElOU1RBTExBVElPTjwvc3Bhbj5cbiAgICAgICAgPC9DYXJkPlxuXG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IE15UHJvamVjdHM7XG4iXSwibmFtZXMiOlsidXNlSGVhZGVyIiwiUmVhY3QiLCJ1c2VFZmZlY3QiLCJ1c2VSZWYiLCJ1c2VTdGF0ZSIsIkNhcmQiLCJ1c2VSb3V0ZXIiLCJ1c2VQYXRobmFtZSIsInVzZVNlYXJjaFBhcmFtcyIsInVzZUF1dGhDb250ZXh0IiwidXNlUG9zdEhvZyIsInVzZURpc3BhdGNoIiwic2V0YnJhbmNoIiwiTXlQcm9qZWN0cyIsInVzZXIiLCJzZXRIZWFkZXJUaXRsZSIsImVuZHBvaW50TGlzdHMiLCJzZXRlbmRwb2ludExpc3RzIiwiZGlzcGF0Y2giLCJwdXNoIiwiZ2l0aHViQXBwVXJsIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX0dJVEhVQl9BUFBfTkFNRSIsInBvc3Rob2ciLCJwYXRobmFtZSIsInNlYXJjaFBhcmFtcyIsInBvcHVwUmVmIiwib3BlblBvcHVwIiwiY2FwdHVyZSIsImN1cnJlbnQiLCJ3aW5kb3ciLCJvcGVuIiwiaWRlbnRpZnkiLCJlbWFpbCIsIm5hbWUiLCJkaXNwbGF5TmFtZSIsInVybCIsIm9yaWdpbiIsInRvU3RyaW5nIiwiJGN1cnJlbnRfdXJsIiwiJGN1cnJlbnRfdXNlciIsImhhbmRsZU1lc3NhZ2UiLCJldmVudCIsImxvY2F0aW9uIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJkaXYiLCJjbGFzc05hbWUiLCJoMSIsImgyIiwib25DbGljayIsInNwYW4iXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./app/(main)/page.tsx\n"));

/***/ })

});