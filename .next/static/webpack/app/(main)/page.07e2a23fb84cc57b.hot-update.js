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

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/jsx-dev-runtime.js\");\n/* harmony import */ var _contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/contexts/HeaderContext */ \"(app-pages-browser)/./contexts/HeaderContext.tsx\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react */ \"(app-pages-browser)/./node_modules/next/dist/compiled/react/index.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _components_ui_card__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/components/ui/card */ \"(app-pages-browser)/./components/ui/card.tsx\");\n/* harmony import */ var next_navigation__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! next/navigation */ \"(app-pages-browser)/./node_modules/next/dist/api/navigation.js\");\n/* harmony import */ var _barrel_optimize_names_Plus_lucide_react__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! __barrel_optimize__?names=Plus!=!lucide-react */ \"(app-pages-browser)/./node_modules/lucide-react/dist/esm/icons/plus.js\");\n/* harmony import */ var _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @/contexts/AuthContext */ \"(app-pages-browser)/./contexts/AuthContext.tsx\");\n/* harmony import */ var posthog_js_react__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! posthog-js/react */ \"(app-pages-browser)/./node_modules/posthog-js/react/dist/esm/index.js\");\n/* harmony import */ var react_redux__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! react-redux */ \"(app-pages-browser)/./node_modules/react-redux/dist/react-redux.mjs\");\n/* harmony import */ var _lib_state_branch_branch__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @/lib/state/branch/branch */ \"(app-pages-browser)/./lib/state/branch/branch.ts\");\n/* __next_internal_client_entry_do_not_use__ default auto */ \nvar _s = $RefreshSig$();\n\n\n\n\n\n\n\n\n\n\nconst MyProjects = ()=>{\n    _s();\n    const { user } = (0,_contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__.useAuthContext)();\n    const { setHeaderTitle } = (0,_contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__.useHeader)();\n    const [endpointLists, setendpointLists] = (0,react__WEBPACK_IMPORTED_MODULE_2__.useState)();\n    const dispatch = (0,react_redux__WEBPACK_IMPORTED_MODULE_8__.useDispatch)();\n    const { push } = (0,next_navigation__WEBPACK_IMPORTED_MODULE_4__.useRouter)();\n    const githubAppUrl = \"https://github.com/apps/\" + \"getmomentum-dev\" + \"/installations/select_target?setup_action=install\";\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        dispatch((0,_lib_state_branch_branch__WEBPACK_IMPORTED_MODULE_7__.setbranch)(\"\"));\n        setHeaderTitle(\"My Projects\");\n    });\n    const posthog = (0,posthog_js_react__WEBPACK_IMPORTED_MODULE_6__.usePostHog)();\n    const pathname = (0,next_navigation__WEBPACK_IMPORTED_MODULE_4__.usePathname)();\n    const searchParams = (0,next_navigation__WEBPACK_IMPORTED_MODULE_4__.useSearchParams)();\n    const popupRef = (0,react__WEBPACK_IMPORTED_MODULE_2__.useRef)(null);\n    const openPopup = ()=>{\n        posthog.capture(\"github login clicked\");\n        popupRef.current = window.open(githubAppUrl, \"_blank\", \"width=1000,height=700\");\n    };\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        if (user) {\n            // Identify the user in PostHog\n            posthog.identify(user.email, {\n                email: user.email,\n                name: user.displayName\n            });\n        }\n    }, [\n        user\n    ]);\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        if (pathname && posthog) {\n            let url = window.origin + pathname;\n            if (searchParams.toString()) {\n                url = url + \"?\".concat(searchParams.toString());\n            }\n            posthog.capture(\"$pageview\", {\n                $current_url: url,\n                $current_user: user\n            });\n        }\n    }, [\n        pathname,\n        searchParams,\n        posthog\n    ]);\n    (0,react__WEBPACK_IMPORTED_MODULE_2__.useEffect)(()=>{\n        /*\n    This method listens for messages from the opened window,\n    currently this is not doing anything but implement passing of install_id here\n    and reload repositories on home page\n    */ // sessionStorage.removeItem(\"project_info\");\n        const handleMessage = (event)=>{\n            if (event.origin !== window.location.origin) {\n                return;\n            }\n        };\n        window.addEventListener(\"message\", handleMessage);\n        return ()=>{\n            window.removeEventListener(\"message\", handleMessage);\n        };\n    }, []);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        className: \"flex flex-col mt-4 space-y-10 px-7\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"ml-2\",\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h1\", {\n                        className: \"text-primary font-bold text-2xl\",\n                        children: [\n                            \"Hey \",\n                            user.displayName,\n                            \"!\"\n                        ]\n                    }, void 0, true, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 107,\n                        columnNumber: 9\n                    }, undefined),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h2\", {\n                        className: \"text-primary text-xl mt-2\",\n                        children: \"This is sample landing page for hundredmarks.ai\"\n                    }, void 0, false, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 110,\n                        columnNumber: 9\n                    }, undefined)\n                ]\n            }, void 0, true, {\n                fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                lineNumber: 106,\n                columnNumber: 7\n            }, undefined),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"w-full -ml-4 h-full flex flex-wrap gap-10\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ui_card__WEBPACK_IMPORTED_MODULE_3__.Card, {\n                    onClick: ()=>openPopup(),\n                    className: \"scale-90 h-[14rem] bg-card cursor-pointer w-[23rem] border-2 grid place-items-center rounded-b-sm rounded-sm border-input\",\n                    children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ui_card__WEBPACK_IMPORTED_MODULE_3__.CardContent, {\n                        className: \"w-full h-full m-0 grid place-items-center bg-card\",\n                        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_Plus_lucide_react__WEBPACK_IMPORTED_MODULE_9__[\"default\"], {\n                            className: \"w-24 h-24 text-input\"\n                        }, void 0, false, {\n                            fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                            lineNumber: 120,\n                            columnNumber: 13\n                        }, undefined)\n                    }, void 0, false, {\n                        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                        lineNumber: 119,\n                        columnNumber: 11\n                    }, undefined)\n                }, void 0, false, {\n                    fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                    lineNumber: 115,\n                    columnNumber: 9\n                }, undefined)\n            }, void 0, false, {\n                fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n                lineNumber: 114,\n                columnNumber: 7\n            }, undefined)\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/shubhamsingh/Desktop/code/momentum/hunderdmarks-ui/app/(main)/page.tsx\",\n        lineNumber: 105,\n        columnNumber: 5\n    }, undefined);\n};\n_s(MyProjects, \"HCHh6CLWkyvlYCb9v1Z1SJiFL0c=\", false, function() {\n    return [\n        _contexts_AuthContext__WEBPACK_IMPORTED_MODULE_5__.useAuthContext,\n        _contexts_HeaderContext__WEBPACK_IMPORTED_MODULE_1__.useHeader,\n        react_redux__WEBPACK_IMPORTED_MODULE_8__.useDispatch,\n        next_navigation__WEBPACK_IMPORTED_MODULE_4__.useRouter,\n        posthog_js_react__WEBPACK_IMPORTED_MODULE_6__.usePostHog,\n        next_navigation__WEBPACK_IMPORTED_MODULE_4__.usePathname,\n        next_navigation__WEBPACK_IMPORTED_MODULE_4__.useSearchParams\n    ];\n});\n_c = MyProjects;\n/* harmony default export */ __webpack_exports__[\"default\"] = (MyProjects);\nvar _c;\n$RefreshReg$(_c, \"MyProjects\");\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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LEVBQUMiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9fTl9FLy4vYXBwLyhtYWluKS9wYWdlLnRzeD9hMjc1Il0sInNvdXJjZXNDb250ZW50IjpbIlwidXNlIGNsaWVudFwiO1xuaW1wb3J0IHsgdXNlSGVhZGVyIH0gZnJvbSBcIkAvY29udGV4dHMvSGVhZGVyQ29udGV4dFwiO1xuaW1wb3J0IFJlYWN0LCB7IHVzZUVmZmVjdCwgdXNlTGF5b3V0RWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBDYXJkLCBDYXJkQ29udGVudCwgQ2FyZEZvb3RlciB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvY2FyZFwiO1xuaW1wb3J0IHsgU2tlbGV0b24gfSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL3NrZWxldG9uXCI7XG5pbXBvcnQgeyB1c2VSb3V0ZXIgfSBmcm9tIFwibmV4dC9uYXZpZ2F0aW9uXCI7XG5pbXBvcnQgeyB1c2VRdWVyeSB9IGZyb20gXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIjtcbmltcG9ydCBheGlvcyBmcm9tIFwiQC9hcHAvYXBpL2ludGVyY2VwdG9ycy9odHRwSW50ZXJjZXB0b3JcIjtcbmltcG9ydCBkYXlqcyBmcm9tIFwiZGF5anNcIjtcbmltcG9ydCBQcm9maWxlUGljdHVyZSBmcm9tIFwiQC9jb21wb25lbnRzL0xheW91dHMvbWlub3JzL1Byb2ZpbGVQaWN0dXJlXCI7XG5pbXBvcnQgeyB1c2VQYXRobmFtZSwgdXNlU2VhcmNoUGFyYW1zIH0gZnJvbSBcIm5leHQvbmF2aWdhdGlvblwiO1xuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9idXR0b25cIjtcbmltcG9ydCB7IFBsdXMsIFJvdGF0ZUN3LCBUcmlhbmdsZUFsZXJ0IH0gZnJvbSBcImx1Y2lkZS1yZWFjdFwiO1xuaW1wb3J0IHtcbiAgRGlhbG9nLFxuICBEaWFsb2dDb250ZW50LFxuICBEaWFsb2dEZXNjcmlwdGlvbixcbiAgRGlhbG9nRm9vdGVyLFxuICBEaWFsb2dIZWFkZXIsXG4gIERpYWxvZ1RpdGxlLFxuICBEaWFsb2dUcmlnZ2VyLFxufSBmcm9tIFwiQC9jb21wb25lbnRzL3VpL2RpYWxvZ1wiO1xuaW1wb3J0IHsgdXNlQXV0aENvbnRleHQgfSBmcm9tIFwiQC9jb250ZXh0cy9BdXRoQ29udGV4dFwiO1xuaW1wb3J0IHsgdXNlUG9zdEhvZyB9IGZyb20gXCJwb3N0aG9nLWpzL3JlYWN0XCI7XG5pbXBvcnQgeyB0b2FzdCB9IGZyb20gXCJzb25uZXJcIjtcbmltcG9ydCB7IHVzZURpc3BhdGNoIH0gZnJvbSBcInJlYWN0LXJlZHV4XCI7XG5pbXBvcnQgeyBzZXRicmFuY2ggfSBmcm9tIFwiQC9saWIvc3RhdGUvYnJhbmNoL2JyYW5jaFwiO1xuXG5jb25zdCBNeVByb2plY3RzID0gKCkgPT4ge1xuICBjb25zdCB7IHVzZXIgfSA9IHVzZUF1dGhDb250ZXh0KCk7XG4gIGNvbnN0IHsgc2V0SGVhZGVyVGl0bGUgfSA9IHVzZUhlYWRlcigpO1xuICBjb25zdCBbZW5kcG9pbnRMaXN0cywgc2V0ZW5kcG9pbnRMaXN0c10gPSB1c2VTdGF0ZTxhbnk+KCk7XG4gIGNvbnN0IGRpc3BhdGNoID0gdXNlRGlzcGF0Y2goKTtcbiAgY29uc3QgeyBwdXNoIH0gPSB1c2VSb3V0ZXIoKTtcbiAgY29uc3QgZ2l0aHViQXBwVXJsID1cbiAgICBcImh0dHBzOi8vZ2l0aHViLmNvbS9hcHBzL1wiICtcbiAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19HSVRIVUJfQVBQX05BTUUgK1xuICAgIFwiL2luc3RhbGxhdGlvbnMvc2VsZWN0X3RhcmdldD9zZXR1cF9hY3Rpb249aW5zdGFsbFwiO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGRpc3BhdGNoKHNldGJyYW5jaChcIlwiKSk7XG4gICAgc2V0SGVhZGVyVGl0bGUoXCJNeSBQcm9qZWN0c1wiKTtcbiAgfSk7XG4gIGludGVyZmFjZSBFbmRwb2ludCB7XG4gICAgaWRlbnRpZmllcjogc3RyaW5nO1xuICAgIGVudHJ5UG9pbnQ6IHN0cmluZztcbiAgfVxuICBcbiAgY29uc3QgcG9zdGhvZyA9IHVzZVBvc3RIb2coKTtcbiAgY29uc3QgcGF0aG5hbWUgPSB1c2VQYXRobmFtZSgpO1xuICBjb25zdCBzZWFyY2hQYXJhbXMgPSB1c2VTZWFyY2hQYXJhbXMoKTtcblxuICBjb25zdCBwb3B1cFJlZiA9IHVzZVJlZjxXaW5kb3cgfCBudWxsPihudWxsKTtcbiAgY29uc3Qgb3BlblBvcHVwID0gKCkgPT4ge1xuICAgIHBvc3Rob2cuY2FwdHVyZShcImdpdGh1YiBsb2dpbiBjbGlja2VkXCIpO1xuICAgIHBvcHVwUmVmLmN1cnJlbnQgPSB3aW5kb3cub3BlbihcbiAgICAgIGdpdGh1YkFwcFVybCxcbiAgICAgIFwiX2JsYW5rXCIsXG4gICAgICBcIndpZHRoPTEwMDAsaGVpZ2h0PTcwMFwiXG4gICAgKTtcbiAgfTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICh1c2VyKSB7XG4gICAgICAvLyBJZGVudGlmeSB0aGUgdXNlciBpbiBQb3N0SG9nXG4gICAgICBwb3N0aG9nLmlkZW50aWZ5KHVzZXIuZW1haWwsIHtcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXG4gICAgICAgIG5hbWU6IHVzZXIuZGlzcGxheU5hbWUsXG4gICAgICAgIC8vIFRPRE86IEFkZGl0aW9uYWwgdXNlciBwcm9wZXJ0aWVzIGNhbiBiZSBzZXQgaGVyZVxuICAgICAgfSk7XG4gICAgfVxuICB9LCBbdXNlcl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHBhdGhuYW1lICYmIHBvc3Rob2cpIHtcbiAgICAgIGxldCB1cmwgPSB3aW5kb3cub3JpZ2luICsgcGF0aG5hbWU7XG4gICAgICBpZiAoc2VhcmNoUGFyYW1zLnRvU3RyaW5nKCkpIHtcbiAgICAgICAgdXJsID0gdXJsICsgYD8ke3NlYXJjaFBhcmFtcy50b1N0cmluZygpfWA7XG4gICAgICB9XG4gICAgICBwb3N0aG9nLmNhcHR1cmUoXCIkcGFnZXZpZXdcIiwge1xuICAgICAgICAkY3VycmVudF91cmw6IHVybCxcbiAgICAgICAgJGN1cnJlbnRfdXNlcjogdXNlcixcbiAgICAgIH0pO1xuICAgIH1cbiAgfSwgW3BhdGhuYW1lLCBzZWFyY2hQYXJhbXMsIHBvc3Rob2ddKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIC8qXG4gICAgVGhpcyBtZXRob2QgbGlzdGVucyBmb3IgbWVzc2FnZXMgZnJvbSB0aGUgb3BlbmVkIHdpbmRvdyxcbiAgICBjdXJyZW50bHkgdGhpcyBpcyBub3QgZG9pbmcgYW55dGhpbmcgYnV0IGltcGxlbWVudCBwYXNzaW5nIG9mIGluc3RhbGxfaWQgaGVyZVxuICAgIGFuZCByZWxvYWQgcmVwb3NpdG9yaWVzIG9uIGhvbWUgcGFnZVxuICAgICovXG4gICAgLy8gc2Vzc2lvblN0b3JhZ2UucmVtb3ZlSXRlbShcInByb2plY3RfaW5mb1wiKTtcbiAgICBjb25zdCBoYW5kbGVNZXNzYWdlID0gKGV2ZW50OiBNZXNzYWdlRXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudC5vcmlnaW4gIT09IHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH07XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIGhhbmRsZU1lc3NhZ2UpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgaGFuZGxlTWVzc2FnZSk7XG4gICAgfTtcbiAgfSwgW10pO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIG10LTQgc3BhY2UteS0xMCBweC03XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1sLTJcIj5cbiAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeSBmb250LWJvbGQgdGV4dC0yeGxcIj5cbiAgICAgICAgICBIZXkge3VzZXIuZGlzcGxheU5hbWV9IVxuICAgICAgICA8L2gxPlxuICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5IHRleHQteGwgbXQtMlwiPlxuICAgICAgICAgIFRoaXMgaXMgc2FtcGxlIGxhbmRpbmcgcGFnZSBmb3IgaHVuZHJlZG1hcmtzLmFpXG4gICAgICAgIDwvaDI+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy1mdWxsIC1tbC00IGgtZnVsbCBmbGV4IGZsZXgtd3JhcCBnYXAtMTBcIj5cbiAgICAgICAgPENhcmRcbiAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBvcGVuUG9wdXAoKX1cbiAgICAgICAgICBjbGFzc05hbWU9e2BzY2FsZS05MCBoLVsxNHJlbV0gYmctY2FyZCBjdXJzb3ItcG9pbnRlciB3LVsyM3JlbV0gYm9yZGVyLTIgZ3JpZCBwbGFjZS1pdGVtcy1jZW50ZXIgcm91bmRlZC1iLXNtIHJvdW5kZWQtc20gYm9yZGVyLWlucHV0YH1cbiAgICAgICAgPlxuICAgICAgICAgIDxDYXJkQ29udGVudCBjbGFzc05hbWU9XCJ3LWZ1bGwgaC1mdWxsIG0tMCBncmlkIHBsYWNlLWl0ZW1zLWNlbnRlciBiZy1jYXJkXCI+XG4gICAgICAgICAgICA8UGx1cyBjbGFzc05hbWU9XCJ3LTI0IGgtMjQgdGV4dC1pbnB1dFwiIC8+XG4gICAgICAgICAgPC9DYXJkQ29udGVudD5cbiAgICAgICAgPC9DYXJkPlxuXG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IE15UHJvamVjdHM7XG4iXSwibmFtZXMiOlsidXNlSGVhZGVyIiwiUmVhY3QiLCJ1c2VFZmZlY3QiLCJ1c2VSZWYiLCJ1c2VTdGF0ZSIsIkNhcmQiLCJDYXJkQ29udGVudCIsInVzZVJvdXRlciIsInVzZVBhdGhuYW1lIiwidXNlU2VhcmNoUGFyYW1zIiwiUGx1cyIsInVzZUF1dGhDb250ZXh0IiwidXNlUG9zdEhvZyIsInVzZURpc3BhdGNoIiwic2V0YnJhbmNoIiwiTXlQcm9qZWN0cyIsInVzZXIiLCJzZXRIZWFkZXJUaXRsZSIsImVuZHBvaW50TGlzdHMiLCJzZXRlbmRwb2ludExpc3RzIiwiZGlzcGF0Y2giLCJwdXNoIiwiZ2l0aHViQXBwVXJsIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUFVCTElDX0dJVEhVQl9BUFBfTkFNRSIsInBvc3Rob2ciLCJwYXRobmFtZSIsInNlYXJjaFBhcmFtcyIsInBvcHVwUmVmIiwib3BlblBvcHVwIiwiY2FwdHVyZSIsImN1cnJlbnQiLCJ3aW5kb3ciLCJvcGVuIiwiaWRlbnRpZnkiLCJlbWFpbCIsIm5hbWUiLCJkaXNwbGF5TmFtZSIsInVybCIsIm9yaWdpbiIsInRvU3RyaW5nIiwiJGN1cnJlbnRfdXJsIiwiJGN1cnJlbnRfdXNlciIsImhhbmRsZU1lc3NhZ2UiLCJldmVudCIsImxvY2F0aW9uIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJkaXYiLCJjbGFzc05hbWUiLCJoMSIsImgyIiwib25DbGljayJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./app/(main)/page.tsx\n"));

/***/ })

});