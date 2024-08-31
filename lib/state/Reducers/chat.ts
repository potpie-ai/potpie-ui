import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface chatState {
  repoName?: string;
  branchName?: string;
  chatStep?: number;
  agentId?: string;
}

const initialState: chatState = {
  repoName: "",
  branchName: "",
  chatStep: 1,
  agentId: "",
};

const repoSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {

    setChat: (state, action: PayloadAction<Partial<chatState>>) => {
        Object.assign(state, action.payload);
      },
  },
});

export default repoSlice.reducer;

export const { setChat } = repoSlice.actions;
