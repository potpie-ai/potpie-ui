import { createSlice } from "@reduxjs/toolkit";

interface branchState {
  value: any;
}

const initialState: branchState = {
  value: null,
};

const branchSlice = createSlice({
  name: "branch",
  initialState,
  reducers: {
    setbranch: (state, action) => {
      state.value = action.payload;
    },
  },
});

export default branchSlice.reducer;

export const { setbranch } = branchSlice.actions;