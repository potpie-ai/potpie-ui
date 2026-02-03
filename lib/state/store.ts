import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import chatReducer from "./Reducers/chat";
import userReducer from "./Reducers/User";
import RepoAndBranchReducer from "./Reducers/RepoAndBranch";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

const rootReducers = combineReducers({
  chat: chatReducer,
  RepoAndBranch: RepoAndBranchReducer,
  UserInfo: userReducer,
});

const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: string) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};
const storage =
  typeof window === "undefined"
    ? createNoopStorage()
    : createWebStorage("local");

const persistConfig = {
  key: "root",
  storage,
  version: 1,
  blacklist: ["chat", "branch"],
};
const persistedReducer = persistReducer(persistConfig, rootReducers);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
