import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  AiProvider: "",
};

const KeyManagment = createSlice({
  name: "repoAndBranch",
  initialState,
  reducers: {
    setAiProvider: (state, action) => {
      state.AiProvider = action.payload;
    },
  },
});

export default KeyManagment.reducer;
export const { setAiProvider } = KeyManagment.actions;
