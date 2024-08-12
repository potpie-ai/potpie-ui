import { createSlice } from "@reduxjs/toolkit";

interface flowState {
  value: string;
}

const initialState: flowState = {
  value: "",
};

const flowSlice = createSlice({
  name: "flow",
  initialState,
  reducers: {
    setFlow: (state, action) => {
      state.value = action.payload;
    },
  },
});

export default flowSlice.reducer;

export const { setFlow } = flowSlice.actions;