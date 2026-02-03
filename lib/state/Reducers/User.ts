import { createSlice } from "@reduxjs/toolkit";

const initialState: {
    planType: string;
    total_human_messages: number;
} = {
    planType: "",
    total_human_messages: 0,
};

const UserSlice = createSlice({
  name: "UserInfo",
  initialState,
  reducers: {
    setUserPlanType: (state, action) => {
      if (action.payload) {
        state.planType = action.payload;
      }
    },
    setTotalHumanMessages: (state, action) => {
      if (action.payload) {
        console.log(action.payload);
        state.total_human_messages = action.payload;
      }
    },
    increaseTotalHumanMessages: (state, action) => {
      if (action.payload) {
        state.total_human_messages += action.payload;
      }
    },
  },
});

export default UserSlice.reducer;
export const { setUserPlanType, setTotalHumanMessages, increaseTotalHumanMessages } = UserSlice.actions;
