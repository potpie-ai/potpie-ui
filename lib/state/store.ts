import { configureStore, combineReducers } from "@reduxjs/toolkit";
import flowSliceReducer from "./flow/flowSlice";
import branchSliceReducer from "./branch/branch";
import storage from "redux-persist/lib/storage";
import { persistReducer, persistStore } from "redux-persist";

const rootReducers = combineReducers({
  flow: flowSliceReducer,
  branch: branchSliceReducer,
});

const persistConfig = {
  key: "root",
  storage,
  version: 1,
};
const persistedReducer = persistReducer(persistConfig, rootReducers);

export const store = configureStore({
  reducer: persistedReducer,          
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
