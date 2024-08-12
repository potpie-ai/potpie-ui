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

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/jsx-dev-runtime.js\");\n/* harmony import */ var _contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/contexts/HeaderContext */ \"(app-pages-browser)/./contexts/HeaderContext.tsx\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/index.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _components_ui_card__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/ui/card */ \"(app-pages-browser)/./components/ui/card.tsx\");\n/* harmony import */ var next_navigation__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! next/navigation */ \"(app-pages-browser)/./node_modules/next/dist/api/navigation.js\");\n/* harmony import */ var _barrel_optimize_names_Plus_lucide_react__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! __barrel_optimize__?names=Plus!=!lucide-react */ \"(app-pages-browser)/./node_modules/lucide-react/dist/esm/icons/plus.js\");\n/* harmony import */ var _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @/contexts/AuthContext */ \"(app-pages-browser)/./contexts/AuthContext.tsx\");\n/* harmony import */ var posthog_js_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! posthog-js/react */ \"(app-pages-browser)/./node_modules/posthog-js/react/dist/esm/index.js\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! react-redux */ \"(app-pages-browser)/./node_modules/react-redux/dist/react-redux.mjs\");\n/* harmony import */ var _lib_state_branch_branch__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @/lib/state/branch/branch */ \"(app-pages-browser)/./lib/state/branch/branch.ts\");\n/* __next_internal_client_entry_do_not_use__ default auto */ \nvar _s = $RefreshSig$();\n\n\n\n\n\n\n\n\n\nconst MyProjects = ()=>{\n    _s();\n    const { user } = (0,_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__.useAuthContext)();\n    const { setHeaderTitle } = (0,_contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__.useHeader)();\n    const dispatch = (0,react_redux__WEBPACK_IMPORTED_MODULE_8__.useDispatch)();\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        dispatch((0,_lib_state_branch_branch__WEBPACK_IMPORTED_MODULE_7__.setbranch)(\"\"));\n        setHeaderTitle(\"My Projects\");\n    });\n    const posthog = (0,posthog_js_react__WEBPACK_IMPORTED_MODULE_6__.usePostHog)();\n    const pathname = (0,next_navigation__WEBPACK_IMPORTED_MODULE_4__.usePathname)();\n    const searchParams = (0,next_navigation__WEBPACK_IMPORTED_MODULE_4__.useSearchParams)();\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        if (user) {\n            // Identify the user in PostHog\n            posthog.identify(user.email, {\n                email: user.email,\n                name: user.displayName\n            });\n        }\n    }, [\n        user\n    ]);\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        if (pathname && posthog) {\n            let url = window.origin + pathname;\n            if (searchParams.toString()) {\n                url = url + \"?\".concat(searchParams.toString());\n            }\n            posthog.capture(\"$pageview\", {\n                $current_url: url,\n                $current_user: user\n            });\n        }\n    }, [\n        pathname,\n        searchParams,\n        posthog\n    ]);\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        /*\n    This method listens for messages from the opened window,\n    currently this is not doing anything but implement passing of install_id here\n    and reload repositories on home page\n    */ // sessionStorage.removeItem(\"project_info\");\n        const handleMessage = (event)=>{\n            if (event.origin !== window.location.origin) {\n                return;\n            }\n        };\n        window.addEventListener(\"message\", handleMessage);\n        return ()=>{\n            window.removeEventListener(\"message\", handleMessage);\n        };\n    }, []);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        className: \"flex flex-col mt-4 space-y-10 px-7\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"ml-2\",\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h1\", {\n                        className: \"text-primary font-bold text-2xl\",\n                        children: [\n                            \"Hey \",\n                            user.displayName,\n                            \"!\"\n                        ]\n                    }, void 0, true, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 88,\n                        columnNumber: 9\n                    }, undefined),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h2\", {\n                        className: \"text-primary text-xl mt-2\",\n                        children: \"Get started by adding or selecting the repository you want to work on\"\n                    }, void 0, false, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 91,\n                        columnNumber: 9\n                    }, undefined)\n                ]\n            }, void 0, true, {\n                fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                lineNumber: 87,\n                columnNumber: 7\n            }, undefined),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"w-full -ml-4 h-full flex flex-wrap gap-10\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ui_card__WEBPACK_IMPORTED_MODULE_3__.Card, {\n                    onClick: ()=>openPopup(),\n                    className: \"scale-90 h-[14rem] bg-card cursor-pointer w-[23rem] border-2 grid place-items-center rounded-b-sm rounded-sm border-input\",\n                    children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ui_card__WEBPACK_IMPORTED_MODULE_3__.CardContent, {\n                        className: \"w-full h-full m-0 grid place-items-center bg-card\",\n                        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_Plus_lucide_react__WEBPACK_IMPORTED_MODULE_9__[\"default\"], {\n                            className: \"w-24 h-24 text-input\"\n                        }, void 0, false, {\n                            fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                            lineNumber: 101,\n                            columnNumber: 13\n                        }, undefined)\n                    }, void 0, false, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 100,\n                        columnNumber: 11\n                    }, undefined)\n                }, void 0, false, {\n                    fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                    lineNumber: 96,\n                    columnNumber: 9\n                }, undefined)\n            }, void 0, false, {\n                fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                lineNumber: 95,\n                columnNumber: 7\n            }, undefined)\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n        lineNumber: 86,\n        columnNumber: 5\n    }, undefined);\n};\n_s(MyProjects, \"cbKMlkkg3E0n4Nelj4pPwf8f/EI=\", false, function() {\n    return [\n        _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__.useAuthContext,\n        _contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__.useHeader,\n        react_redux__WEBPACK_IMPORTED_MODULE_8__.useDispatch,\n        posthog_js_react__WEBPACK_IMPORTED_MODULE_6__.usePostHog,\n        next_navigation__WEBPACK_IMPORTED_MODULE_4__.usePathname,\n        next_navigation__WEBPACK_IMPORTED_MODULE_4__.useSearchParams\n    ];\n});\n_c = MyProjects;\n/* harmony default export */ __webpack_exports__[\"default\"] = (MyProjects);\nvar _c;\n$RefreshReg$(_c, \"MyProjects\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2FwcC8obWFpbikvcGFnZS50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDcUQ7QUFDdUI7QUFDUDtBQU9OO0FBRUY7QUFVTDtBQUNWO0FBRUo7QUFDWTtBQUV0RCxNQUFNWSxhQUFhOztJQUNqQixNQUFNLEVBQUVDLElBQUksRUFBRSxHQUFHTCxxRUFBY0E7SUFDL0IsTUFBTSxFQUFFTSxjQUFjLEVBQUUsR0FBR2Qsa0VBQVNBO0lBQ3BDLE1BQU1lLFdBQVdMLHdEQUFXQTtJQUU1QlIsZ0RBQVNBLENBQUM7UUFDUmEsU0FBU0osbUVBQVNBLENBQUM7UUFDbkJHLGVBQWU7SUFDakI7SUFFQSxNQUFNRSxVQUFVUCw0REFBVUE7SUFDMUIsTUFBTVEsV0FBV1osNERBQVdBO0lBQzVCLE1BQU1hLGVBQWVaLGdFQUFlQTtJQUVwQ0osZ0RBQVNBLENBQUM7UUFDUixJQUFJVyxNQUFNO1lBQ1IsK0JBQStCO1lBQy9CRyxRQUFRRyxRQUFRLENBQUNOLEtBQUtPLEtBQUssRUFBRTtnQkFDM0JBLE9BQU9QLEtBQUtPLEtBQUs7Z0JBQ2pCQyxNQUFNUixLQUFLUyxXQUFXO1lBRXhCO1FBQ0Y7SUFDRixHQUFHO1FBQUNUO0tBQUs7SUFFVFgsZ0RBQVNBLENBQUM7UUFDUixJQUFJZSxZQUFZRCxTQUFTO1lBQ3ZCLElBQUlPLE1BQU1DLE9BQU9DLE1BQU0sR0FBR1I7WUFDMUIsSUFBSUMsYUFBYVEsUUFBUSxJQUFJO2dCQUMzQkgsTUFBTUEsTUFBTSxJQUE0QixPQUF4QkwsYUFBYVEsUUFBUTtZQUN2QztZQUNBVixRQUFRVyxPQUFPLENBQUMsYUFBYTtnQkFDM0JDLGNBQWNMO2dCQUNkTSxlQUFlaEI7WUFDakI7UUFDRjtJQUNGLEdBQUc7UUFBQ0k7UUFBVUM7UUFBY0Y7S0FBUTtJQUVwQ2QsZ0RBQVNBLENBQUM7UUFDUjs7OztJQUlBLEdBQ0EsNkNBQTZDO1FBQzdDLE1BQU00QixnQkFBZ0IsQ0FBQ0M7WUFDckIsSUFBSUEsTUFBTU4sTUFBTSxLQUFLRCxPQUFPUSxRQUFRLENBQUNQLE1BQU0sRUFBRTtnQkFDM0M7WUFDRjtRQUNGO1FBQ0FELE9BQU9TLGdCQUFnQixDQUFDLFdBQVdIO1FBQ25DLE9BQU87WUFDTE4sT0FBT1UsbUJBQW1CLENBQUMsV0FBV0o7UUFDeEM7SUFDRixHQUFHLEVBQUU7SUFFTCxxQkFDRSw4REFBQ0s7UUFBSUMsV0FBVTs7MEJBQ2IsOERBQUNEO2dCQUFJQyxXQUFVOztrQ0FDYiw4REFBQ0M7d0JBQUdELFdBQVU7OzRCQUFrQzs0QkFDekN2QixLQUFLUyxXQUFXOzRCQUFDOzs7Ozs7O2tDQUV4Qiw4REFBQ2dCO3dCQUFHRixXQUFVO2tDQUE0Qjs7Ozs7Ozs7Ozs7OzBCQUk1Qyw4REFBQ0Q7Z0JBQUlDLFdBQVU7MEJBQ2IsNEVBQUNqQyxxREFBSUE7b0JBQ0hvQyxTQUFTLElBQU1DO29CQUNmSixXQUFZOzhCQUVaLDRFQUFDaEMsNERBQVdBO3dCQUFDZ0MsV0FBVTtrQ0FDckIsNEVBQUM3QixnRkFBSUE7NEJBQUM2QixXQUFVOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFPNUI7R0EvRU14Qjs7UUFDYUosaUVBQWNBO1FBQ0pSLDhEQUFTQTtRQUNuQlUsb0RBQVdBO1FBT1pELHdEQUFVQTtRQUNUSix3REFBV0E7UUFDUEMsNERBQWVBOzs7S0FaaENNO0FBaUZOLCtEQUFlQSxVQUFVQSxFQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vX05fRS8uL2FwcC8obWFpbikvcGFnZS50c3g/YTI3NSJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBjbGllbnRcIjtcbmltcG9ydCB7IHVzZUhlYWRlciB9IGZyb20gXCJAL2NvbnRleHRzL0hlYWRlckNvbnRleHRcIjtcbmltcG9ydCBSZWFjdCwgeyB1c2VFZmZlY3QsIHVzZUxheW91dEVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgQ2FyZCwgQ2FyZENvbnRlbnQsIENhcmRGb290ZXIgfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2NhcmRcIjtcbmltcG9ydCB7IFNrZWxldG9uIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9za2VsZXRvblwiO1xuaW1wb3J0IHsgdXNlUm91dGVyIH0gZnJvbSBcIm5leHQvbmF2aWdhdGlvblwiO1xuaW1wb3J0IHsgdXNlUXVlcnkgfSBmcm9tIFwiQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5XCI7XG5pbXBvcnQgYXhpb3MgZnJvbSBcIkAvYXBwL2FwaS9pbnRlcmNlcHRvcnMvaHR0cEludGVyY2VwdG9yXCI7XG5pbXBvcnQgZGF5anMgZnJvbSBcImRheWpzXCI7XG5pbXBvcnQgUHJvZmlsZVBpY3R1cmUgZnJvbSBcIkAvY29tcG9uZW50cy9MYXlvdXRzL21pbm9ycy9Qcm9maWxlUGljdHVyZVwiO1xuaW1wb3J0IHsgdXNlUGF0aG5hbWUsIHVzZVNlYXJjaFBhcmFtcyB9IGZyb20gXCJuZXh0L25hdmlnYXRpb25cIjtcbmltcG9ydCB7IEJ1dHRvbiB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvYnV0dG9uXCI7XG5pbXBvcnQgeyBQbHVzLCBSb3RhdGVDdywgVHJpYW5nbGVBbGVydCB9IGZyb20gXCJsdWNpZGUtcmVhY3RcIjtcbmltcG9ydCB7XG4gIERpYWxvZyxcbiAgRGlhbG9nQ29udGVudCxcbiAgRGlhbG9nRGVzY3JpcHRpb24sXG4gIERpYWxvZ0Zvb3RlcixcbiAgRGlhbG9nSGVhZGVyLFxuICBEaWFsb2dUaXRsZSxcbiAgRGlhbG9nVHJpZ2dlcixcbn0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9kaWFsb2dcIjtcbmltcG9ydCB7IHVzZUF1dGhDb250ZXh0IH0gZnJvbSBcIkAvY29udGV4dHMvQXV0aENvbnRleHRcIjtcbmltcG9ydCB7IHVzZVBvc3RIb2cgfSBmcm9tIFwicG9zdGhvZy1qcy9yZWFjdFwiO1xuaW1wb3J0IHsgdG9hc3QgfSBmcm9tIFwic29ubmVyXCI7XG5pbXBvcnQgeyB1c2VEaXNwYXRjaCB9IGZyb20gXCJyZWFjdC1yZWR1eFwiO1xuaW1wb3J0IHsgc2V0YnJhbmNoIH0gZnJvbSBcIkAvbGliL3N0YXRlL2JyYW5jaC9icmFuY2hcIjtcblxuY29uc3QgTXlQcm9qZWN0cyA9ICgpID0+IHtcbiAgY29uc3QgeyB1c2VyIH0gPSB1c2VBdXRoQ29udGV4dCgpO1xuICBjb25zdCB7IHNldEhlYWRlclRpdGxlIH0gPSB1c2VIZWFkZXIoKTtcbiAgY29uc3QgZGlzcGF0Y2ggPSB1c2VEaXNwYXRjaCgpO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgZGlzcGF0Y2goc2V0YnJhbmNoKFwiXCIpKTtcbiAgICBzZXRIZWFkZXJUaXRsZShcIk15IFByb2plY3RzXCIpO1xuICB9KTtcblxuICBjb25zdCBwb3N0aG9nID0gdXNlUG9zdEhvZygpO1xuICBjb25zdCBwYXRobmFtZSA9IHVzZVBhdGhuYW1lKCk7XG4gIGNvbnN0IHNlYXJjaFBhcmFtcyA9IHVzZVNlYXJjaFBhcmFtcygpO1xuICBcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAodXNlcikge1xuICAgICAgLy8gSWRlbnRpZnkgdGhlIHVzZXIgaW4gUG9zdEhvZ1xuICAgICAgcG9zdGhvZy5pZGVudGlmeSh1c2VyLmVtYWlsLCB7XG4gICAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxuICAgICAgICBuYW1lOiB1c2VyLmRpc3BsYXlOYW1lLFxuICAgICAgICAvLyBUT0RPOiBBZGRpdGlvbmFsIHVzZXIgcHJvcGVydGllcyBjYW4gYmUgc2V0IGhlcmVcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwgW3VzZXJdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChwYXRobmFtZSAmJiBwb3N0aG9nKSB7XG4gICAgICBsZXQgdXJsID0gd2luZG93Lm9yaWdpbiArIHBhdGhuYW1lO1xuICAgICAgaWYgKHNlYXJjaFBhcmFtcy50b1N0cmluZygpKSB7XG4gICAgICAgIHVybCA9IHVybCArIGA/JHtzZWFyY2hQYXJhbXMudG9TdHJpbmcoKX1gO1xuICAgICAgfVxuICAgICAgcG9zdGhvZy5jYXB0dXJlKFwiJHBhZ2V2aWV3XCIsIHtcbiAgICAgICAgJGN1cnJlbnRfdXJsOiB1cmwsXG4gICAgICAgICRjdXJyZW50X3VzZXI6IHVzZXIsXG4gICAgICB9KTtcbiAgICB9XG4gIH0sIFtwYXRobmFtZSwgc2VhcmNoUGFyYW1zLCBwb3N0aG9nXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICAvKlxuICAgIFRoaXMgbWV0aG9kIGxpc3RlbnMgZm9yIG1lc3NhZ2VzIGZyb20gdGhlIG9wZW5lZCB3aW5kb3csXG4gICAgY3VycmVudGx5IHRoaXMgaXMgbm90IGRvaW5nIGFueXRoaW5nIGJ1dCBpbXBsZW1lbnQgcGFzc2luZyBvZiBpbnN0YWxsX2lkIGhlcmVcbiAgICBhbmQgcmVsb2FkIHJlcG9zaXRvcmllcyBvbiBob21lIHBhZ2VcbiAgICAqL1xuICAgIC8vIHNlc3Npb25TdG9yYWdlLnJlbW92ZUl0ZW0oXCJwcm9qZWN0X2luZm9cIik7XG4gICAgY29uc3QgaGFuZGxlTWVzc2FnZSA9IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB7XG4gICAgICBpZiAoZXZlbnQub3JpZ2luICE9PSB3aW5kb3cubG9jYXRpb24ub3JpZ2luKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBoYW5kbGVNZXNzYWdlKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGhhbmRsZU1lc3NhZ2UpO1xuICAgIH07XG4gIH0sIFtdKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBtdC00IHNwYWNlLXktMTAgcHgtN1wiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJtbC0yXCI+XG4gICAgICAgIDxoMSBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnkgZm9udC1ib2xkIHRleHQtMnhsXCI+XG4gICAgICAgICAgSGV5IHt1c2VyLmRpc3BsYXlOYW1lfSFcbiAgICAgICAgPC9oMT5cbiAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeSB0ZXh0LXhsIG10LTJcIj5cbiAgICAgICAgICBHZXQgc3RhcnRlZCBieSBhZGRpbmcgb3Igc2VsZWN0aW5nIHRoZSByZXBvc2l0b3J5IHlvdSB3YW50IHRvIHdvcmsgb25cbiAgICAgICAgPC9oMj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgLW1sLTQgaC1mdWxsIGZsZXggZmxleC13cmFwIGdhcC0xMFwiPlxuICAgICAgICA8Q2FyZFxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG9wZW5Qb3B1cCgpfVxuICAgICAgICAgIGNsYXNzTmFtZT17YHNjYWxlLTkwIGgtWzE0cmVtXSBiZy1jYXJkIGN1cnNvci1wb2ludGVyIHctWzIzcmVtXSBib3JkZXItMiBncmlkIHBsYWNlLWl0ZW1zLWNlbnRlciByb3VuZGVkLWItc20gcm91bmRlZC1zbSBib3JkZXItaW5wdXRgfVxuICAgICAgICA+XG4gICAgICAgICAgPENhcmRDb250ZW50IGNsYXNzTmFtZT1cInctZnVsbCBoLWZ1bGwgbS0wIGdyaWQgcGxhY2UtaXRlbXMtY2VudGVyIGJnLWNhcmRcIj5cbiAgICAgICAgICAgIDxQbHVzIGNsYXNzTmFtZT1cInctMjQgaC0yNCB0ZXh0LWlucHV0XCIgLz5cbiAgICAgICAgICA8L0NhcmRDb250ZW50PlxuICAgICAgICA8L0NhcmQ+XG5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgTXlQcm9qZWN0cztcbiJdLCJuYW1lcyI6WyJ1c2VIZWFkZXIiLCJSZWFjdCIsInVzZUVmZmVjdCIsIkNhcmQiLCJDYXJkQ29udGVudCIsInVzZVBhdGhuYW1lIiwidXNlU2VhcmNoUGFyYW1zIiwiUGx1cyIsInVzZUF1dGhDb250ZXh0IiwidXNlUG9zdEhvZyIsInVzZURpc3BhdGNoIiwic2V0YnJhbmNoIiwiTXlQcm9qZWN0cyIsInVzZXIiLCJzZXRIZWFkZXJUaXRsZSIsImRpc3BhdGNoIiwicG9zdGhvZyIsInBhdGhuYW1lIiwic2VhcmNoUGFyYW1zIiwiaWRlbnRpZnkiLCJlbWFpbCIsIm5hbWUiLCJkaXNwbGF5TmFtZSIsInVybCIsIndpbmRvdyIsIm9yaWdpbiIsInRvU3RyaW5nIiwiY2FwdHVyZSIsIiRjdXJyZW50X3VybCIsIiRjdXJyZW50X3VzZXIiLCJoYW5kbGVNZXNzYWdlIiwiZXZlbnQiLCJsb2NhdGlvbiIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiZGl2IiwiY2xhc3NOYW1lIiwiaDEiLCJoMiIsIm9uQ2xpY2siLCJvcGVuUG9wdXAiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(app-pages-browser)/./app/(main)/page.tsx\n"));

/***/ })

});